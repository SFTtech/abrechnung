import json
from datetime import date, datetime
from typing import Optional, Union

import asyncpg

from abrechnung.application import (
    Application,
    NotFoundError,
    check_group_permissions,
    InvalidCommand,
    create_group_log,
)
from abrechnung.domain.transactions import (
    Transaction,
    TransactionDetails,
    TransactionPosition,
    FileAttachment,
    TransactionType,
)
from abrechnung.domain.users import User
from abrechnung.util import parse_postgres_datetime


class TransactionService(Application):
    @staticmethod
    async def _check_transaction_permissions(
        conn: asyncpg.Connection,
        user: User,
        transaction_id: int,
        can_write: bool = False,
        transaction_type: Optional[Union[str, list[str]]] = None,
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
            raise NotFoundError(f"user is not a member of this group")

        if can_write and not (result["can_write"] or result["is_owner"]):
            raise PermissionError(f"user does not have write permissions")

        if transaction_type:
            type_check = (
                [transaction_type]
                if isinstance(transaction_type, str)
                else transaction_type
            )
            if result["type"] not in type_check:
                raise InvalidCommand(
                    f"Transaction type {result['type']} does not match the expected type {type_check}"
                )

        return result["group_id"]

    @staticmethod
    async def _increment_transaction_version(
        conn: asyncpg.Connection, revision_id: int
    ):
        await conn.execute(
            "update transaction_revision set version = version + 1 where id = $1",
            revision_id,
        )

    @staticmethod
    def _transaction_detail_from_db_json(db_json: dict) -> TransactionDetails:
        return TransactionDetails(
            description=db_json["description"],
            value=db_json["value"],
            currency_symbol=db_json["currency_symbol"],
            currency_conversion_rate=db_json["currency_conversion_rate"],
            deleted=db_json["deleted"],
            committed_at=None
            if db_json.get("revision_committed") is None
            else parse_postgres_datetime(db_json["revision_committed"]),
            billed_at=date.fromisoformat(db_json["billed_at"]),
            creditor_shares={
                cred["account_id"]: cred["shares"]
                for cred in db_json["creditor_shares"]
            },
            debitor_shares={
                deb["account_id"]: deb["shares"] for deb in db_json["debitor_shares"]
            },
            changed_by=db_json["changed_by"],
        )

    @staticmethod
    def _transaction_position_from_db_row_json(db_json: dict) -> TransactionPosition:
        return TransactionPosition(
            id=db_json["item_id"],
            name=db_json["name"],
            price=db_json["price"],
            communist_shares=db_json["communist_shares"],
            deleted=db_json["deleted"],
            usages={
                usage["account_id"]: usage["share_amount"]
                for usage in db_json["usages"]
            },
        )

    def _file_attachment_from_db_row_json(self, db_json: dict) -> FileAttachment:
        return FileAttachment(
            id=db_json["file_id"],
            filename=db_json["filename"],
            blob_id=db_json["blob_id"],
            deleted=db_json["deleted"],
            mime_type=db_json["mime_type"],
            host_url=self.cfg["service"]["api_url"],
        )

    def _transaction_db_row(self, transaction: asyncpg.Record) -> Transaction:
        committed_details = (
            self._transaction_detail_from_db_json(
                json.loads(transaction["committed_details"])[0]
            )
            if transaction["committed_details"]
            else None
        )
        pending_details = (
            self._transaction_detail_from_db_json(
                json.loads(transaction["pending_details"])[0]
            )
            if transaction["pending_details"]
            else None
        )
        committed_positions = (
            [
                self._transaction_position_from_db_row_json(position)
                for position in json.loads(transaction["committed_positions"])
            ]
            if transaction["committed_positions"]
            else None
        )

        pending_positions = (
            [
                self._transaction_position_from_db_row_json(position)
                for position in json.loads(transaction["pending_positions"])
            ]
            if transaction["pending_positions"]
            else None
        )

        committed_files = (
            [
                self._file_attachment_from_db_row_json(file)
                for file in json.loads(transaction["committed_files"])
            ]
            if transaction["committed_files"]
            else None
        )
        pending_files = (
            [
                self._file_attachment_from_db_row_json(file)
                for file in json.loads(transaction["pending_files"])
            ]
            if transaction["pending_files"]
            else None
        )

        return Transaction(
            id=transaction["transaction_id"],
            group_id=transaction["group_id"],
            type=transaction["type"],
            is_wip=transaction["is_wip"],
            last_changed=transaction["last_changed"],
            version=transaction["version"],
            committed_details=committed_details,
            pending_details=pending_details,
            committed_positions=committed_positions,
            pending_positions=pending_positions,
            committed_files=committed_files,
            pending_files=pending_files,
        )

    async def list_transactions(
        self,
        *,
        user: User,
        group_id: int,
        min_last_changed: Optional[datetime] = None,
        additional_transactions: Optional[list[int]] = None,
    ) -> list[Transaction]:
        async with self.db_pool.acquire() as conn:
            async with conn.transaction():
                await check_group_permissions(conn=conn, group_id=group_id, user=user)

                if min_last_changed:
                    # if a minimum last changed value is specified we must also return all transactions the current
                    # user has pending changes with to properly sync state across different devices of the user
                    cur = conn.cursor(
                        "select transaction_id, group_id, type, last_changed, version, is_wip, "
                        "   committed_details, pending_details, "
                        "   committed_positions, pending_positions, committed_files, pending_files "
                        "from full_transaction_state_valid_at($1) "
                        "where group_id = $2 "
                        "   and (is_wip or last_changed is not null and last_changed >= $3"
                        "       or (($4::int[]) is not null and transaction_id = any($4::int[])))",
                        user.id,
                        group_id,
                        min_last_changed,
                        additional_transactions,
                    )
                else:
                    cur = conn.cursor(
                        "select transaction_id, group_id, type, last_changed, version, is_wip, "
                        "   committed_details, pending_details, "
                        "   committed_positions, pending_positions, committed_files, pending_files "
                        "from full_transaction_state_valid_at($1) "
                        "where group_id = $2",
                        user.id,
                        group_id,
                    )

                result = []
                async for transaction in cur:
                    result.append(self._transaction_db_row(transaction))

                return result

    async def get_transaction(self, *, user: User, transaction_id: int) -> Transaction:
        async with self.db_pool.acquire() as conn:
            group_id = await self._check_transaction_permissions(
                conn=conn, user=user, transaction_id=transaction_id
            )
            transaction = await conn.fetchrow(
                "select transaction_id, group_id, type, last_changed, version, is_wip, "
                "   committed_details, pending_details, "
                "   committed_positions, pending_positions, committed_files, pending_files "
                "from full_transaction_state_valid_at($1) "
                "where group_id = $2 and transaction_id = $3",
                user.id,
                group_id,
                transaction_id,
            )
            return self._transaction_db_row(transaction)

    async def create_transaction(
        self,
        *,
        user: User,
        group_id: int,
        type: str,
        description: str,
        billed_at: date,
        currency_symbol: str,
        currency_conversion_rate: float,
        value: float,
        debitor_shares: Optional[dict[int, float]] = None,
        creditor_shares: Optional[dict[int, float]] = None,
        perform_commit: bool = False,
    ) -> int:
        async with self.db_pool.acquire() as conn:
            async with conn.transaction():
                await check_group_permissions(conn=conn, group_id=group_id, user=user)
                transaction_id = await conn.fetchval(
                    "insert into transaction (group_id, type) values ($1, $2) returning id",
                    group_id,
                    type,
                )
                revision_id = await conn.fetchval(
                    "insert into transaction_revision (user_id, transaction_id) "
                    "values ($1, $2) returning id",
                    user.id,
                    transaction_id,
                )
                await conn.execute(
                    "insert into transaction_history "
                    "   (id, revision_id, currency_symbol, currency_conversion_rate, value, description, billed_at) "
                    "values ($1, $2, $3, $4, $5, $6, $7)",
                    transaction_id,
                    revision_id,
                    currency_symbol,
                    currency_conversion_rate,
                    value,
                    description,
                    billed_at,
                )

                if debitor_shares:
                    await self._put_transaction_debitor_shares(
                        conn=conn,
                        transaction_id=transaction_id,
                        group_id=group_id,
                        revision_id=revision_id,
                        debitor_shares=debitor_shares,
                    )

                if creditor_shares:
                    await self._put_transaction_creditor_shares(
                        conn=conn,
                        transaction_id=transaction_id,
                        group_id=group_id,
                        revision_id=revision_id,
                        creditor_shares=creditor_shares,
                    )
                if perform_commit:
                    await conn.execute(
                        "update transaction_revision set committed = now() where id = $1",
                        revision_id,
                    )

                return transaction_id

    @staticmethod
    async def _put_transaction_debitor_shares(
        conn: asyncpg.Connection,
        group_id: int,
        transaction_id: int,
        revision_id: int,
        debitor_shares: dict[int, float],
    ):
        n_accounts = await conn.fetchval(
            "select count(*) from committed_account_state_valid_at() "
            "where group_id = $1 and account_id = any($2::int[]) and not deleted",
            group_id,
            list(debitor_shares.keys()),
        )
        if len(debitor_shares.keys()) != n_accounts:
            raise InvalidCommand(
                "one of the accounts referenced by a debitor share does not exist in this group"
            )
        for account_id, value in debitor_shares.items():
            await conn.execute(
                "insert into debitor_share(transaction_id, revision_id, account_id, shares) "
                "values ($1, $2, $3, $4)",
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
            "select count(*) from committed_account_state_valid_at() "
            "where group_id = $1 and account_id = any($2::int[]) and not deleted",
            group_id,
            list(creditor_shares.keys()),
        )
        if len(creditor_shares.keys()) != n_accounts:
            raise InvalidCommand(
                "one of the accounts referenced by a creditor share does not exist in this group"
            )
        for account_id, value in creditor_shares.items():
            await conn.execute(
                "insert into creditor_share(transaction_id, revision_id, account_id, shares) "
                "values ($1, $2, $3, $4)",
                transaction_id,
                revision_id,
                account_id,
                value,
            )

    async def commit_transaction(self, *, user: User, transaction_id: int) -> None:
        async with self.db_pool.acquire() as conn:
            async with conn.transaction():
                group_id = await self._check_transaction_permissions(
                    conn=conn, user=user, transaction_id=transaction_id
                )
                revision_id = await conn.fetchval(
                    "select id from transaction_revision "
                    "where transaction_id = $1 and user_id = $2 and committed is null",
                    transaction_id,
                    user.id,
                )
                if revision_id is None:
                    raise InvalidCommand(
                        f"Cannot commit a transaction without pending changes"
                    )

                await conn.execute(
                    "update transaction_revision "
                    "set committed = now(), version = version + 1 where id = $1",
                    revision_id,
                )
                await create_group_log(
                    conn=conn,
                    group_id=group_id,
                    user=user,
                    type="transaction-committed",
                    message=f"updated transaction with id {transaction_id}",
                )

    async def upload_file(
        self,
        *,
        user: User,
        transaction_id: int,
        filename: str,
        mime_type: str,
        content: bytes,
    ) -> int:
        # check mime type of content
        allowed_filetypes = ["image/jpeg", "image/png", "image/bmp", "image/webp"]

        if mime_type not in allowed_filetypes:
            raise InvalidCommand(f"File type {mime_type} is not an accepted file type")

        # TODO: image resizing?
        max_file_size = self.cfg["api"]["max_uploadable_file_size"]
        if len(content) / 1024 > max_file_size:
            raise InvalidCommand(f"File is too large, maximum is {max_file_size}KB")

        if "." in filename:
            raise InvalidCommand(f"Dots '.' are not allowed in file names")

        async with self.db_pool.acquire() as conn:
            async with conn.transaction():
                await self._check_transaction_permissions(
                    conn=conn,
                    user=user,
                    transaction_id=transaction_id,
                    can_write=True,
                )
                revision_id = await self._get_or_create_revision(
                    conn=conn, user=user, transaction_id=transaction_id
                )

                blob_id = await conn.fetchval(
                    "insert into blob (content, mime_type) values ($1, $2) returning id",
                    content,
                    mime_type,
                )
                file_id = await conn.fetchval(
                    "insert into file (transaction_id) values ($1) returning id",
                    transaction_id,
                )
                await conn.execute(
                    "insert into file_history (id, revision_id, filename, blob_id) values ($1, $2, $3, $4)",
                    file_id,
                    revision_id,
                    filename,
                    blob_id,
                )
                await self._increment_transaction_version(
                    conn=conn, revision_id=revision_id
                )
                return file_id

    async def delete_file(self, *, user: User, file_id: int) -> tuple[int, int]:
        async with self.db_pool.acquire() as conn:
            async with conn.transaction():
                perms = await conn.fetchrow(
                    "select t.id as transaction_id "
                    "from group_membership gm "
                    "   join transaction t on gm.group_id = t.group_id and gm.user_id = $1 "
                    "   join file f on t.id = f.transaction_id "
                    "where f.id = $2 and gm.can_write",
                    user.id,
                    file_id,
                )
                if not perms:
                    raise InvalidCommand("File not found")

                transaction_id = perms["transaction_id"]
                committed_state = await conn.fetchrow(
                    "select filename, deleted from committed_file_state_valid_at() where file_id = $1",
                    file_id,
                )
                if committed_state is not None and committed_state["deleted"]:
                    raise InvalidCommand("Cannot delete file as it is already deleted")

                if committed_state is None:
                    # file is only attached to a pending change, fully delete it right away, blob will be cleaned up
                    pending_state = await conn.fetchrow(
                        "select revision_id from aggregated_pending_file_history "
                        "where file_id = $1 and changed_by = $2",
                        file_id,
                        user.id,
                    )
                    if pending_state is None:
                        raise InvalidCommand("Unknown error occurred")

                    revision_id = pending_state["revision_id"]

                    await conn.execute(
                        "update file_history fh set deleted = true, blob_id = null where id = $1 and revision_id = $2",
                        file_id,
                        revision_id,
                    )
                    await self._increment_transaction_version(
                        conn=conn, revision_id=revision_id
                    )
                    return transaction_id, pending_state["revision_id"]

                revision_id = await self._get_or_create_revision(
                    conn=conn, user=user, transaction_id=transaction_id
                )

                await conn.execute(
                    "insert into file_history(id, revision_id, filename, blob_id, deleted) "
                    "values ($1, $2, $3, null, true)",
                    file_id,
                    revision_id,
                    committed_state["filename"],
                )
                await self._increment_transaction_version(
                    conn=conn, revision_id=revision_id
                )
                return transaction_id, revision_id

    async def read_file_contents(
        self, user: User, file_id: int, blob_id: int
    ) -> tuple[str, bytes]:
        async with self.db_pool.acquire() as conn:
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
                raise InvalidCommand("File not found")

            blob = await conn.fetchrow(
                "select content, mime_type from blob where id = $1", blob_id
            )
            if not blob:
                raise InvalidCommand("File not found")

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
            "select count(*) from committed_account_state_valid_at() "
            "where group_id = $1 and account_id = any($2::int[]) and not deleted",
            group_id,
            list(usages.keys()),
        )
        if len(usages.keys()) != n_accounts:
            raise InvalidCommand(
                "one of the accounts referenced by a position usage does not exist in this group"
            )
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
        position: TransactionPosition,
    ) -> int:
        item_id = await conn.fetchval(
            "insert into purchase_item (transaction_id) " "values ($1) " "returning id",
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
        position: TransactionPosition,
    ):
        if position.id == -1:
            await self._create_transaction_position(
                conn=conn,
                group_id=group_id,
                transaction_id=transaction_id,
                revision_id=revision_id,
                position=position,
            )
        else:
            await self._put_transaction_position(
                conn=conn,
                group_id=group_id,
                item_id=position.id,
                revision_id=revision_id,
                position=position,
            )

    async def update_transaction(
        self,
        *,
        user: User,
        transaction_id: int,
        value: float,
        description: str,
        billed_at: date,
        currency_symbol: str,
        currency_conversion_rate: float,
        debitor_shares: Optional[dict[int, float]] = None,
        creditor_shares: Optional[dict[int, float]] = None,
        positions: Optional[list[TransactionPosition]] = None,
        perform_commit: bool = False,
    ):
        async with self.db_pool.acquire() as conn:
            async with conn.transaction():
                group_id = await self._check_transaction_permissions(
                    conn=conn,
                    user=user,
                    transaction_id=transaction_id,
                    can_write=True,
                    transaction_type=TransactionType.purchase.value
                    if positions is not None
                    else None,
                )
                revision_id = await self._get_or_create_revision(
                    conn=conn, user=user, transaction_id=transaction_id
                )
                await conn.execute(
                    "insert into transaction_history (id, revision_id, currency_symbol, currency_conversion_rate, "
                    "   value, billed_at, description)"
                    "values ($1, $2, $3, $4, $5, $6, $7) "
                    "on conflict (id, revision_id) do update "
                    "set currency_symbol = $3, currency_conversion_rate = $4, value = $5, "
                    "   billed_at = $6, description = $7",
                    transaction_id,
                    revision_id,
                    currency_symbol,
                    currency_conversion_rate,
                    value,
                    billed_at,
                    description,
                )

                await conn.execute(
                    "delete from debitor_share where transaction_id = $1 and revision_id = $2",
                    transaction_id,
                    revision_id,
                )
                if debitor_shares:
                    await self._put_transaction_debitor_shares(
                        conn=conn,
                        group_id=group_id,
                        transaction_id=transaction_id,
                        revision_id=revision_id,
                        debitor_shares=debitor_shares,
                    )

                await conn.execute(
                    "delete from creditor_share where transaction_id = $1 and revision_id = $2",
                    transaction_id,
                    revision_id,
                )
                if creditor_shares:
                    await self._put_transaction_creditor_shares(
                        conn=conn,
                        group_id=group_id,
                        transaction_id=transaction_id,
                        revision_id=revision_id,
                        creditor_shares=creditor_shares,
                    )

                if positions:
                    for position in positions:
                        await self._process_position_update(
                            conn=conn,
                            transaction_id=transaction_id,
                            group_id=group_id,
                            revision_id=revision_id,
                            position=position,
                        )

                if perform_commit:
                    await conn.execute(
                        "update transaction_revision set committed = now() where id = $1",
                        revision_id,
                    )

    async def update_transaction_positions(
        self,
        *,
        user: User,
        transaction_id: int,
        positions: list[TransactionPosition],
        perform_commit: bool = False,
    ):
        async with self.db_pool.acquire() as conn:
            async with conn.transaction():
                group_id = await self._check_transaction_permissions(
                    conn=conn,
                    user=user,
                    transaction_id=transaction_id,
                    can_write=True,
                    transaction_type=TransactionType.purchase.value,
                )
                revision_id = await self._get_or_create_revision(
                    conn=conn, user=user, transaction_id=transaction_id
                )

                for position in positions:
                    await self._process_position_update(
                        conn=conn,
                        transaction_id=transaction_id,
                        group_id=group_id,
                        revision_id=revision_id,
                        position=position,
                    )

                if perform_commit:
                    await conn.execute(
                        "update transaction_revision set committed = now() where id = $1",
                        revision_id,
                    )

    async def create_transaction_change(self, *, user: User, transaction_id: int):
        async with self.db_pool.acquire() as conn:
            async with conn.transaction():
                await self._check_transaction_permissions(
                    conn=conn,
                    user=user,
                    transaction_id=transaction_id,
                    can_write=True,
                )
                await self._get_or_create_revision(
                    conn=conn, user=user, transaction_id=transaction_id
                )

    async def discard_transaction_changes(self, *, user: User, transaction_id: int):
        async with self.db_pool.acquire() as conn:
            async with conn.transaction():
                await self._check_transaction_permissions(
                    conn=conn,
                    user=user,
                    transaction_id=transaction_id,
                    can_write=True,
                )

                revision_id = await conn.fetchval(
                    "select id "
                    "from transaction_revision tr where tr.user_id = $1 and tr.transaction_id = $2 "
                    "   and tr.committed is null",
                    user.id,
                    transaction_id,
                )
                if revision_id is None:
                    raise InvalidCommand(
                        f"No changes to discard for transaction {transaction_id}"
                    )

                last_committed_revision = await conn.fetchval(
                    "select id "
                    "from transaction_revision tr where tr.transaction_id = $1 and tr.committed is not null",
                    transaction_id,
                )
                if (
                    last_committed_revision is None
                ):  # we have a newly created transaction - disallow discarding changes
                    raise InvalidCommand(
                        f"Cannot discard transaction changes without any committed changes"
                    )
                else:
                    await conn.execute(
                        "delete from transaction_revision tr " "where tr.id = $1",
                        revision_id,
                    )

    async def delete_transaction(self, *, user: User, transaction_id: int):
        async with self.db_pool.acquire() as conn:
            async with conn.transaction():
                group_id = await self._check_transaction_permissions(
                    conn=conn,
                    user=user,
                    transaction_id=transaction_id,
                    can_write=True,
                )

                row = await conn.fetchrow(
                    "select description, revision_id, deleted "
                    "from committed_transaction_state_valid_at() "
                    "where transaction_id = $1",
                    transaction_id,
                )
                if row is not None and row["deleted"]:
                    raise InvalidCommand(
                        f"Cannot delete transaction {transaction_id} as it already is deleted"
                    )

                await create_group_log(
                    conn=conn,
                    group_id=group_id,
                    user=user,
                    type="transaction-deleted",
                    message=f"deleted transaction with id {transaction_id}",
                )

                if (
                    row is None
                ):  # the transaction has no committed changes, we can only delete it if we created it
                    revision_id = await conn.fetchval(
                        "select id from transaction_revision tr "
                        "where tr.user_id = $1 and tr.transaction_id = $2 and tr.committed is null",
                        user.id,
                        transaction_id,
                    )
                    if revision_id is None:
                        raise InvalidCommand(
                            f"Cannot delete uncommitted transaction {transaction_id} of another user"
                        )

                    # here we assume there has already been a transaction_history entry, if not something weird has
                    # happened
                    t_id = await conn.fetchval(
                        "update transaction_history th set deleted = true "
                        "where th.id = $1 and th.revision_id = $2 returning id",
                        transaction_id,
                        revision_id,
                    )
                    if t_id is None:
                        raise InvalidCommand(
                            f"something weird has happened deleting uncommitted transaction "
                            f"{transaction_id}, please consult your local IT admin"
                        )

                    # now commit this change
                    await conn.execute(
                        "update transaction_revision tr set committed = now() "
                        "where tr.user_id = $1 and tr.transaction_id = $2 and tr.committed is null",
                        user.id,
                        transaction_id,
                    )
                    return

                else:  # we have at least one committed change for this transaction
                    revision_id = await self._get_or_create_pending_transaction_change(
                        conn=conn, user=user, transaction_id=transaction_id
                    )

                    await conn.execute(
                        "update transaction_history th set deleted = true "
                        "where th.id = $1 and th.revision_id = $2",
                        transaction_id,
                        revision_id,
                    )

                    await conn.execute(
                        "update transaction_revision tr set committed = NOW() "
                        "where tr.id = $1",
                        revision_id,
                    )

    async def _get_or_create_revision(
        self, conn: asyncpg.Connection, user: User, transaction_id: int
    ) -> int:
        """return the revision id, assumes we are already in a transaction"""
        revision_id = await conn.fetchval(
            "select id "
            "from transaction_revision "
            "where transaction_id = $1 and user_id = $2 and committed is null",
            transaction_id,
            user.id,
        )
        if revision_id:  # there already is a wip revision
            return revision_id

        # create a new transaction revision
        revision_id = await conn.fetchval(
            "insert into transaction_revision (user_id, transaction_id) values ($1, $2) returning id",
            user.id,
            transaction_id,
        )
        return revision_id

    async def _get_or_create_pending_transaction_change(
        self, conn: asyncpg.Connection, user: User, transaction_id: int
    ) -> int:
        revision_id = await self._get_or_create_revision(
            conn=conn, user=user, transaction_id=transaction_id
        )

        t = await conn.fetchval(
            "select id from transaction_history th where revision_id = $1 and id = $2",
            revision_id,
            transaction_id,
        )
        if t:
            return revision_id

        last_committed_revision = await conn.fetchval(
            "select tr.id "
            "from transaction_revision tr "
            "   join transaction_history th on tr.id = th.revision_id and tr.transaction_id = th.id "
            "where tr.transaction_id = $1 and tr.committed is not null "
            "order by tr.committed desc "
            "limit 1",
            transaction_id,
        )

        if last_committed_revision is None:
            raise InvalidCommand(
                f"Cannot edit transaction {transaction_id} as it has no committed changes."
            )

        # copy all existing transaction data into a new history entry
        await conn.execute(
            "insert into transaction_history (id, revision_id, currency_symbol, currency_conversion_rate, description, value, billed_at, deleted)"
            "select id, $1, currency_symbol, currency_conversion_rate, description, value, billed_at, deleted "
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
