from abrechnung.domain.accounts import Account
from . import Application, require_group_permissions


class AccountService(Application):
    @require_group_permissions
    def list_accounts(self, *, user_id: int, group_id: int) -> list[Account]:
        async with self.db_pool.acquire() as conn:
            cur = await conn.cursor(
                "select id, type, revision_id, name, description, priority from latest_account where group_id = $1 and user_id = $2 and deleted = false",
                group_id,
                user_id,
            )
            result = []
            async for account in cur:
                result.append(
                    Account(
                        type=account["type"],
                        name=account["name"],
                        description=account["description"],
                        priority=account["priority"],
                        deleted=False,
                    )
                )

            return result

    @require_group_permissions
    def get_account(self, *, user_id: int, group_id: int, account_id: int) -> Account:
        async with self.db_pool.acquire() as conn:
            account = await conn.fetchrow(
                "select id, type, revision_id, name, description, priority from latest_account where group_id = $1 and user_id = $2 and id = $3 and deleted = false",
                group_id,
                user_id,
                account_id,
            )
            return Account(
                type=account["type"],
                name=account["name"],
                description=account["description"],
                priority=account["priority"],
                deleted=False,
            )

    @require_group_permissions(can_write=True)
    def create_account(
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
                account_id = await conn.fetchval(
                    "insert into account (group_id, type) values ($1, $2)",
                    group_id,
                    type,
                )
                pass

    def update_account(
        self,
        user_id: int,
        group_id: int,
        account_id: int,
        name: str,
        description: str,
        priority: int = 0,
    ) -> int:
        pass
