from datetime import datetime

from abrechnung.application import Application, require_group_permissions, NotFoundError
from abrechnung.domain.groups import Group, GroupMember, GroupPreview


class GroupService(Application):
    async def create_group(
        self,
        user_id: int,
        name: str,
        description: str,
        currency_symbol: str,
        terms: str,
    ) -> int:
        async with self.db_pool.acquire() as conn:
            async with conn.transaction():
                group_id = await conn.fetchval(
                    "insert into grp (name, description, currency_symbol, terms) "
                    "values ($1, $2, $3, $4) returning id",
                    name,
                    description,
                    currency_symbol,
                    terms,
                )
                await conn.execute(
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
    async def create_invite(
        self,
        user_id: int,
        group_id: int,
        description: str,
        single_use: bool,
        valid_until: datetime,
    ):
        async with self.db_pool.acquire() as conn:
            async with conn.transaction():
                await conn.execute(
                    "insert into group_invite(group_id, description, created_by, valid_until, single_use)"
                    " values ($1, $2, $3, $4, $5)",
                    group_id,
                    description,
                    user_id,
                    valid_until,
                    single_use,
                )

    @require_group_permissions(can_write=True)
    async def delete_invite(
        self,
        user_id: int,
        group_id: int,
        invite_id: int,
    ):
        async with self.db_pool.acquire() as conn:
            async with conn.transaction():
                await conn.execute(
                    "delete from group_invite where id = $1 and group_id = $2",
                    invite_id,
                    group_id,
                )

    async def join_group(self, user_id: int, group_id: int, invite_token: str):
        pass

    async def list_groups(self, user_id: int) -> list[Group]:
        async with self.db_pool.acquire() as conn:
            async with conn.transaction():
                cur = conn.cursor(
                    "select grp.id, grp.name, grp.description, grp.terms, grp.currency_symbol, grp.created_at, "
                    "grp.created_by "
                    "from grp "
                    "join group_membership gm on grp.id = gm.group_id where gm.user_id = $1",
                    user_id,
                )
                result = []
                async for group in cur:
                    result.append(
                        Group(
                            id=group["id"],
                            name=group["name"],
                            description=group["description"],
                            currency_symbol=group["currency_symbol"],
                            terms=group["terms"],
                            created_at=group["created_at"],
                            created_by=group["created_by"],
                        )
                    )

            return result

    @require_group_permissions()
    async def get_group(self, user_id: int, group_id: int) -> Group:
        async with self.db_pool.acquire() as conn:
            group = await conn.fetchrow(
                "select id, name, description, terms, currency_symbol, created_at, created_by "
                "from grp "
                "where grp.id = $1",
                group_id,
            )
            if not group:
                raise NotFoundError(f"Group with id {group_id} does not exist")

            return Group(
                id=group["id"],
                name=group["name"],
                description=group["description"],
                currency_symbol=group["currency_symbol"],
                terms=group["terms"],
                created_at=group["created_at"],
                created_by=group["created_by"],
            )

    async def preview_group(self, group_id: int, invite_token: str) -> GroupPreview:
        async with self.db_pool.acquire() as conn:
            group = await conn.fetchrow(
                "select grp.id as group_id, "
                "grp.name, grp.description, grp.terms, grp.currency_symbol, grp.created_at, "
                "inv.description as invite_description, inv.valid_until as invite_valid_until, "
                "inv.single_use as invite_single_use "
                "from grp "
                "join group_invite inv on grp.id = inv.group_id "
                "where grp.id = $1 and inv.token = $2",
                group_id,
                invite_token,
            )
            if not group:
                raise PermissionError(f"invalid invite token to preview group")

            return GroupPreview(
                id=group["group_id"],
                name=group["name"],
                description=group["description"],
                terms=group["terms"],
                currency_symbol=group["currency_symbol"],
                created_at=group["created_at"],
                invite_description=group["invite_description"],
                invite_valid_until=group["invite_valid_until"],
                invite_single_use=group["invite_single_use"],
            )

    @require_group_permissions()
    async def list_members(self, user_id: int, group_id: int) -> list[GroupMember]:
        async with self.db_pool.acquire() as conn:
            async with conn.transaction():
                cur = conn.cursor(
                    "select usr.id, usr.username, gm.is_owner, gm.can_write, gm.description, gm.invited_by, gm.joined_at "
                    "from usr "
                    "join group_membership gm on gm.user_id = usr.id "
                    "where gm.group_id = $1",
                    group_id,
                )
                result = []
                async for group in cur:
                    result.append(
                        GroupMember(
                            user_id=group["id"],
                            username=group["username"],
                            is_owner=group["is_owner"],
                            can_write=group["can_write"],
                            invited_by=group["invited_by"],
                            joined_at=group["joined_at"],
                            description=group["description"],
                        )
                    )
                return result
