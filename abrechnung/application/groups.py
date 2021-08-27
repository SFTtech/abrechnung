from datetime import datetime

from abrechnung.application import Application, require_group_permissions
from abrechnung.domain.groups import Group, GroupMember
from abrechnung.domain.users import User


class Groups(Application):
    def create_group(
        self,
        user_id: int,
        name: str,
        description: str,
        currency_symbol: str,
        terms: str,
    ) -> int:
        async with self.db_pool.acquire() as conn:
            async with conn.transaction():
                group_id = conn.fetchval(
                    "insert into grp (name, description, currency_symbol, terms) "
                    "values ($1, $2, $3, $4) returning id",
                    name,
                    description,
                    currency_symbol,
                    terms,
                )
                conn.execute(
                    "insert into group_membership (user_id, group_id, is_owner, can_write, description) "
                    "values ($1, $2, $3, $4, $5)",
                    user_id,
                    group_id,
                    True,
                    True,
                    "group founder",
                )

                return group_id

    @require_group_permissions(can_write=True)
    def create_invite(
        self,
        user_id: int,
        group_id: int,
        description: str,
        single_use: bool,
        valid_until: datetime,
    ):
        async with self.db_pool.acquire() as conn:
            async with conn.transaction():
                conn.execute(
                    "insert into group_invite(group_id, description, created_by, valid_until, single_use)"
                    " values ($1, $2, $3, $4, $5)",
                    group_id,
                    description,
                    user_id,
                    valid_until,
                    single_use,
                )

    @require_group_permissions(can_write=True)
    def delete_invite(
        self,
        user_id: int,
        group_id: int,
        invite_id: int,
    ):
        async with self.db_pool.acquire() as conn:
            async with conn.transaction():
                conn.execute(
                    "delete from group_invite where id = $1 and group_id = $2",
                    invite_id,
                    group_id,
                )

    def join_group(self, user_id: int, group_id: int, invite_token: str):
        pass

    def list_groups(self, user_id: int) -> list[Group]:
        async with self.db_pool.acquire() as conn:
            cur = await conn.cursor(
                "select id, name, description, terms, currency_symbol, created_at "
                "from grp "
                "join group_membership gm on grp.id = gm.group_id where gm.user_id = $1",
                user_id,
            )
            result = []
            async for group in cur:
                result.append(
                    Group(
                        name=group["name"],
                        description=group["description"],
                        currency_symbol=group["currency_symbol"],
                        terms=group["terms"],
                        created_at=group["created_at"],
                    )
                )

            return result

    @require_group_permissions
    def get_group(self, user_id: int, group_id: int) -> Group:
        if (
            user_id not in self.user_to_groups
            or group_id not in self.user_to_groups[user_id]
        ):
            raise PermissionError

        return self.repository.get(group_id)

    def preview_group(self, group_id: int, invite_token) -> Group:
        group: Group = self.repository.get(group_id)

        if group.is_invite_token_valid(invite_token):
            return group

        raise PermissionError

    @require_group_permissions
    def list_members(self, user_id: int, group_id: int) -> list[GroupMember]:
        if (
            user_id not in self.user_to_groups
            or group_id not in self.user_to_groups[user_id]
        ):
            raise PermissionError

        return [
            self.repository.get(member_id)
            for member_id in self.group_to_users.get(group_id, set())
        ]
