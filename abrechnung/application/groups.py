from datetime import datetime

import asyncpg

from abrechnung.application import (
    Application,
    NotFoundError,
    check_group_permissions,
    InvalidCommand,
    create_group_log,
)
from abrechnung.domain.accounts import AccountType
from abrechnung.domain.groups import (
    Group,
    GroupMember,
    GroupPreview,
    GroupInvite,
    GroupLog,
)
from abrechnung.domain.users import User


class GroupService(Application):
    async def create_group(
        self,
        *,
        user: User,
        name: str,
        description: str,
        currency_symbol: str,
        add_user_account_on_join: bool,
        terms: str,
    ) -> int:
        if user.is_guest_user:
            raise PermissionError(
                f"guest users are not allowed to create group new groups"
            )

        async with self.db_pool.acquire() as conn:
            async with conn.transaction():
                group_id = await conn.fetchval(
                    "insert into grp (name, description, currency_symbol, terms, add_user_account_on_join) "
                    "values ($1, $2, $3, $4, $5) returning id",
                    name,
                    description,
                    currency_symbol,
                    terms,
                    add_user_account_on_join,
                )
                await conn.execute(
                    "insert into group_membership (user_id, group_id, is_owner, can_write, description) "
                    "values ($1, $2, $3, $4, $5)",
                    user.id,
                    group_id,
                    True,
                    True,
                    "group founder",
                )

                if add_user_account_on_join:
                    await self._create_user_account(
                        conn=conn, group_id=group_id, user=user
                    )

                await create_group_log(
                    conn=conn, group_id=group_id, user=user, type="group-created"
                )
                await create_group_log(
                    conn=conn,
                    group_id=group_id,
                    user=user,
                    type="member-joined",
                    affected_user_id=user.id,
                )

                return group_id

    async def create_invite(
        self,
        *,
        user: User,
        group_id: int,
        description: str,
        single_use: bool,
        join_as_editor: bool,
        valid_until: datetime,
    ) -> int:
        if user.is_guest_user:
            raise PermissionError(
                f"guest users are not allowed to create group invites"
            )

        async with self.db_pool.acquire() as conn:
            async with conn.transaction():
                await check_group_permissions(
                    conn=conn, group_id=group_id, user=user, can_write=True
                )
                await create_group_log(
                    conn=conn, group_id=group_id, user=user, type="invite-created"
                )
                return await conn.fetchval(
                    "insert into group_invite(group_id, description, created_by, valid_until, single_use, join_as_editor)"
                    " values ($1, $2, $3, $4, $5, $6) returning id",
                    group_id,
                    description,
                    user.id,
                    valid_until,
                    single_use,
                    join_as_editor,
                )

    async def delete_invite(
        self,
        *,
        user: User,
        group_id: int,
        invite_id: int,
    ):
        async with self.db_pool.acquire() as conn:
            async with conn.transaction():
                await check_group_permissions(
                    conn=conn, group_id=group_id, user=user, can_write=True
                )
                deleted_id = await conn.fetchval(
                    "delete from group_invite where id = $1 and group_id = $2 returning id",
                    invite_id,
                    group_id,
                )
                if not deleted_id:
                    raise NotFoundError(f"No invite with the given id exists")
                await create_group_log(
                    conn=conn, group_id=group_id, user=user, type="invite-deleted"
                )

    async def _create_user_account(
        self, conn: asyncpg.Connection, group_id: int, user: User
    ) -> int:
        account_id = await conn.fetchval(
            "insert into account (group_id, type) values ($1, $2) returning id",
            group_id,
            AccountType.personal.value,
        )
        revision_id = await conn.fetchval(
            "insert into account_revision (user_id, account_id, committed) values ($1, $2, now()) returning id",
            user.id,
            account_id,
        )

        await conn.execute(
            "insert into account_history (id, revision_id, name, description, owning_user_id, priority) "
            "values ($1, $2, $3, $4, $5, $6)",
            account_id,
            revision_id,
            user.username,
            "",
            user.id,
            0,
        )
        return account_id

    async def join_group(self, user: User, invite_token: str):
        async with self.db_pool.acquire() as conn:
            async with conn.transaction():
                invite = await conn.fetchrow(
                    "select id, group_id, created_by, single_use, join_as_editor from group_invite gi "
                    "where gi.token = $1 and gi.valid_until > now()",
                    invite_token,
                )
                if not invite:
                    raise PermissionError(f"Invalid invite token")

                group = await conn.fetchrow(
                    "select id, add_user_account_on_join from grp " "where grp.id = $1",
                    invite["group_id"],
                )
                if not group:
                    raise PermissionError(f"Invalid invite token")

                await conn.execute(
                    "insert into group_membership (user_id, group_id, invited_by, can_write, is_owner) "
                    "values ($1, $2, $3, $4, false)",
                    user.id,
                    invite["group_id"],
                    invite["created_by"],
                    invite["join_as_editor"],
                )

                if group["add_user_account_on_join"]:
                    await self._create_user_account(
                        conn=conn, group_id=group["id"], user=user
                    )

                await create_group_log(
                    conn=conn,
                    group_id=invite["group_id"],
                    user=user,
                    type="member-joined",
                    affected_user_id=user.id,
                )

                if invite["single_use"]:
                    await conn.execute(
                        "delete from group_invite where id = $1", invite["id"]
                    )

    async def list_groups(self, user: User) -> list[Group]:
        async with self.db_pool.acquire() as conn:
            async with conn.transaction():
                cur = conn.cursor(
                    "select grp.id, grp.name, grp.description, grp.terms, grp.currency_symbol, grp.created_at, "
                    "grp.created_by, grp.add_user_account_on_join "
                    "from grp "
                    "join group_membership gm on grp.id = gm.group_id where gm.user_id = $1",
                    user.id,
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
                            add_user_account_on_join=group["add_user_account_on_join"],
                        )
                    )

            return result

    async def get_group(self, *, user: User, group_id: int) -> Group:
        async with self.db_pool.acquire() as conn:
            await check_group_permissions(conn=conn, group_id=group_id, user=user)
            group = await conn.fetchrow(
                "select id, name, description, terms, currency_symbol, created_at, created_by, add_user_account_on_join "
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
                add_user_account_on_join=group["add_user_account_on_join"],
            )

    async def update_group(
        self,
        *,
        user: User,
        group_id: int,
        name: str,
        description: str,
        currency_symbol: str,
        add_user_account_on_join: bool,
        terms: str,
    ):
        async with self.db_pool.acquire() as conn:
            async with conn.transaction():
                await check_group_permissions(
                    conn=conn, group_id=group_id, user=user, is_owner=True
                )
                await conn.execute(
                    "update grp set name = $2, description = $3, currency_symbol = $4, terms = $5, add_user_account_on_join = $6 "
                    "where grp.id = $1",
                    group_id,
                    name,
                    description,
                    currency_symbol,
                    terms,
                    add_user_account_on_join,
                )
                await create_group_log(
                    conn=conn, group_id=group_id, user=user, type="group-updated"
                )

    async def update_member_permissions(
        self,
        *,
        user: User,
        group_id: int,
        member_id: int,
        can_write: bool,
        is_owner: bool,
    ):
        async with self.db_pool.acquire() as conn:
            async with conn.transaction():
                if user.id == member_id:
                    raise InvalidCommand(
                        f"group members cannot modify their own privileges"
                    )

                # not possible to have an owner without can_write
                can_write = can_write if not is_owner else True

                user_can_write, user_is_owner = await check_group_permissions(
                    conn=conn, group_id=group_id, user=user, can_write=True
                )
                membership = await conn.fetchrow(
                    "select is_owner, can_write from group_membership where group_id = $1 and user_id = $2",
                    group_id,
                    member_id,
                )
                if membership is None:
                    raise NotFoundError(f"member with id {member_id} does not exist")

                if (
                    membership["is_owner"] == is_owner
                    and membership["can_write"] == can_write
                ):  # no changes
                    return

                if is_owner and not user_is_owner:
                    raise PermissionError(
                        f"group members cannot promote others to owner without being an owner"
                    )

                if membership["is_owner"]:
                    raise PermissionError(
                        f"group owners cannot be demoted by other group members"
                    )

                if is_owner:
                    await create_group_log(
                        conn=conn,
                        group_id=group_id,
                        user=user,
                        type="owner-granted",
                        affected_user_id=member_id,
                    )
                elif can_write:
                    if membership["is_owner"]:
                        await create_group_log(
                            conn=conn,
                            group_id=group_id,
                            user=user,
                            type="owner-revoked",
                            affected_user_id=member_id,
                        )
                    else:
                        await create_group_log(
                            conn=conn,
                            group_id=group_id,
                            user=user,
                            type="write-granted",
                            affected_user_id=member_id,
                        )
                else:
                    if membership["is_owner"]:
                        await create_group_log(
                            conn=conn,
                            group_id=group_id,
                            user=user,
                            type="owner-revoked",
                            affected_user_id=member_id,
                        )
                    await create_group_log(
                        conn=conn,
                        group_id=group_id,
                        user=user,
                        type="write-revoked",
                        affected_user_id=member_id,
                    )

                await conn.execute(
                    "update group_membership gm set can_write = $3, is_owner = $4 "
                    "where gm.user_id = $1 and gm.group_id = $2",
                    member_id,
                    group_id,
                    can_write,
                    is_owner,
                )

    async def delete_group(self, *, user: User, group_id: int):
        async with self.db_pool.acquire() as conn:
            async with conn.transaction():
                await check_group_permissions(
                    conn=conn, group_id=group_id, user=user, is_owner=True
                )

                n_members = await conn.fetchval(
                    "select count(user_id) from group_membership gm where gm.group_id = $1",
                    group_id,
                )
                if n_members != 1:
                    raise PermissionError(
                        f"Can only delete a group when you are the last member"
                    )

                await conn.execute("delete from grp where id = $1", group_id)

    async def leave_group(self, *, user: User, group_id: int):
        async with self.db_pool.acquire() as conn:
            async with conn.transaction():
                await check_group_permissions(conn=conn, group_id=group_id, user=user)

                n_members = await conn.fetchval(
                    "select count(user_id) from group_membership gm where gm.group_id = $1",
                    group_id,
                )
                if (
                    n_members == 1
                ):  # our user is the last member -> delete the group, membership will be cascaded
                    await conn.execute("delete from grp where id = $1", group_id)
                else:
                    await conn.execute(
                        "delete from group_membership gm where gm.group_id = $1 and gm.user_id = $2",
                        group_id,
                        user.id,
                    )

    async def preview_group(self, invite_token: str) -> GroupPreview:
        async with self.db_pool.acquire() as conn:
            group = await conn.fetchrow(
                "select grp.id as group_id, "
                "grp.name, grp.description, grp.terms, grp.currency_symbol, grp.created_at, "
                "inv.description as invite_description, inv.valid_until as invite_valid_until, "
                "inv.single_use as invite_single_use "
                "from grp "
                "join group_invite inv on grp.id = inv.group_id "
                "where inv.token = $1",
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

    async def list_invites(self, *, user: User, group_id: int) -> list[GroupInvite]:
        async with self.db_pool.acquire() as conn:
            async with conn.transaction():
                await check_group_permissions(conn=conn, group_id=group_id, user=user)
                cur = conn.cursor(
                    "select id, case when created_by = $1 then token else null end as token, description, created_by, "
                    "valid_until, single_use, join_as_editor "
                    "from group_invite gi "
                    "where gi.group_id = $2",
                    user.id,
                    group_id,
                )
                result = []
                async for invite in cur:
                    result.append(
                        GroupInvite(
                            id=invite["id"],
                            token=invite["token"],
                            created_by=invite["created_by"],
                            valid_until=invite["valid_until"],
                            single_use=invite["single_use"],
                            description=invite["description"],
                            join_as_editor=invite["join_as_editor"],
                        )
                    )
                return result

    async def list_members(self, *, user: User, group_id: int) -> list[GroupMember]:
        async with self.db_pool.acquire() as conn:
            async with conn.transaction():
                await check_group_permissions(conn=conn, group_id=group_id, user=user)
                cur = conn.cursor(
                    "select usr.id, usr.username, gm.is_owner, gm.can_write, gm.description, "
                    "gm.invited_by, gm.joined_at "
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

    async def list_log(self, *, user: User, group_id: int) -> list[GroupLog]:
        async with self.db_pool.acquire() as conn:
            async with conn.transaction():
                await check_group_permissions(conn=conn, group_id=group_id, user=user)
                cur = conn.cursor(
                    "select id, user_id, logged_at, type, message, affected "
                    "from group_log "
                    "where group_id = $1",
                    group_id,
                )

                result = []
                async for log in cur:
                    result.append(
                        GroupLog(
                            id=log["id"],
                            user_id=log["user_id"],
                            logged_at=log["logged_at"],
                            type=log["type"],
                            message=log["message"],
                            affected=log["affected"],
                        )
                    )
                return result

    async def send_group_message(self, *, user: User, group_id: int, message: str):
        async with self.db_pool.acquire() as conn:
            async with conn.transaction():
                await check_group_permissions(
                    conn=conn, group_id=group_id, user=user, can_write=True
                )
                await conn.execute(
                    "insert into group_log (group_id, user_id, type, message) "
                    "values ($1, $2, 'text-message', $3)",
                    group_id,
                    user.id,
                    message,
                )
