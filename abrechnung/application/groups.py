from datetime import datetime

import asyncpg

from abrechnung.core.auth import check_group_permissions, create_group_log
from abrechnung.core.errors import InvalidCommand, NotFoundError
from abrechnung.core.service import Service
from abrechnung.domain.accounts import AccountType
from abrechnung.domain.groups import (
    Group,
    GroupInvite,
    GroupLog,
    GroupMember,
    GroupPreview,
)
from abrechnung.domain.users import User
from abrechnung.framework.database import Connection
from abrechnung.framework.decorators import with_db_transaction


class GroupService(Service):
    @with_db_transaction
    async def create_group(
            self,
            *,
            conn: Connection,
            user: User,
            name: str,
            description: str,
            currency_symbol: str,
            add_user_account_on_join: bool,
            terms: str,
    ) -> int:
        if user.is_guest_user:
            raise PermissionError(f"guest users are not allowed to create group new groups")

        group_id = await conn.fetchval(
            "insert into grp (name, description, currency_symbol, terms, add_user_account_on_join, created_by) "
            "values ($1, $2, $3, $4, $5, $6) returning id",
            name,
            description,
            currency_symbol,
            terms,
            add_user_account_on_join,
            user.id,
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
            await self._create_user_account(conn=conn, group_id=group_id, user=user)

        await create_group_log(conn=conn, group_id=group_id, user=user, type="group-created")
        await create_group_log(
            conn=conn,
            group_id=group_id,
            user=user,
            type="member-joined",
            affected_user_id=user.id,
        )

        return group_id

    @with_db_transaction
    async def create_invite(
            self,
            *,
            conn: Connection,
            user: User,
            group_id: int,
            description: str,
            single_use: bool,
            join_as_editor: bool,
            valid_until: datetime,
    ) -> int:
        if user.is_guest_user:
            raise PermissionError(f"guest users are not allowed to create group invites")

        await check_group_permissions(conn=conn, group_id=group_id, user=user, can_write=True)
        await create_group_log(conn=conn, group_id=group_id, user=user, type="invite-created")
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

    @with_db_transaction
    async def delete_invite(
            self,
            *,
            conn: Connection,
            user: User,
            group_id: int,
            invite_id: int,
    ):
        await check_group_permissions(conn=conn, group_id=group_id, user=user, can_write=True)
        deleted_id = await conn.fetchval(
            "delete from group_invite where id = $1 and group_id = $2 returning id",
            invite_id,
            group_id,
        )
        if not deleted_id:
            raise NotFoundError(f"No invite with the given id exists")
        await create_group_log(conn=conn, group_id=group_id, user=user, type="invite-deleted")

    async def _create_user_account(self, conn: asyncpg.Connection, group_id: int, user: User) -> int:
        account_id = await conn.fetchval(
            "insert into account (group_id, type) values ($1, $2) returning id",
            group_id,
            AccountType.personal.value,
        )
        revision_id = await conn.fetchval(
            "insert into account_revision (user_id, account_id) values ($1, $2) returning id",
            user.id,
            account_id,
        )

        await conn.execute(
            "insert into account_history (id, revision_id, name, description, owning_user_id) "
            "values ($1, $2, $3, $4, $5)",
            account_id,
            revision_id,
            user.username,
            "",
            user.id,
        )
        return account_id

    @with_db_transaction
    async def join_group(self, *, conn: Connection, user: User, invite_token: str) -> int:
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

        user_is_already_member = await conn.fetchval(
            "select exists (select user_id from group_membership where user_id = $1 and group_id = $2)", user.id,
            invite["group_id"])
        if user_is_already_member:
            raise InvalidCommand(f"User is already a member of this group")

        await conn.execute(
            "insert into group_membership (user_id, group_id, invited_by, can_write, is_owner) "
            "values ($1, $2, $3, $4, false)",
            user.id,
            invite["group_id"],
            invite["created_by"],
            invite["join_as_editor"],
        )

        if group["add_user_account_on_join"]:
            await self._create_user_account(conn=conn, group_id=group["id"], user=user)

        await create_group_log(
            conn=conn,
            group_id=invite["group_id"],
            user=user,
            type="member-joined",
            affected_user_id=user.id,
        )

        if invite["single_use"]:
            await conn.execute("delete from group_invite where id = $1", invite["id"])
        return group["id"]

    @with_db_transaction
    async def list_groups(self, *, conn: Connection, user: User) -> list[Group]:
        return await conn.fetch_many(
            Group,
            "select grp.id, grp.name, grp.description, grp.terms, grp.currency_symbol, grp.created_at, "
            "grp.created_by, grp.add_user_account_on_join "
            "from grp "
            "join group_membership gm on grp.id = gm.group_id where gm.user_id = $1",
            user.id,
        )

    @with_db_transaction
    async def get_group(self, *, conn: Connection, user: User, group_id: int) -> Group:
        await check_group_permissions(conn=conn, group_id=group_id, user=user)
        return await conn.fetch_one(
            Group,
            "select id, name, description, terms, currency_symbol, created_at, created_by, add_user_account_on_join "
            "from grp "
            "where grp.id = $1",
            group_id,
        )

    @with_db_transaction
    async def update_group(
            self,
            *,
            conn: Connection,
            user: User,
            group_id: int,
            name: str,
            description: str,
            currency_symbol: str,
            add_user_account_on_join: bool,
            terms: str,
    ):
        await check_group_permissions(conn=conn, group_id=group_id, user=user, is_owner=True)
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
        await create_group_log(conn=conn, group_id=group_id, user=user, type="group-updated")

    @with_db_transaction
    async def update_member_permissions(
            self,
            *,
            conn: Connection,
            user: User,
            group_id: int,
            member_id: int,
            can_write: bool,
            is_owner: bool,
    ):
        if user.id == member_id:
            raise InvalidCommand(f"group members cannot modify their own privileges")

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

        if membership["is_owner"] == is_owner and membership["can_write"] == can_write:  # no changes
            return

        if is_owner and not user_is_owner:
            raise PermissionError(f"group members cannot promote others to owner without being an owner")

        if membership["is_owner"]:
            raise PermissionError(f"group owners cannot be demoted by other group members")

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

    @with_db_transaction
    async def delete_group(self, *, conn: Connection, user: User, group_id: int):
        await check_group_permissions(conn=conn, group_id=group_id, user=user, is_owner=True)

        n_members = await conn.fetchval(
            "select count(user_id) from group_membership gm where gm.group_id = $1",
            group_id,
        )
        if n_members != 1:
            raise PermissionError(f"Can only delete a group when you are the last member")

        await conn.execute("delete from grp where id = $1", group_id)

    @with_db_transaction
    async def leave_group(self, *, conn: Connection, user: User, group_id: int):
        await check_group_permissions(conn=conn, group_id=group_id, user=user)

        n_members = await conn.fetchval(
            "select count(user_id) from group_membership gm where gm.group_id = $1",
            group_id,
        )
        if n_members == 1:  # our user is the last member -> delete the group, membership will be cascaded
            await conn.execute("delete from grp where id = $1", group_id)
        else:
            await conn.execute(
                "delete from group_membership gm where gm.group_id = $1 and gm.user_id = $2",
                group_id,
                user.id,
            )

    @with_db_transaction
    async def preview_group(self, *, conn: Connection, invite_token: str) -> GroupPreview:
        group = await conn.fetch_maybe_one(
            GroupPreview,
            "select grp.id, "
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

        return group

    @with_db_transaction
    async def list_invites(self, *, conn: Connection, user: User, group_id: int) -> list[GroupInvite]:
        await check_group_permissions(conn=conn, group_id=group_id, user=user)
        return await conn.fetch_many(
            GroupInvite,
            "select id, case when created_by = $1 then token::text else null end as token, description, created_by, "
            "valid_until, single_use, join_as_editor "
            "from group_invite gi "
            "where gi.group_id = $2",
            user.id,
            group_id,
        )

    @with_db_transaction
    async def get_invite(self, *, conn: Connection, user: User, group_id: int, invite_id: int) -> GroupInvite:
        await check_group_permissions(conn=conn, group_id=group_id, user=user)
        return await conn.fetch_one(
            GroupInvite,
            "select id, case when created_by = $1 then token::text else null end as token, description, created_by, "
            "valid_until, single_use, join_as_editor "
            "from group_invite gi "
            "where gi.group_id = $2 and id = $3",
            user.id,
            group_id,
            invite_id,
        )

    @with_db_transaction
    async def list_members(self, *, conn: Connection, user: User, group_id: int) -> list[GroupMember]:
        await check_group_permissions(conn=conn, group_id=group_id, user=user)
        return await conn.fetch_many(
            GroupMember,
            "select usr.id as user_id, usr.username, gm.is_owner, gm.can_write, gm.description, "
            "gm.invited_by, gm.joined_at "
            "from usr "
            "join group_membership gm on gm.user_id = usr.id "
            "where gm.group_id = $1",
            group_id,
        )

    @with_db_transaction
    async def get_member(self, *, conn: Connection, user: User, group_id: int, member_id: int) -> GroupMember:
        await check_group_permissions(conn=conn, group_id=group_id, user=user)
        return await conn.fetch_one(
            GroupMember,
            "select usr.id as user_id, usr.username, gm.is_owner, gm.can_write, gm.description, "
            "gm.invited_by, gm.joined_at "
            "from usr "
            "join group_membership gm on gm.user_id = usr.id "
            "where gm.group_id = $1 and gm.user_id = $2",
            group_id,
            member_id,
        )

    @with_db_transaction
    async def list_log(self, *, conn: Connection, user: User, group_id: int) -> list[GroupLog]:
        await check_group_permissions(conn=conn, group_id=group_id, user=user)
        return await conn.fetch_many(
            GroupLog,
            "select id, user_id, logged_at, type, message, affected " "from group_log " "where group_id = $1",
            group_id,
        )

    @with_db_transaction
    async def send_group_message(self, *, conn: Connection, user: User, group_id: int, message: str):
        await check_group_permissions(conn=conn, group_id=group_id, user=user, can_write=True)
        await conn.execute(
            "insert into group_log (group_id, user_id, type, message) " "values ($1, $2, 'text-message', $3)",
            group_id,
            user.id,
            message,
        )
