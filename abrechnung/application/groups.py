from datetime import datetime, timedelta

import asyncpg
from sftkit.database import Connection
from sftkit.error import AccessDenied, InvalidArgument
from sftkit.service import Service, with_db_connection, with_db_transaction

from abrechnung.config import Config
from abrechnung.core.auth import create_group_log
from abrechnung.core.decorators import (
    requires_group_permissions,
    with_group_last_changed_update,
)
from abrechnung.domain.accounts import AccountType
from abrechnung.domain.groups import (
    Group,
    GroupInvite,
    GroupLog,
    GroupMember,
    GroupPreview,
)
from abrechnung.domain.users import User
from abrechnung.util import timed_cache


class GroupService(Service[Config]):
    @with_db_transaction
    async def create_group(
        self,
        *,
        conn: Connection,
        user: User,
        name: str,
        description: str,
        currency_identifier: str,
        add_user_account_on_join: bool,
        terms: str,
    ) -> int:
        if user.is_guest_user:
            raise AccessDenied("guest users are not allowed to create group new groups")

        group_id = await conn.fetchval(
            "insert into grp (name, description, currency_identifier, terms, add_user_account_on_join, created_by) "
            "values ($1, $2, $3, $4, $5, $6) returning id",
            name,
            description,
            currency_identifier,
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
    @requires_group_permissions(requires_write=True)
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
            raise AccessDenied("guest users are not allowed to create group invites")

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
    @requires_group_permissions(requires_write=True)
    async def delete_invite(
        self,
        *,
        conn: Connection,
        user: User,
        group_id: int,
        invite_id: int,
    ):
        deleted_id = await conn.fetchval(
            "delete from group_invite where id = $1 and group_id = $2 returning id",
            invite_id,
            group_id,
        )
        if not deleted_id:
            raise InvalidArgument("No invite with the given id exists")
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
            "insert into account_history (id, revision_id, name, description) values ($1, $2, $3, $4)",
            account_id,
            revision_id,
            user.username,
            "",
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
            raise AccessDenied("Invalid invite token")

        group = await conn.fetchrow(
            "select id, add_user_account_on_join from grp where grp.id = $1",
            invite["group_id"],
        )
        if not group:
            raise AccessDenied("Invalid invite token")

        user_is_already_member = await conn.fetchval(
            "select exists (select user_id from group_membership where user_id = $1 and group_id = $2)",
            user.id,
            invite["group_id"],
        )
        if user_is_already_member:
            raise InvalidArgument("User is already a member of this group")

        account_id = None
        if group["add_user_account_on_join"]:
            account_id = await self._create_user_account(conn=conn, group_id=group["id"], user=user)

        await conn.execute(
            "insert into group_membership (user_id, group_id, invited_by, can_write, is_owner, owned_account_id) "
            "values ($1, $2, $3, $4, false, $5)",
            user.id,
            invite["group_id"],
            invite["created_by"],
            invite["join_as_editor"],
            account_id,
        )

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
            "select g.*, gm.is_owner, gm.can_write, gm.owned_account_id from grp as g join group_membership gm on g.id = gm.group_id "
            "where gm.user_id = $1",
            user.id,
        )

    @with_db_transaction
    @requires_group_permissions()
    async def get_group(self, *, conn: Connection, user: User, group_id: int) -> Group:
        return await conn.fetch_one(
            Group,
            "select g.*, gm.is_owner, gm.can_write, gm.owned_account_id from grp as g join group_membership gm on g.id = gm.group_id "
            "where g.id = $1 and gm.user_id = $2",
            group_id,
            user.id,
        )

    @with_db_transaction
    @requires_group_permissions(requires_owner=True)
    @with_group_last_changed_update
    async def update_group(
        self,
        *,
        conn: Connection,
        user: User,
        group_id: int,
        name: str,
        description: str,
        add_user_account_on_join: bool,
        terms: str,
    ):
        await conn.execute(
            "update grp set name = $2, description = $3, terms = $4, add_user_account_on_join = $5 where grp.id = $1",
            group_id,
            name,
            description,
            terms,
            add_user_account_on_join,
        )
        await create_group_log(conn=conn, group_id=group_id, user=user, type="group-updated")

    @with_db_transaction
    @requires_group_permissions(requires_write=True)
    async def update_member_permissions(
        self,
        *,
        conn: Connection,
        user: User,
        group_membership: GroupMember,
        group_id: int,
        member_id: int,
        can_write: bool,
        is_owner: bool,
    ):
        if user.id == member_id:
            raise InvalidArgument("group members cannot modify their own privileges")

        # not possible to have an owner without can_write
        can_write = can_write if not is_owner else True

        membership = await conn.fetchrow(
            "select is_owner, can_write from group_membership where group_id = $1 and user_id = $2",
            group_id,
            member_id,
        )
        if membership is None:
            raise InvalidArgument(f"member with id {member_id} does not exist")

        if membership["is_owner"] == is_owner and membership["can_write"] == can_write:  # no changes
            return

        if is_owner and not group_membership.is_owner:
            raise AccessDenied("group members cannot promote others to owner without being an owner")

        if membership["is_owner"]:
            raise AccessDenied("group owners cannot be demoted by other group members")

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
            "update group_membership gm set can_write = $3, is_owner = $4 where gm.user_id = $1 and gm.group_id = $2",
            member_id,
            group_id,
            can_write,
            is_owner,
        )

    @with_db_transaction
    @requires_group_permissions()
    async def update_member_owned_account(
        self,
        *,
        conn: Connection,
        user: User,
        group_membership: GroupMember,
        group_id: int,
        member_id: int,
        owned_account_id: int | None,
    ):
        if user.id != member_id and not group_membership.is_owner:
            raise InvalidArgument("Only group owners can change the owned accounts for members other than themselves")

        membership = await conn.fetchrow(
            "select owned_account_id from group_membership where group_id = $1 and user_id = $2",
            group_id,
            member_id,
        )
        if membership is None:
            raise InvalidArgument(f"member with id {member_id} does not exist")

        if membership["owned_account_id"] == owned_account_id:  # no changes
            return

        await conn.execute(
            "update group_membership gm set owned_account_id = $3 where gm.user_id = $1 and gm.group_id = $2",
            member_id,
            group_id,
            owned_account_id,
        )

    @with_db_transaction
    @requires_group_permissions(requires_owner=True)
    async def delete_group(self, *, conn: Connection, user: User, group_id: int):
        n_members = await conn.fetchval(
            "select count(user_id) from group_membership gm where gm.group_id = $1",
            group_id,
        )
        if n_members != 1:
            raise InvalidArgument("Can only delete a group when you are the last member")

        await conn.execute("delete from grp where id = $1", group_id)

    @with_db_transaction
    @requires_group_permissions()
    async def leave_group(self, *, conn: Connection, user: User, group_id: int):
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
    async def preview_group(self, *, conn: Connection, user: User | None, invite_token: str) -> GroupPreview:
        group = await conn.fetch_maybe_one(
            GroupPreview,
            "select grp.id, "
            "grp.name, grp.description, grp.terms, grp.currency_identifier, grp.created_at, "
            "inv.description as invite_description, inv.valid_until as invite_valid_until, "
            "inv.single_use as invite_single_use, false as is_already_member "
            "from grp "
            "join group_invite inv on grp.id = inv.group_id "
            "where inv.token = $1",
            invite_token,
        )
        if not group:
            raise AccessDenied("invalid invite token to preview group")

        if user:
            is_member = await conn.fetchval(
                "select exists(select from group_membership where group_id = $1 and user_id = $2)", group.id, user.id
            )
            group.is_already_member = is_member

        return group

    @with_db_transaction
    @requires_group_permissions()
    async def list_invites(self, *, conn: Connection, user: User, group_id: int) -> list[GroupInvite]:
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
    @requires_group_permissions()
    async def get_invite(self, *, conn: Connection, user: User, group_id: int, invite_id: int) -> GroupInvite:
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
    @requires_group_permissions()
    async def list_members(self, *, conn: Connection, user: User, group_id: int) -> list[GroupMember]:
        return await conn.fetch_many(
            GroupMember,
            "select usr.id as user_id, usr.username, gm.is_owner, gm.can_write, gm.description, "
            "gm.invited_by, gm.joined_at, gm.owned_account_id "
            "from usr "
            "join group_membership gm on gm.user_id = usr.id "
            "where gm.group_id = $1",
            group_id,
        )

    @with_db_transaction
    @requires_group_permissions()
    async def get_member(self, *, conn: Connection, user: User, group_id: int, member_id: int) -> GroupMember:
        return await conn.fetch_one(
            GroupMember,
            "select usr.id as user_id, usr.username, gm.is_owner, gm.can_write, gm.description, "
            "gm.invited_by, gm.joined_at, gm.owned_account_id "
            "from usr "
            "join group_membership gm on gm.user_id = usr.id "
            "where gm.group_id = $1 and gm.user_id = $2",
            group_id,
            member_id,
        )

    @with_db_transaction
    @requires_group_permissions()
    async def list_log(self, *, conn: Connection, user: User, group_id: int) -> list[GroupLog]:
        return await conn.fetch_many(
            GroupLog,
            "select id, user_id, logged_at, type, message, affected from group_log where group_id = $1",
            group_id,
        )

    @with_db_transaction
    @requires_group_permissions(requires_write=True)
    @with_group_last_changed_update
    async def send_group_message(self, *, conn: Connection, user: User, group_id: int, message: str):
        await conn.execute(
            "insert into group_log (group_id, user_id, type, message) values ($1, $2, 'text-message', $3)",
            group_id,
            user.id,
            message,
        )

    @with_db_transaction
    @requires_group_permissions(requires_owner=True)
    @with_group_last_changed_update
    async def archive_group(self, *, conn: Connection, user: User, group_id: int):
        await conn.execute(
            "update grp set archived = true where id = $1",
            group_id,
        )

    @with_db_transaction
    @requires_group_permissions(requires_owner=True)
    @with_group_last_changed_update
    async def unarchive_group(self, *, conn: Connection, user: User, group_id: int):
        await conn.execute(
            "update grp set archived = false where id = $1",
            group_id,
        )

    @with_db_connection
    @timed_cache(timedelta(minutes=5))
    async def total_number_of_groups(self, conn: Connection):
        return await conn.fetchval("select count(*) from grp")
