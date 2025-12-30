import base64
from datetime import date, datetime, timedelta
from typing import Optional, Union

import asyncpg
import httpx
from pydantic import BaseModel
from sftkit.database import Connection, Pool
from sftkit.error import AccessDenied, InvalidArgument
from sftkit.service import Service, with_db_connection, with_db_transaction

from abrechnung.application.common import _get_or_create_tag_ids
from abrechnung.config import Config
from abrechnung.core.auth import create_group_log
from abrechnung.core.decorators import (
    requires_group_permissions,
    with_group_last_changed_update,
)
from abrechnung.domain.transactions import (
    CurrencyConversionRate,
    NewFile,
    NewTransaction,
    NewTransactionPosition,
    Transaction,
    TransactionHistory,
    TransactionPosition,
    TransactionType,
    UpdateFile,
    UpdateTransaction,
)
from abrechnung.domain.users import User
from abrechnung.util import timed_cache


class FrankfurterApiResp(BaseModel):
    base: str
    date: date
    rates: dict[str, float]


class CurrencyConversionApi:
    def __init__(self):
        self._cache: dict[str, tuple[date, CurrencyConversionRate]] = {}

    async def get_currency_conversion_rate(self, base_currency: str) -> CurrencyConversionRate:
        base_date = date.today()
        cached = self._cache.get(base_currency)
        if cached is not None and cached[0] == base_date:
            return cached[1]

        currency_api_base_url = "https://api.frankfurter.dev/v1"
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{currency_api_base_url}/{base_date.isoformat()}", params={"base": base_currency})
            body = resp.json()
            parsed = FrankfurterApiResp.model_validate(body)
            resulting_conversion_rate = CurrencyConversionRate(base_currency=parsed.base, rates=parsed.rates)

        self._cache[base_currency] = (base_date, resulting_conversion_rate)
        return resulting_conversion_rate


