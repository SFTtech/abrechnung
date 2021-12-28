from datetime import datetime, timezone

from abrechnung.domain.accounts import Account
from . import (
    Application,
    NotFoundError,
    check_group_permissions,
    InvalidCommand,
    create_group_log,
)


class AccountService(Application):
    async def list_accounts(self, *, user_id: int, group_id: int) -> list[Account]:
        async with self.db_pool.acquire() as conn:
            async with conn.transaction():
                await check_group_permissions(
                    conn=conn, group_id=group_id, user_id=user_id
                )
                cur = conn.cursor(
                    "select account_id, type, revision_id, name, description, priority, deleted "
                    "from committed_account_state_valid_at() "
                    "where group_id = $1",
                    group_id,
                )
                result = []
                async for account in cur:
                    result.append(
                        Account(
                            id=account["account_id"],
                            type=account["type"],
                            name=account["name"],
                            description=account["description"],
                            priority=account["priority"],
                            deleted=account["deleted"],
                        )
                    )

                return result

    async def get_account(
        self, *, user_id: int, group_id: int, account_id: int
    ) -> Account:
        async with self.db_pool.acquire() as conn:
            await check_group_permissions(conn=conn, group_id=group_id, user_id=user_id)
            account = await conn.fetchrow(
                "select account_id, type, revision_id, name, description, priority, deleted "
                "from committed_account_state_valid_at() "
                "where group_id = $1 and account_id = $2",
                group_id,
                account_id,
            )
            if account is None:
                raise NotFoundError(f"No account with id {account_id} exists")

            return Account(
                id=account["account_id"],
                type=account["type"],
                name=account["name"],
                description=account["description"],
                priority=account["priority"],
                deleted=account["deleted"],
            )

    async def create_account(
        self,
        *,
        user_id: int,
        group_id: int,
        type: str,
        name: str,
        description: str,
        priority: int = 0,
    ) -> int:
        async with self.db_pool.acquire() as conn:
            async with conn.transaction():
                await check_group_permissions(
                    conn=conn, group_id=group_id, user_id=user_id, can_write=True
                )
                account_id = await conn.fetchval(
                    "insert into account (group_id, type) values ($1, $2) returning id",
                    group_id,
                    type,
                )
                now = datetime.now(tz=timezone.utc)
                revision_id = await conn.fetchval(
                    "insert into account_revision (user_id, account_id, started, committed) "
                    "values ($1, $2, $3, $4) returning id",
                    user_id,
                    account_id,
                    now,
                    now,
                )
                await conn.execute(
                    "insert into account_history (id, revision_id, name, description, priority) "
                    "values ($1, $2, $3, $4, $5)",
                    account_id,
                    revision_id,
                    name,
                    description,
                    priority,
                )
                await create_group_log(
                    conn=conn,
                    group_id=group_id,
                    user_id=user_id,
                    type="account-committed",
                    message=f"created account {name}",
                )
                return account_id

    async def update_account(
        self,
        user_id: int,
        group_id: int,
        account_id: int,
        name: str,
        description: str,
        priority: int = 0,
    ):
        # TODO: figure out the more complex logic once we have accounts stuck in uncommitted states
        async with self.db_pool.acquire() as conn:
            async with conn.transaction():
                await check_group_permissions(
                    conn=conn, group_id=group_id, user_id=user_id, can_write=True
                )
                account = await conn.fetchrow(
                    "select account_id, type, revision_id, name, description, priority "
                    "from committed_account_state_valid_at() "
                    "where group_id = $1 and account_id = $2 and deleted = false",
                    group_id,
                    account_id,
                )
                if account is None:
                    raise NotFoundError(f"No account with id {account_id} exists")

                if (
                    name != account["name"]
                    or description != account["description"]
                    or priority != account["priority"]
                ):
                    """if there is something to change initialize a new revision and a new entry in the history table"""
                    now = datetime.now(tz=timezone.utc)
                    revision_id = await conn.fetchval(
                        "insert into account_revision (user_id, account_id, started, committed) "
                        "values ($1, $2, $3, $4) returning id",
                        user_id,
                        account_id,
                        now,
                        now,
                    )
                    await conn.execute(
                        "insert into account_history (id, revision_id, name, description, priority) "
                        "values ($1, $2, $3, $4, $5)",
                        account_id,
                        revision_id,
                        name,
                        description,
                        priority,
                    )
                    await create_group_log(
                        conn=conn,
                        group_id=group_id,
                        user_id=user_id,
                        type="account-committed",
                        message=f"updated account {name}",
                    )

    async def delete_account(
        self,
        user_id: int,
        group_id: int,
        account_id: int,
    ):
        async with self.db_pool.acquire() as conn:
            async with conn.transaction():
                await check_group_permissions(
                    conn=conn, group_id=group_id, user_id=user_id, can_write=True
                )
                row = await conn.fetchrow(
                    "select id " "from account " "where id = $1 and group_id = $2",
                    account_id,
                    group_id,
                )
                if row is None:
                    raise InvalidCommand(f"Account does not exist")

                has_committed_shares = await conn.fetchval(
                    "select 1 "
                    "from committed_transaction_state_valid_at() t "
                    "where group_id = $1 and not deleted and $2 = any(involved_accounts)",
                    group_id,
                    account_id,
                )
                has_pending_shares = await conn.fetchval(
                    "select 1 "
                    "from aggregated_pending_transaction_history t "
                    "where group_id = $1 and $2 = any(t.involved_accounts)",
                    group_id,
                    account_id,
                )

                has_committed_usages = await conn.fetchval(
                    "select 1 "
                    "from committed_transaction_position_state_valid_at() p "
                    "join transaction t on t.id = p.transaction_id "
                    "where t.group_id = $1 and not p.deleted and $2 = any(p.involved_accounts)",
                    group_id,
                    account_id,
                )

                has_pending_usages = await conn.fetchval(
                    "select 1 "
                    "from aggregated_pending_transaction_position_history p "
                    "join transaction t on t.id = p.transaction_id "
                    "where t.group_id = $1 and $2 = any(p.involved_accounts)",
                    group_id,
                    account_id,
                )

                if (
                    has_committed_shares
                    or has_pending_shares
                    or has_committed_usages
                    or has_pending_usages
                ):
                    raise InvalidCommand(
                        f"Cannot delete an account that is references by a transaction"
                    )

                row = await conn.fetchrow(
                    "select name, revision_id, deleted "
                    "from committed_account_state_valid_at() "
                    "where account_id = $1 and group_id = $2",
                    account_id,
                    group_id,
                )
                if row is None:
                    raise InvalidCommand(
                        f"Cannot delete an account without any committed changes"
                    )

                if row["deleted"]:
                    raise InvalidCommand(f"Cannot delete an already deleted account")

                now = datetime.now(tz=timezone.utc)
                revision_id = await conn.fetchval(
                    "insert into account_revision (user_id, account_id, started, committed) "
                    "values ($1, $2, $3, $4) returning id",
                    user_id,
                    account_id,
                    now,
                    now,
                )
                await conn.execute(
                    "insert into account_history (id, revision_id, name, description, priority, deleted) "
                    "select $1, $2, name, description, priority, true "
                    "from account_history ah where ah.id = $1 and ah.revision_id = $3 ",
                    account_id,
                    revision_id,
                    row["revision_id"],
                )

                await create_group_log(
                    conn=conn,
                    group_id=group_id,
                    user_id=user_id,
                    type="account-deleted",
                    message=f"deleted account account {row['name']}",
                )
