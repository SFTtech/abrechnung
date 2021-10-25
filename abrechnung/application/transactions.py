import json
from typing import Optional, Union
from datetime import date

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
    PurchaseItem,
)


class TransactionService(Application):
    @staticmethod
    def _transaction_detail_from_db_json(db_json: dict) -> TransactionDetails:
        purchase_items = None

        if db_json.get("purchase_items") is not None:
            purchase_items = [
                PurchaseItem(
                    id=p["id"],
                    name=p["name"],
                    price=p["price"],
                    communist_shares=p["communist_shares"],
                    deleted=p["deleted"],
                    usages={
                        usage["account_id"]: usage["share_amount"]
                        for usage in p["usages"]
                    },
                )
                for p in db_json["purchase_items"]
            ]

        return TransactionDetails(
            description=db_json["description"],
            value=db_json["value"],
            currency_symbol=db_json["currency_symbol"],
            currency_conversion_rate=db_json["currency_conversion_rate"],
            deleted=db_json["deleted"],
            committed_at=db_json["revision_committed"],
            billed_at=date.fromisoformat(db_json["billed_at"]),
            creditor_shares={
                cred["account_id"]: cred["shares"]
                for cred in db_json["creditor_shares"]
            },
            debitor_shares={
                deb["account_id"]: deb["shares"] for deb in db_json["debitor_shares"]
            },
            changed_by=db_json["last_changed_by"],
            purchase_items=purchase_items,
        )

    @staticmethod
    async def _check_transaction_permissions(
        conn: asyncpg.Connection,
        user_id: int,
        transaction_id: int,
        can_write: bool = False,
        transaction_type: Optional[Union[str, list[str]]] = None,
    ) -> int:
        """returns group id of the transaction"""
        result = await conn.fetchrow(
            "select t.type, t.group_id, can_write, is_owner "
            "from group_membership gm join transaction t on gm.group_id = t.group_id and gm.user_id = $1 where t.id = $2",
            user_id,
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

    def _transaction_db_row(self, transaction: asyncpg.Record) -> Transaction:
        changes = transaction["pending_changes"]
        if changes is None:
            pending_changes = None
        else:
            pending_changes = {
                c["last_changed_by"]: self._transaction_detail_from_db_json(c)
                for c in json.loads(changes)
            }

        current_state = (
            self._transaction_detail_from_db_json(
                json.loads(transaction["current_state"])[0]
            )
            if transaction["current_state"] is not None
            else None
        )

        return Transaction(
            id=transaction["id"],
            type=transaction["type"],
            current_state=current_state,
            pending_changes=pending_changes,
        )

    async def list_transactions(
        self, *, user_id: int, group_id: int
    ) -> list[Transaction]:
        async with self.db_pool.acquire() as conn:
            async with conn.transaction():
                await check_group_permissions(
                    conn=conn, group_id=group_id, user_id=user_id
                )
                cur = conn.cursor(
                    "select id, type, current_state, pending_changes "
                    "from current_transaction_state "
                    "where group_id = $1",
                    group_id,
                )
                result = []
                async for transaction in cur:
                    result.append(self._transaction_db_row(transaction))

                return result

    async def get_transaction(
        self, *, user_id: int, transaction_id: int
    ) -> Transaction:
        async with self.db_pool.acquire() as conn:
            group_id = await self._check_transaction_permissions(
                conn=conn, user_id=user_id, transaction_id=transaction_id
            )
            transaction = await conn.fetchrow(
                "select id, type, current_state, pending_changes "
                "from current_transaction_state "
                "where group_id = $1 and id = $2",
                group_id,
                transaction_id,
            )
            if transaction is None:
                raise NotFoundError(
                    f"Transaction with id {transaction_id} does not exist"
                )

            return self._transaction_db_row(transaction)

    async def create_transaction(
        self,
        *,
        user_id: int,
        group_id: int,
        type: str,
        description: str,
        billed_at: date,
        currency_symbol: str,
        currency_conversion_rate: float,
        value: float,
    ) -> int:
        async with self.db_pool.acquire() as conn:
            async with conn.transaction():
                await check_group_permissions(
                    conn=conn, group_id=group_id, user_id=user_id
                )
                transaction_id = await conn.fetchval(
                    "insert into transaction (group_id, type) values ($1, $2) returning id",
                    group_id,
                    type,
                )
                revision_id = await conn.fetchval(
                    "insert into transaction_revision (user_id, transaction_id) "
                    "values ($1, $2) returning id",
                    user_id,
                    transaction_id,
                )
                await conn.execute(
                    "insert into transaction_history (id, revision_id, currency_symbol, currency_conversion_rate, value, description, billed_at) "
                    "values ($1, $2, $3, $4, $5, $6, $7)",
                    transaction_id,
                    revision_id,
                    currency_symbol,
                    currency_conversion_rate,
                    value,
                    description,
                    billed_at,
                )
                return transaction_id

    async def commit_transaction(self, *, user_id: int, transaction_id: int) -> None:
        async with self.db_pool.acquire() as conn:
            async with conn.transaction():
                group_id = await self._check_transaction_permissions(
                    conn=conn, user_id=user_id, transaction_id=transaction_id
                )
                revision_id = await conn.fetchval(
                    "select id from transaction_revision where transaction_id = $1 and user_id = $2 and committed is null",
                    transaction_id,
                    user_id,
                )
                if revision_id is None:
                    raise InvalidCommand(
                        f"Cannot commit a transaction without pending changes"
                    )

                await conn.execute(
                    "update transaction_revision "
                    "set committed = now() where id = $1",
                    revision_id,
                )
                await create_group_log(
                    conn=conn,
                    group_id=group_id,
                    user_id=user_id,
                    type="transaction-committed",
                    message=f"updated transaction with id {transaction_id}",
                )

    async def update_transaction(
        self,
        *,
        user_id: int,
        transaction_id: int,
        value: float,
        description: str,
        billed_at: date,
        currency_symbol: str,
        currency_conversion_rate: float,
    ):
        async with self.db_pool.acquire() as conn:
            async with conn.transaction():
                await self._check_transaction_permissions(
                    conn=conn,
                    user_id=user_id,
                    transaction_id=transaction_id,
                    can_write=True,
                )
                revision_id = await self._get_or_create_pending_change(
                    conn=conn, user_id=user_id, transaction_id=transaction_id
                )
                await conn.execute(
                    "update transaction_history th "
                    "set value = $3, description = $4, currency_symbol = $5, currency_conversion_rate = $6, billed_at = $7 "
                    "where th.id = $1 and th.revision_id = $2",
                    transaction_id,
                    revision_id,
                    value,
                    description,
                    currency_symbol,
                    currency_conversion_rate,
                    billed_at,
                )

    async def create_transaction_change(self, *, user_id: int, transaction_id: int):
        async with self.db_pool.acquire() as conn:
            async with conn.transaction():
                await self._check_transaction_permissions(
                    conn=conn,
                    user_id=user_id,
                    transaction_id=transaction_id,
                    can_write=True,
                )
                await self._get_or_create_pending_change(
                    conn=conn, user_id=user_id, transaction_id=transaction_id
                )

    async def discard_transaction_changes(self, *, user_id: int, transaction_id: int):
        async with self.db_pool.acquire() as conn:
            async with conn.transaction():
                await self._check_transaction_permissions(
                    conn=conn,
                    user_id=user_id,
                    transaction_id=transaction_id,
                    can_write=True,
                )

                revision_id = await conn.fetchval(
                    "select id "
                    "from transaction_revision tr where tr.user_id = $1 and tr.transaction_id = $2 "
                    "   and tr.committed is null",
                    user_id,
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

    async def delete_transaction(self, *, user_id: int, transaction_id: int):
        async with self.db_pool.acquire() as conn:
            async with conn.transaction():
                group_id = await self._check_transaction_permissions(
                    conn=conn,
                    user_id=user_id,
                    transaction_id=transaction_id,
                    can_write=True,
                )

                row = await conn.fetchrow(
                    "select description, revision_id, deleted "
                    "from committed_transaction_history th "
                    "where th.id = $1",
                    transaction_id,
                )
                if row is not None and row["deleted"]:
                    raise InvalidCommand(
                        f"Cannot delete transaction {transaction_id} as it already is deleted"
                    )

                await create_group_log(
                    conn=conn,
                    group_id=group_id,
                    user_id=user_id,
                    type="transaction-deleted",
                    message=f"deleted transaction with id {transaction_id}",
                )

                if (
                    row is None
                ):  # the transaction has no committed changes, we can only delete it if we created it
                    revision_id = await conn.fetchval(
                        "select id from transaction_revision tr "
                        "where tr.user_id = $1 and tr.transaction_id = $2 and tr.committed is null",
                        user_id,
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
                        user_id,
                        transaction_id,
                    )
                    return

                else:  # we have at least one committed change for this transaction
                    revision_id = await self._get_or_create_pending_change(
                        conn=conn, user_id=user_id, transaction_id=transaction_id
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

    async def _get_or_create_pending_change(
        self, conn: asyncpg.Connection, user_id: int, transaction_id: int
    ) -> int:
        """return the revision id, assumes we are already in a transaction"""
        revision_id = await conn.fetchval(
            "select id "
            "from transaction_revision "
            "where transaction_id = $1 and user_id = $2 and committed is null",
            transaction_id,
            user_id,
        )
        if revision_id:  # there already is a wip revision
            return revision_id

        # create a new transaction revision
        revision_id = await conn.fetchval(
            "insert into transaction_revision (user_id, transaction_id) values ($1, $2) returning id",
            user_id,
            transaction_id,
        )

        transaction_type = await conn.fetchval(
            "select t.type from transaction t where t.id = $1", transaction_id
        )

        last_committed_revision = await conn.fetchval(
            "select revision_id from committed_transaction_history where id = $1",
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

        if transaction_type == "purchase":  # also copy all purchase items
            await conn.execute(
                "insert into purchase_item_history (id, revision_id, name, price, communist_shares) "
                "select pi.id, $1, pih.name, pih.price, pih.communist_shares "
                "from purchase_item_history pih join purchase_item pi on pih.id = pi.id "
                "where pi.transaction_id = $2 and pih.revision_id = $3",
                revision_id,
                transaction_id,
                last_committed_revision,
            )
            await conn.execute(
                "insert into purchase_item_usage (item_id, revision_id, account_id, share_amount) "
                "select item_id, $1, account_id, share_amount "
                "from purchase_item_usage piu join purchase_item pi on piu.item_id = pi.id "
                "where pi.transaction_id = $2 and piu.revision_id = $3",
                revision_id,
                transaction_id,
                last_committed_revision,
            )

        return revision_id

    async def _transaction_share_check(
        self,
        conn: asyncpg.Connection,
        user_id: int,
        transaction_id: int,
        account_id: int,
        transaction_type: Optional[Union[str, list[str]]] = None,
    ) -> tuple[int, int]:
        """returns tuple of group_id of the transaction and the users revision_id of the pending change"""
        group_id = await self._check_transaction_permissions(
            conn=conn,
            user_id=user_id,
            transaction_id=transaction_id,
            can_write=True,
            transaction_type=transaction_type,
        )
        revision_id = await self._get_or_create_pending_change(
            conn=conn, user_id=user_id, transaction_id=transaction_id
        )

        acc = await conn.fetchval(
            "select id from account where group_id = $1", group_id
        )
        if not acc:
            raise NotFoundError(f"Account with id {account_id}")

        return group_id, revision_id

    async def add_or_change_creditor_share(
        self,
        *,
        user_id: int,
        transaction_id: int,
        account_id: int,
        value: float,
    ):
        async with self.db_pool.acquire() as conn:
            async with conn.transaction():
                group_id, revision_id = await self._transaction_share_check(
                    conn, user_id, transaction_id, account_id
                )

                await conn.execute(
                    "insert into creditor_share (transaction_id, revision_id, account_id, shares) "
                    "values ($1, $2, $3, $4) "
                    "on conflict (transaction_id, revision_id, account_id) do "
                    "update set shares = $4 "
                    "where creditor_share.transaction_id = $1 "
                    "   and creditor_share.revision_id = $2 "
                    "   and creditor_share.account_id = $3",
                    transaction_id,
                    revision_id,
                    account_id,
                    value,
                )

    async def switch_creditor_share(
        self,
        *,
        user_id: int,
        transaction_id: int,
        account_id: int,
        value: float,
    ):
        async with self.db_pool.acquire() as conn:
            async with conn.transaction():
                group_id, revision_id = await self._transaction_share_check(
                    conn,
                    user_id,
                    transaction_id,
                    account_id,
                    transaction_type=["purchase", "transfer"],
                )

                await conn.execute(
                    "delete from creditor_share where transaction_id = $1 and revision_id = $2",
                    transaction_id,
                    revision_id,
                )
                await conn.execute(
                    "insert into creditor_share (transaction_id, revision_id, account_id, shares) "
                    "values ($1, $2, $3, $4)",
                    transaction_id,
                    revision_id,
                    account_id,
                    value,
                )

    async def delete_creditor_share(
        self, *, user_id: int, transaction_id: int, account_id: int
    ):
        async with self.db_pool.acquire() as conn:
            async with conn.transaction():
                group_id, revision_id = await self._transaction_share_check(
                    conn, user_id, transaction_id, account_id
                )

                r = await conn.fetchval(
                    "delete from creditor_share where transaction_id = $1 and revision_id = $2 and account_id = $3 "
                    "returning revision_id",
                    transaction_id,
                    revision_id,
                    account_id,
                )
                if not r:
                    raise NotFoundError(f"Creditor share does not exist")

    async def add_or_change_debitor_share(
        self,
        *,
        user_id: int,
        transaction_id: int,
        account_id: int,
        value: float,
    ):
        async with self.db_pool.acquire() as conn:
            async with conn.transaction():
                group_id, revision_id = await self._transaction_share_check(
                    conn, user_id, transaction_id, account_id
                )

                await conn.execute(
                    "insert into debitor_share (transaction_id, revision_id, account_id, shares) "
                    "values ($1, $2, $3, $4) "
                    "on conflict (transaction_id, revision_id, account_id) do "
                    "update set shares = $4 "
                    "where debitor_share.transaction_id = $1 "
                    "   and debitor_share.revision_id = $2 "
                    "   and debitor_share.account_id = $3",
                    transaction_id,
                    revision_id,
                    account_id,
                    value,
                )

    async def switch_debitor_share(
        self, *, user_id: int, transaction_id: int, account_id: int, value: float
    ):
        async with self.db_pool.acquire() as conn:
            async with conn.transaction():
                group_id, revision_id = await self._transaction_share_check(
                    conn,
                    user_id,
                    transaction_id,
                    account_id,
                    transaction_type=["transfer"],
                )

                await conn.execute(
                    "delete from debitor_share where transaction_id = $1 and revision_id = $2",
                    transaction_id,
                    revision_id,
                )
                await conn.execute(
                    "insert into debitor_share (transaction_id, revision_id, account_id, shares) "
                    "values ($1, $2, $3, $4)",
                    transaction_id,
                    revision_id,
                    account_id,
                    value,
                )

    async def delete_debitor_share(
        self, *, user_id: int, transaction_id: int, account_id: int
    ):

        async with self.db_pool.acquire() as conn:
            async with conn.transaction():
                group_id, revision_id = await self._transaction_share_check(
                    conn, user_id, transaction_id, account_id
                )

                r = await conn.fetchval(
                    "delete from debitor_share where transaction_id = $1 and revision_id = $2 and account_id = $3 "
                    "returning revision_id",
                    transaction_id,
                    revision_id,
                    account_id,
                )
                if not r:
                    raise NotFoundError(f"Debitor share does not exist")

    async def create_purchase_item(
        self,
        *,
        user_id: int,
        transaction_id: int,
        name: str,
        price: float,
        communist_shares: float,
    ) -> int:
        async with self.db_pool.acquire() as conn:
            async with conn.transaction():
                await self._check_transaction_permissions(
                    conn=conn,
                    user_id=user_id,
                    transaction_id=transaction_id,
                    can_write=True,
                    transaction_type="purchase",
                )
                revision_id = await self._get_or_create_pending_change(
                    conn=conn, user_id=user_id, transaction_id=transaction_id
                )
                item_id = await conn.fetchval(
                    "insert into purchase_item (transaction_id) values ($1) returning id",
                    transaction_id,
                )
                await conn.execute(
                    "insert into purchase_item_history (id, revision_id, name, price, communist_shares) "
                    "values ($1, $2, $3, $4, $5)",
                    item_id,
                    revision_id,
                    name,
                    price,
                    communist_shares,
                )
                return item_id

    @staticmethod
    async def _check_purchase_item_permissions(
        *, conn: asyncpg.Connection, user_id: int, item_id: int, can_write: bool = True
    ) -> tuple[int, int]:
        row = await conn.fetchrow(
            "select gm.group_id as group_id, gm.can_write as can_write, t.id as transaction_id "
            "from group_membership gm "
            "join transaction t on gm.group_id = t.group_id "
            "join purchase_item pi on t.id = pi.transaction_id "
            "where pi.id = $1 and gm.user_id = $2",
            item_id,
            user_id,
        )
        if row is None:
            raise NotFoundError(f"A purchase item with id '{item_id}' does not exist")

        if can_write and not row["can_write"]:
            raise PermissionError(
                f"Missing write permissions for item with id '{item_id}'"
            )

        return row["group_id"], row["transaction_id"]

    async def update_purchase_item(
        self,
        *,
        user_id: int,
        item_id: int,
        name: str,
        price: float,
        communist_shares: float,
    ):
        async with self.db_pool.acquire() as conn:
            async with conn.transaction():
                group_id, transaction_id = await self._check_purchase_item_permissions(
                    conn=conn, user_id=user_id, item_id=item_id
                )
                revision_id = await self._get_or_create_pending_change(
                    conn=conn, user_id=user_id, transaction_id=transaction_id
                )
                await conn.execute(
                    "update purchase_item_history set name = $3, price = $4, communist_shares = $5 "
                    "where id = $1 and revision_id = $2",
                    item_id,
                    revision_id,
                    name,
                    price,
                    communist_shares,
                )

    async def add_or_change_item_share(
        self,
        *,
        user_id: int,
        item_id: int,
        account_id: int,
        share_amount: float,
    ):
        async with self.db_pool.acquire() as conn:
            async with conn.transaction():
                group_id, transaction_id = await self._check_purchase_item_permissions(
                    conn=conn, user_id=user_id, item_id=item_id
                )
                revision_id = await self._get_or_create_pending_change(
                    conn=conn, user_id=user_id, transaction_id=transaction_id
                )

                await conn.execute(
                    "insert into purchase_item_usage (item_id, revision_id, account_id, share_amount) "
                    "values ($1, $2, $3, $4) "
                    "on conflict (item_id, revision_id, account_id) do "
                    "update set share_amount = $4 "
                    "where purchase_item_usage.item_id = $1 "
                    "   and purchase_item_usage.revision_id = $2 "
                    "   and purchase_item_usage.account_id = $3",
                    transaction_id,
                    revision_id,
                    account_id,
                    share_amount,
                )

    async def delete_item_share(
        self,
        *,
        user_id: int,
        item_id: int,
        account_id: int,
    ):
        async with self.db_pool.acquire() as conn:
            async with conn.transaction():
                group_id, transaction_id = await self._check_purchase_item_permissions(
                    conn=conn, user_id=user_id, item_id=item_id
                )
                revision_id = await self._get_or_create_pending_change(
                    conn=conn, user_id=user_id, transaction_id=transaction_id
                )

                r = await conn.fetchval(
                    "delete from purchase_item_usage where item_id = $1 and revision_id = $2 and account_id = $3 "
                    "returning revision_id",
                    transaction_id,
                    revision_id,
                    account_id,
                )
                if not r:
                    raise NotFoundError(f"Purchase item usage does not exist")

    async def delete_purchase_item(self, *, user_id: int, item_id: int):
        async with self.db_pool.acquire() as conn:
            async with conn.transaction():
                group_id, transaction_id = await self._check_purchase_item_permissions(
                    conn=conn, user_id=user_id, item_id=item_id
                )
                revision_id = await self._get_or_create_pending_change(
                    conn=conn, user_id=user_id, transaction_id=transaction_id
                )

                await conn.execute(
                    "update purchase_item_history pih set deleted = true "
                    "where pih.id = $1 and pih.revision_id = $2",
                    item_id,
                    revision_id,
                )