class TransactionService(Service[Config]):
    def __init__(self, db_pool: Pool, config: Config, transaction_retries: int | None = None):
        super().__init__(db_pool, config, transaction_retries)

        self.currency_api = CurrencyConversionApi()

    @staticmethod
    async def _check_transaction_permissions(
        conn: asyncpg.Connection,
        user: User,
        transaction_id: int,
        can_write: bool = False,
        transaction_type: Union[TransactionType, list[TransactionType]] | None = None,
    ) -> int:
        """returns group id of the transaction"""
        result = await conn.fetchrow(
            "select t.type, t.group_id, can_write, is_owner "
            "from group_membership gm join transaction t on gm.group_id = t.group_id and gm.user_id = $1 "
            "where t.id = $2",
            user.id,
            transaction_id,
        )
        if not result:
            raise InvalidArgument("user is not a member of this group")

        if can_write and not (result["can_write"] or result["is_owner"]):
            raise AccessDenied("user does not have write permissions")

        if transaction_type:
            type_check = [transaction_type] if isinstance(transaction_type, TransactionType) else transaction_type
            if result["type"] not in [t.value for t in type_check]:
                raise InvalidArgument(
                    f"Transaction type {result['type']} does not match the expected type {type_check}"
                )

        return result["group_id"]

    @with_db_transaction
    @requires_group_permissions()
    async def list_transactions(
        self,
        *,
        conn: Connection,
        user: User,
        group_id: int,
        min_last_changed: Optional[datetime] = None,
        additional_transactions: Optional[list[int]] = None,
    ) -> list[Transaction]:
        if min_last_changed:
            # if a minimum last changed value is specified we must also return all transactions the current
            # user has pending changes with to properly sync state across different devices of the user
            transactions = await conn.fetch_many(
                Transaction,
                "select * "
                "from full_transaction_state_valid_at(now()) "
                "where group_id = $1 "
                "   and (last_changed >= $2 or (($3::int[]) is not null and id = any($3::int[])))",
                group_id,
                min_last_changed,
                additional_transactions,
            )
        else:
            transactions = await conn.fetch_many(
                Transaction,
                "select * from full_transaction_state_valid_at(now()) where group_id = $1",
                group_id,
            )
        for transaction in transactions:
            for attachment in transaction.files:
                attachment.host_url = self.config.api.base_url + "/api"
        return transactions

    @with_db_transaction
    async def get_transaction_history(
        self, *, conn: Connection, user: User, transaction_id: int
    ) -> list[TransactionHistory]:
        group_id = await self._check_transaction_permissions(conn=conn, user=user, transaction_id=transaction_id)
        history = await conn.fetch_many(
            TransactionHistory,
            "select revision_id, created_at as changed_at, user_id as changed_by  "
            "from aggregated_transaction_history where group_id = $1 and transaction_id = $2 order by created_at asc",
            group_id,
            transaction_id,
        )
        return history

    @with_db_transaction
    async def get_transaction(self, *, conn: Connection, user: User, transaction_id: int) -> Transaction:
        group_id = await self._check_transaction_permissions(conn=conn, user=user, transaction_id=transaction_id)
        transaction = await conn.fetch_one(
            Transaction,
            "select * from full_transaction_state_valid_at(now()) where group_id = $1 and id = $2",
            group_id,
            transaction_id,
        )
        for attachment in transaction.files:
            attachment.host_url = self.config.api.base_url + "/api"
        return transaction

    @staticmethod
    async def _add_tags_to_revision(
        *,
        conn: asyncpg.Connection,
        transaction_id: int,
        revision_id: int,
        tag_ids: list[int],
    ):
        if len(tag_ids) <= 0:
            return
        for tag_id in tag_ids:
            await conn.execute(
                "insert into transaction_to_tag (transaction_id, revision_id, tag_id) values ($1, $2, $3)",
                transaction_id,
                revision_id,
                tag_id,
            )

    async def _add_file_to_revision(
        self,
        *,
        conn: Connection,
        revision_id: int,
        transaction_id: int,
        attachment: NewFile,
    ) -> int:
        content = base64.b64decode(attachment.content)
        max_file_size = self.config.api.max_uploadable_file_size
        if len(content) / 1024 > max_file_size:
            raise InvalidArgument(f"File is too large, maximum is {max_file_size}KB")

        if "." in attachment.filename:
            raise InvalidArgument("Dots '.' are not allowed in file names")

        blob_id = await conn.fetchval(
            "insert into blob (content, mime_type) values ($1, $2) returning id",
            content,
            attachment.mime_type,
        )
        file_id = await conn.fetchval(
            "insert into file (transaction_id) values ($1) returning id",
            transaction_id,
        )
        await conn.execute(
            "insert into file_history (id, revision_id, filename, blob_id) values ($1, $2, $3, $4)",
            file_id,
            revision_id,
            attachment.filename,
            blob_id,
        )
        return file_id

    @staticmethod
    async def _update_file_in_revision(
        *,
        conn: Connection,
        revision_id: int,
        transaction_id: int,
        attachment: UpdateFile,
    ) -> int:
        if "." in attachment.filename:
            raise InvalidArgument("Dots '.' are not allowed in file names")

        blob_id = await conn.fetchval(
            "select blob_id from file_state_valid_at(now()) where id = $1 and transaction_id = $2",
            attachment.id,
            transaction_id,
        )
        if blob_id is None:
            raise InvalidArgument("Transaction attachment does not exist")

        await conn.execute(
            "insert into file_history (id, revision_id, filename, blob_id, deleted) values ($1, $2, $3, $4, $5)",
            attachment.id,
            revision_id,
            attachment.filename,
            blob_id,
            attachment.deleted,
        )
        return attachment.id

    async def _create_transaction(
        self,
        *,
        conn: Connection,
        user: User,
        group_id: int,
        transaction: NewTransaction,
    ) -> int:
        transaction_id = await conn.fetchval(
            "insert into transaction (group_id, type) values ($1, $2) returning id",
            group_id,
            transaction.type.value,
        )
        revision_id = await conn.fetchval(
            "insert into transaction_revision (user_id, transaction_id) values ($1, $2) returning id",
            user.id,
            transaction_id,
        )
        await conn.execute(
            "insert into transaction_history "
            "   (id, revision_id, currency_identifier, currency_conversion_rate, value, name, description, billed_at) "
            "values ($1, $2, $3, $4, $5, $6, $7, $8)",
            transaction_id,
            revision_id,
            transaction.currency_identifier,
            transaction.currency_conversion_rate,
            transaction.value,
            transaction.name,
            transaction.description,
            transaction.billed_at,
        )

        tag_ids = await _get_or_create_tag_ids(conn=conn, group_id=group_id, tags=transaction.tags)
        await self._add_tags_to_revision(
            conn=conn,
            transaction_id=transaction_id,
            revision_id=revision_id,
            tag_ids=tag_ids,
        )

        await self._put_transaction_debitor_shares(
            conn=conn,
            transaction_id=transaction_id,
            group_id=group_id,
            revision_id=revision_id,
            debitor_shares=transaction.debitor_shares,
        )

        await self._put_transaction_creditor_shares(
            conn=conn,
            transaction_id=transaction_id,
            group_id=group_id,
            revision_id=revision_id,
            creditor_shares=transaction.creditor_shares,
        )

        if transaction.new_positions:
            for position in transaction.new_positions:
                await self._create_transaction_position(
                    conn=conn,
                    group_id=group_id,
                    transaction_id=transaction_id,
                    revision_id=revision_id,
                    position=position,
                )

        for attachment in transaction.new_files:
            await self._add_file_to_revision(
                conn=conn,
                revision_id=revision_id,
                transaction_id=transaction_id,
                attachment=attachment,
            )
        await self._commit_revision(conn=conn, revision_id=revision_id)

        return transaction_id

    @with_db_transaction
    @requires_group_permissions(requires_write=True)
    @with_group_last_changed_update
    async def create_transaction(
        self,
        *,
        conn: Connection,
        user: User,
        group_id: int,
        transaction: NewTransaction,
    ) -> int:
        return await self._create_transaction(conn=conn, user=user, group_id=group_id, transaction=transaction)

    @staticmethod
    async def _put_transaction_debitor_shares(
        conn: asyncpg.Connection,
        group_id: int,
        transaction_id: int,
        revision_id: int,
        debitor_shares: dict[int, float],
    ):
        n_accounts = await conn.fetchval(
            "select count(*) from account_state_valid_at() "
            "where group_id = $1 and account_id = any($2::int[]) and not deleted",
            group_id,
            list(debitor_shares.keys()),
        )
        if len(debitor_shares.keys()) != n_accounts:
            raise InvalidArgument("one of the accounts referenced by a debitor share does not exist in this group")
        for account_id, value in debitor_shares.items():
            await conn.execute(
                "insert into debitor_share(transaction_id, revision_id, account_id, shares) values ($1, $2, $3, $4)",
                transaction_id,
                revision_id,
                account_id,
                value,
            )

    @staticmethod
    async def _put_transaction_creditor_shares(
        conn: asyncpg.Connection,
        group_id: int,
        transaction_id: int,
        revision_id: int,
        creditor_shares: dict[int, float],
    ):
        n_accounts = await conn.fetchval(
            "select count(*) from account_state_valid_at() "
            "where group_id = $1 and account_id = any($2::int[]) and not deleted",
            group_id,
            list(creditor_shares.keys()),
        )
        if len(creditor_shares.keys()) != n_accounts:
            raise InvalidArgument("one of the accounts referenced by a creditor share does not exist in this group")
        for account_id, value in creditor_shares.items():
            await conn.execute(
                "insert into creditor_share(transaction_id, revision_id, account_id, shares) values ($1, $2, $3, $4)",
                transaction_id,
                revision_id,
                account_id,
                value,
            )

    @with_db_transaction
    async def read_file_contents(
        self, *, conn: Connection, user: User, file_id: int, blob_id: int
    ) -> tuple[str, bytes]:
        perms = await conn.fetchrow(
            "select f.id "
            "from group_membership gm "
            "   join transaction t on gm.group_id = t.group_id and gm.user_id = $1 "
            "   join file f on t.id = f.transaction_id and f.id = $2"
            "   join file_history fh on f.id = fh.id "
            "where fh.blob_id = $3",
            user.id,
            file_id,
            blob_id,
        )
        if not perms:
            raise InvalidArgument("File not found")

        blob = await conn.fetchrow("select content, mime_type from blob where id = $1", blob_id)
        if not blob:
            raise InvalidArgument("File not found")

        return blob["mime_type"], blob["content"]

    @staticmethod
    async def _put_position_usages(
        conn: asyncpg.Connection,
        group_id: int,
        item_id: int,
        revision_id: int,
        usages: dict[int, float],
    ):
        n_accounts = await conn.fetchval(
            "select count(*) from account_state_valid_at() "
            "where group_id = $1 and account_id = any($2::int[]) and not deleted",
            group_id,
            list(usages.keys()),
        )
        if len(usages.keys()) != n_accounts:
            raise InvalidArgument("one of the accounts referenced by a position usage does not exist in this group")
        for account_id, value in usages.items():
            await conn.execute(
                "insert into purchase_item_usage(item_id, revision_id, account_id, share_amount) "
                "values ($1, $2, $3, $4)",
                item_id,
                revision_id,
                account_id,
                value,
            )

    async def _put_transaction_position(
        self,
        conn: asyncpg.Connection,
        group_id: int,
        item_id: int,
        revision_id: int,
        position: TransactionPosition,
    ):
        await conn.execute(
            "insert into purchase_item_history(id, revision_id, name, price, communist_shares, deleted) "
            "values ($1, $2, $3, $4, $5, $6) on conflict (id, revision_id) do update "
            "set name = $3, price = $4, communist_shares = $5, deleted = $6",
            item_id,
            revision_id,
            position.name,
            position.price,
            position.communist_shares,
            position.deleted,
        )
        if position.usages:
            await self._put_position_usages(
                conn=conn,
                group_id=group_id,
                item_id=item_id,
                revision_id=revision_id,
                usages=position.usages,
            )

    async def _create_transaction_position(
        self,
        conn: asyncpg.Connection,
        group_id: int,
        transaction_id: int,
        revision_id: int,
        position: NewTransactionPosition,
    ) -> int:
        item_id = await conn.fetchval(
            "insert into purchase_item (transaction_id) values ($1) returning id",
            transaction_id,
        )
        await conn.execute(
            "insert into purchase_item_history(id, revision_id, name, price, communist_shares) "
            "values ($1, $2, $3, $4, $5)",
            item_id,
            revision_id,
            position.name,
            position.price,
            position.communist_shares,
        )
        if position.usages:
            await self._put_position_usages(
                conn=conn,
                group_id=group_id,
                item_id=item_id,
                revision_id=revision_id,
                usages=position.usages,
            )

        return item_id

    async def _process_position_update(
        self,
        *,
        conn: asyncpg.Connection,
        transaction_id: int,
        group_id: int,
        revision_id: int,
        position: NewTransactionPosition | TransactionPosition,
    ):
        if isinstance(position, TransactionPosition):
            await self._put_transaction_position(
                conn=conn,
                group_id=group_id,
                item_id=position.id,
                revision_id=revision_id,
                position=position,
            )
        else:
            await self._create_transaction_position(
                conn=conn,
                group_id=group_id,
                transaction_id=transaction_id,
                revision_id=revision_id,
                position=position,
            )

    async def _update_transaction(
        self,
        *,
        conn: Connection,
        user: User,
        transaction_id: int,
        transaction: UpdateTransaction,
    ):
        group_id = await self._check_transaction_permissions(
            conn=conn,
            user=user,
            transaction_id=transaction_id,
            can_write=True,
            transaction_type=transaction.type,
        )
        revision_id = await self._create_revision(conn=conn, user=user, transaction_id=transaction_id)
        await conn.execute(
            "insert into transaction_history (id, revision_id, currency_identifier, currency_conversion_rate, "
            "   value, billed_at, name, description)"
            "values ($1, $2, $3, $4, $5, $6, $7, $8) "
            "on conflict (id, revision_id) do update "
            "set currency_identifier = $3, currency_conversion_rate = $4, value = $5, "
            "   billed_at = $6, name = $7, description = $8",
            transaction_id,
            revision_id,
            transaction.currency_identifier,
            transaction.currency_conversion_rate,
            transaction.value,
            transaction.billed_at,
            transaction.name,
            transaction.description,
        )

        tag_ids = await _get_or_create_tag_ids(conn=conn, group_id=group_id, tags=transaction.tags)
        await self._add_tags_to_revision(
            conn=conn,
            transaction_id=transaction_id,
            revision_id=revision_id,
            tag_ids=tag_ids,
        )

        await conn.execute(
            "delete from debitor_share where transaction_id = $1 and revision_id = $2",
            transaction_id,
            revision_id,
        )
        await self._put_transaction_debitor_shares(
            conn=conn,
            group_id=group_id,
            transaction_id=transaction_id,
            revision_id=revision_id,
            debitor_shares=transaction.debitor_shares,
        )

        await conn.execute(
            "delete from creditor_share where transaction_id = $1 and revision_id = $2",
            transaction_id,
            revision_id,
        )
        await self._put_transaction_creditor_shares(
            conn=conn,
            group_id=group_id,
            transaction_id=transaction_id,
            revision_id=revision_id,
            creditor_shares=transaction.creditor_shares,
        )

        if transaction.new_positions:
            for position in transaction.new_positions:
                await self._create_transaction_position(
                    conn=conn,
                    group_id=group_id,
                    transaction_id=transaction_id,
                    revision_id=revision_id,
                    position=position,
                )

        if transaction.changed_positions:
            for position in transaction.changed_positions:
                await self._put_transaction_position(
                    conn=conn,
                    group_id=group_id,
                    item_id=position.id,
                    revision_id=revision_id,
                    position=position,
                )

        for new_attachment in transaction.new_files:
            await self._add_file_to_revision(
                conn=conn,
                revision_id=revision_id,
                transaction_id=transaction_id,
                attachment=new_attachment,
            )

        for updated_attachment in transaction.changed_files:
            await self._update_file_in_revision(
                conn=conn,
                revision_id=revision_id,
                transaction_id=transaction_id,
                attachment=updated_attachment,
            )
        await self._commit_revision(conn=conn, revision_id=revision_id)

    @with_db_transaction
    @requires_group_permissions(requires_write=True)
    @with_group_last_changed_update
    async def update_transaction(
        self,
        *,
        conn: Connection,
        user: User,
        transaction_id: int,
        transaction: UpdateTransaction,
    ):
        await self._update_transaction(
            conn=conn,
            user=user,
            transaction_id=transaction_id,
            transaction=transaction,
        )

    @with_db_transaction
    @requires_group_permissions(requires_write=True)
    @with_group_last_changed_update
    async def update_transaction_positions(
        self,
        *,
        conn: Connection,
        user: User,
        transaction_id: int,
        positions: list[TransactionPosition],
    ):
        group_id = await self._check_transaction_permissions(
            conn=conn,
            user=user,
            transaction_id=transaction_id,
            can_write=True,
            transaction_type=TransactionType.purchase,
        )
        revision_id = await self._create_revision(conn=conn, user=user, transaction_id=transaction_id)

        for position in positions:
            await self._process_position_update(
                conn=conn,
                transaction_id=transaction_id,
                group_id=group_id,
                revision_id=revision_id,
                position=position,
            )
        await self._commit_revision(conn=conn, revision_id=revision_id)

    @with_db_transaction
    @requires_group_permissions(requires_write=True)
    @with_group_last_changed_update
    async def delete_transaction(self, *, conn: Connection, user: User, transaction_id: int):
        group_id = await self._check_transaction_permissions(
            conn=conn,
            user=user,
            transaction_id=transaction_id,
            can_write=True,
        )

        row = await conn.fetchrow(
            "select name, description, revision_id, deleted "
            "from transaction_state_valid_at() "
            "where transaction_id = $1",
            transaction_id,
        )
        if row is None:
            raise InvalidArgument(f"Transaction id {transaction_id} not found")
        if row is not None and row["deleted"]:
            raise InvalidArgument(f"Cannot delete transaction {transaction_id} as it already is deleted")

        await create_group_log(
            conn=conn,
            group_id=group_id,
            user=user,
            type="transaction-deleted",
            message=f"deleted transaction with id {transaction_id}",
        )

        revision_id = await self._create_pending_transaction_change(conn=conn, user=user, transaction_id=transaction_id)

        await conn.execute(
            "update transaction_history th set deleted = true where th.id = $1 and th.revision_id = $2",
            transaction_id,
            revision_id,
        )
        await self._commit_revision(conn=conn, revision_id=revision_id)

    @staticmethod
    async def _commit_revision(conn: asyncpg.Connection, revision_id: int):
        """Touches a revision to have all associated constraints run"""
        await conn.execute(
            "update transaction_revision set created_at = now() where id = $1",
            revision_id,
        )

    @staticmethod
    async def _create_revision(conn: asyncpg.Connection, user: User, transaction_id: int) -> int:
        # create a new transaction revision
        revision_id = await conn.fetchval(
            "insert into transaction_revision (user_id, transaction_id, created_at) values ($1, $2, null) returning id",
            user.id,
            transaction_id,
        )
        return revision_id

    async def _create_pending_transaction_change(
        self, conn: asyncpg.Connection, user: User, transaction_id: int
    ) -> int:
        revision_id = await self._create_revision(conn=conn, user=user, transaction_id=transaction_id)

        last_committed_revision = await conn.fetchval(
            "select tr.id "
            "from transaction_revision tr "
            "   join transaction_history th on tr.id = th.revision_id and tr.transaction_id = th.id "
            "where tr.transaction_id = $1 "
            "order by tr.created_at desc "
            "limit 1",
            transaction_id,
        )

        if last_committed_revision is None:
            raise InvalidArgument(f"Cannot edit transaction {transaction_id} as it has no committed changes.")

        # copy all existing transaction data into a new history entry
        await conn.execute(
            "insert into transaction_history (id, revision_id, currency_identifier, currency_conversion_rate, name, description, value, billed_at, deleted)"
            "select id, $1, currency_identifier, currency_conversion_rate, name, description, value, billed_at, deleted "
            "from transaction_history where id = $2 and revision_id = $3",
            revision_id,
            transaction_id,
            last_committed_revision,
        )

        # copy all last committed creditor shares
        await conn.execute(
            "insert into creditor_share (transaction_id, revision_id, account_id, shares) "
            "select transaction_id, $1, account_id, shares "
            "from creditor_share where transaction_id = $2 and revision_id = $3",
            revision_id,
            transaction_id,
            last_committed_revision,
        )

        # copy all last committed debitor shares
        await conn.execute(
            "insert into debitor_share (transaction_id, revision_id, account_id, shares) "
            "select transaction_id, $1, account_id, shares "
            "from debitor_share where transaction_id = $2 and revision_id = $3",
            revision_id,
            transaction_id,
            last_committed_revision,
        )

        return revision_id

    @with_db_connection
    @timed_cache(timedelta(minutes=5))
    async def total_number_of_transactions(self, conn: Connection):
        return await conn.fetchval("select count(*) from transaction_state_valid_at(now()) where not deleted")

    @with_db_connection
    @timed_cache(timedelta(minutes=5))
    async def total_amount_of_money_per_currency(self, conn: Connection) -> dict[str, float]:
        result = await conn.fetch(
            "select t.currency_identifier, sum(t.value) as total_value "
            "from transaction_state_valid_at(now()) as t where not t.deleted group by t.currency_identifier"
        )
        aggregated = {}
        for row in result:
            aggregated[row["currency_identifier"]] = row["total_value"]
        return aggregated
