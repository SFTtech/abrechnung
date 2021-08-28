import json
from typing import Optional, Union

import asyncpg

from abrechnung.application import Application, require_group_permissions, NotFoundError
from abrechnung.domain import InvalidCommand
from abrechnung.domain.transactions import Transaction, TransactionDetails


class TransactionService(Application):
    @staticmethod
    def _transaction_detail_from_db_json(db_json: dict) -> TransactionDetails:
        return TransactionDetails(
            description=db_json["description"],
            value=db_json["value"],
            currency_symbol=db_json["currency_symbol"],
            currency_conversion_rate=db_json["currency_conversion_rate"],
            deleted=db_json["deleted"],
            committed_at=db_json["revision_committed"],
            creditor_shares={
                cred["account_id"]: cred["shares"]
                for cred in db_json["creditor_shares"]
            },
            debitor_shares={
                deb["account_id"]: deb["shares"] for deb in db_json["debitor_shares"]
            },
            changed_by=db_json["last_changed_by"],
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
            raise NotFoundError

        if can_write and not (result["can_write"] or result["is_owner"]):
            raise PermissionError

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

    @require_group_permissions()
    async def list_transactions(
        self, *, user_id: int, group_id: int
    ) -> list[Transaction]:
        async with self.db_pool.acquire() as conn:
            async with conn.transaction():
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

    @require_group_permissions(can_write=True)
    async def create_transaction(
        self,
        *,
        user_id: int,
        group_id: int,
        type: str,
        description: str,
        currency_symbol: str,
        currency_conversion_rate: float,
        value: float,
    ) -> int:
        async with self.db_pool.acquire() as conn:
            async with conn.transaction():
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
                    "insert into transaction_history (id, revision_id, currency_symbol, currency_conversion_rate, value, description) "
                    "values ($1, $2, $3, $4, $5, $6)",
                    transaction_id,
                    revision_id,
                    currency_symbol,
                    currency_conversion_rate,
                    value,
                    description,
                )
                return transaction_id

    async def commit_transaction(self, *, user_id: int, transaction_id: int) -> None:
        async with self.db_pool.acquire() as conn:
            async with conn.transaction():
                await self._check_transaction_permissions(
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
            "insert into transaction_history (id, revision_id, currency_symbol, currency_conversion_rate, description, value, deleted)"
            "select id, $1, currency_symbol, currency_conversion_rate, description, value, deleted "
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
        self, user_id: int, transaction_id: int, account_id: int
    ):
        async with self.db_pool.acquire() as conn:
            async with conn.transaction():
                group_id, revision_id = await self._transaction_share_check(
                    conn, user_id, transaction_id, account_id
                )

                r = await conn.fetchval(
                    "delete from creditor_share where transaction_id = $1 and revision_id = $2 returning revision_id",
                    transaction_id,
                    revision_id,
                )
                if not r:
                    raise NotFoundError(f"Creditor share does not exist")

    async def add_or_change_debitor_share(
        self,
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
        self, user_id: int, transaction_id: int, account_id: int, value: float
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
        self, user_id: int, transaction_id: int, account_id: int
    ):

        async with self.db_pool.acquire() as conn:
            async with conn.transaction():
                group_id, revision_id = await self._transaction_share_check(
                    conn, user_id, transaction_id, account_id
                )

                r = await conn.fetchval(
                    "delete from debitor_share where transaction_id = $1 and revision_id = $2 returning revision_id",
                    transaction_id,
                    revision_id,
                )
                if not r:
                    raise NotFoundError(f"Debitor share does not exist")
