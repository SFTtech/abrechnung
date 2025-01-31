from typing import Optional, Union

import asyncpg
from sftkit.database import Connection
from sftkit.error import InvalidArgument
from sftkit.service import Service, with_db_connection, with_db_transaction

from abrechnung.config import Config
from abrechnung.core.auth import check_group_permissions, create_group_log
from abrechnung.core.decorators import (
    requires_group_permissions,
    with_group_last_changed_update,
)
from abrechnung.domain.accounts import (
    Account,
    AccountType,
    ClearingAccount,
    NewAccount,
    PersonalAccount,
)
from abrechnung.domain.groups import GroupMember
from abrechnung.domain.users import User

from .common import _get_or_create_tag_ids


class AccountService(Service[Config]):
    @staticmethod
    async def _commit_revision(conn: asyncpg.Connection, revision_id: int):
        """Touches a revision to have all associated constraints run"""
        await conn.execute("update account_revision set created_at = now() where id = $1", revision_id)

    @staticmethod
    async def _create_revision(conn: asyncpg.Connection, user: User, account_id: int) -> int:
        # create a new transaction revision
        revision_id = await conn.fetchval(
            "insert into account_revision (user_id, account_id) values ($1, $2) returning id",
            user.id,
            account_id,
        )
        return revision_id

    @staticmethod
    async def _check_account_permissions(
        conn: asyncpg.Connection,
        user: User,
        account_id: int,
        can_write: bool = False,
        account_type: Optional[Union[str, list[str]]] = None,
    ) -> tuple[int, str]:
        """returns group id of the transaction"""
        result = await conn.fetchrow(
            "select a.type, a.group_id, can_write, is_owner "
            "from group_membership gm join account a on gm.group_id = a.group_id and gm.user_id = $1 "
            "where a.id = $2",
            user.id,
            account_id,
        )
        if not result:
            raise InvalidArgument("account not found")

        if can_write and not (result["can_write"] or result["is_owner"]):
            raise PermissionError("user does not have write permissions")

        if account_type:
            type_check = [account_type] if isinstance(account_type, str) else account_type
            if result["type"] not in type_check:
                raise InvalidArgument(
                    f"Transaction type {result['type']} does not match the expected type {type_check}"
                )

        return result["group_id"], result["type"]

    async def _get_or_create_pending_account_change(self, conn: asyncpg.Connection, user: User, account_id: int) -> int:
        revision_id = await self._create_revision(conn=conn, user=user, account_id=account_id)

        a = await conn.fetchval(
            "select id from account_history th where revision_id = $1 and id = $2",
            revision_id,
            account_id,
        )
        if a:
            return revision_id

        last_committed_revision = await conn.fetchval(
            "select ar.id "
            "from account_revision ar "
            "   join account_history ah on ar.id = ah.revision_id and ar.account_id = ah.id "
            "where ar.account_id = $1 "
            "order by ar.created_at desc "
            "limit 1",
            account_id,
        )

        if last_committed_revision is None:
            raise InvalidArgument(f"Cannot edit account {account_id} as it has no committed changes.")

        # copy all existing transaction data into a new history entry
        await conn.execute(
            "insert into account_history (id, revision_id, name, description, owning_user_id, date_info, deleted)"
            "select id, $1, name, description, owning_user_id, date_info, deleted "
            "from account_history where id = $2 and revision_id = $3",
            revision_id,
            account_id,
            last_committed_revision,
        )

        # copy all last committed creditor shares
        await conn.execute(
            "insert into clearing_account_share (account_id, revision_id, share_account_id, shares) "
            "select account_id, $1, share_account_id, shares "
            "from clearing_account_share where account_id = $2 and revision_id = $3",
            revision_id,
            account_id,
            last_committed_revision,
        )

        return revision_id

    @staticmethod
    async def _check_account_exists(conn: asyncpg.Connection, group_id: int, account_id: int) -> int:
        acc = await conn.fetchval(
            "select account_id from account_state_valid_at() where group_id = $1 and account_id = $2 and not deleted",
            group_id,
            account_id,
        )
        if not acc:
            raise InvalidArgument(f"Account with id {account_id}")

        return True

    async def _account_clearing_shares_check(
        self,
        conn: asyncpg.Connection,
        user: User,
        account_id: int,
        share_account_id: int,
        account_type: Optional[Union[str, list[str]]] = None,
    ) -> tuple[int, int]:
        """returns tuple of group_id of the account and the users revision_id of the pending change"""
        group_id, _ = await self._check_account_permissions(
            conn=conn,
            user=user,
            account_id=account_id,
            can_write=True,
            account_type=account_type,
        )

        await self._check_account_exists(conn, group_id, share_account_id)

        revision_id = await self._get_or_create_pending_account_change(conn=conn, user=user, account_id=account_id)

        return group_id, revision_id

    @with_db_transaction
    @requires_group_permissions()
    async def list_accounts(self, *, conn: Connection, user: User, group_id: int) -> list[Account]:
        rows = await conn.fetch(
            "select * from full_account_state_valid_at(now()) where group_id = $1",
            group_id,
        )
        return [
            (
                ClearingAccount.model_validate(dict(row))
                if row["type"] == AccountType.clearing.value
                else PersonalAccount.model_validate(dict(row))
            )
            for row in rows
        ]

    @with_db_connection
    @requires_group_permissions()
    async def get_account(self, *, conn: Connection, user: User, account_id: int) -> Account:
        await self._check_account_permissions(conn=conn, user=user, account_id=account_id)
        row = await conn.fetchrow(
            "select * from full_account_state_valid_at(now()) where id = $1",
            account_id,
        )
        if row["type"] == AccountType.clearing.value:
            return ClearingAccount.model_validate(dict(row))
        return PersonalAccount.model_validate(dict(row))

    async def _add_tags_to_revision(
        self,
        *,
        conn: asyncpg.Connection,
        account_id: int,
        revision_id: int,
        tag_ids: list[int],
    ):
        if len(tag_ids) <= 0:
            return
        for tag_id in tag_ids:
            await conn.execute(
                "insert into account_to_tag (account_id, revision_id, tag_id) values ($1, $2, $3)",
                account_id,
                revision_id,
                tag_id,
            )

    @with_db_transaction
    @requires_group_permissions(requires_write=True)
    @with_group_last_changed_update
    async def create_account(
        self,
        *,
        conn: Connection,
        user: User,
        group_id: int,
        account: NewAccount,
        group_membership: GroupMember,
    ) -> int:
        if account.clearing_shares and account.type != AccountType.clearing:
            raise InvalidArgument(
                f"'{account.type.value}' accounts cannot have associated settlement distribution shares"
            )

        if account.owning_user_id is not None:
            if not group_membership.is_owner and account.owning_user_id != user.id:
                raise PermissionError("only group owners can associate others with accounts")

        account_id = await conn.fetchval(
            "insert into account (group_id, type) values ($1, $2) returning id",
            group_id,
            account.type.value,
        )

        revision_id = await self._create_revision(conn, user, account_id)
        await conn.execute(
            "insert into account_history (id, revision_id, name, description, owning_user_id, date_info) "
            "values ($1, $2, $3, $4, $5, $6)",
            account_id,
            revision_id,
            account.name,
            account.description,
            account.owning_user_id,
            account.date_info,
        )

        tag_ids = await _get_or_create_tag_ids(conn=conn, group_id=group_id, tags=account.tags)
        await self._add_tags_to_revision(conn=conn, account_id=account_id, revision_id=revision_id, tag_ids=tag_ids)

        if account.clearing_shares and account.type == AccountType.clearing:
            # TODO: make this more efficient
            for share_account_id, value in account.clearing_shares.items():
                if value == 0:
                    continue
                await self._check_account_exists(conn, group_id, share_account_id)
                await conn.execute(
                    "insert into clearing_account_share (account_id, revision_id, share_account_id, shares) "
                    "values ($1, $2, $3, $4)",
                    account_id,
                    revision_id,
                    share_account_id,
                    value,
                )

        await create_group_log(
            conn=conn,
            group_id=group_id,
            user=user,
            type="account-committed",
            message=f"created account {account.name}",
        )
        await self._commit_revision(conn=conn, revision_id=revision_id)
        return account_id

    @with_db_transaction
    @with_group_last_changed_update
    async def update_account(
        self,
        *,
        conn: Connection,
        user: User,
        account_id: int,
        account: NewAccount,
    ):
        group_id, account_type = await self._check_account_permissions(
            conn=conn, user=user, account_id=account_id, can_write=True
        )
        membership = await check_group_permissions(conn=conn, group_id=group_id, user=user, can_write=True)
        if account.clearing_shares and account_type != AccountType.clearing.value:
            raise InvalidArgument(f"'{account_type}' accounts cannot have associated settlement distribution shares")

        revision_id = await self._create_revision(conn=conn, user=user, account_id=account_id)

        committed_account = await conn.fetchrow(
            "select owning_user_id from account_state_valid_at() where account_id = $1",
            account_id,
        )

        if account.owning_user_id is not None:
            if not membership.is_owner and account.owning_user_id != user.id:
                raise PermissionError("only group owners can associate others with accounts")
        elif (
            committed_account["owning_user_id"] is not None
            and committed_account["owning_user_id"] != user.id
            and not membership.is_owner
        ):
            raise PermissionError("only group owners can remove other users as account owners")

        await conn.execute(
            "insert into account_history (id, revision_id, name, description, owning_user_id, date_info) "
            "values ($1, $2, $3, $4, $5, $6) ",
            account_id,
            revision_id,
            account.name,
            account.description,
            account.owning_user_id,
            account.date_info,
        )
        tag_ids = await _get_or_create_tag_ids(conn=conn, group_id=group_id, tags=account.tags)
        await self._add_tags_to_revision(conn=conn, account_id=account_id, revision_id=revision_id, tag_ids=tag_ids)

        if account.clearing_shares and account_type == AccountType.clearing.value:
            # TODO: make this more efficient
            for share_account_id, value in account.clearing_shares.items():
                if value == 0:
                    continue
                await self._check_account_exists(conn, group_id, share_account_id)
                await conn.execute(
                    "insert into clearing_account_share (account_id, revision_id, share_account_id, shares) "
                    "values ($1, $2, $3, $4)",
                    account_id,
                    revision_id,
                    share_account_id,
                    value,
                )

        await create_group_log(
            conn=conn,
            group_id=group_id,
            user=user,
            type="account-committed",
            message=f"updated account {account.name}",
        )
        await self._commit_revision(conn=conn, revision_id=revision_id)

    @with_db_transaction
    @with_group_last_changed_update
    async def delete_account(
        self,
        *,
        conn: Connection,
        user: User,
        account_id: int,
    ):
        group_id, _ = await self._check_account_permissions(conn=conn, user=user, account_id=account_id, can_write=True)
        row = await conn.fetchrow(
            "select id from account where id = $1",
            account_id,
        )
        if row is None:
            raise InvalidArgument("Account does not exist")

        # TODO: FIXME move this check into the database

        has_shares = await conn.fetchval(
            "select exists (select from transaction_state_valid_at() t "
            "where not deleted and $1 = any(involved_accounts))",
            account_id,
        )

        has_clearing_shares = await conn.fetchval(
            "select exists(select from account_state_valid_at() a where not deleted and $1 = any(involved_accounts))",
            account_id,
        )

        has_usages = await conn.fetchval(
            "select 1 "
            "from transaction_position_state_valid_at() p "
            "join transaction t on t.id = p.transaction_id "
            "where not p.deleted and $1 = any(p.involved_accounts)",
            account_id,
        )

        if has_shares or has_usages:
            raise InvalidArgument("Cannot delete an account that is references by a transaction")

        if has_clearing_shares:
            raise InvalidArgument("Cannot delete an account that is references by a clearing account")

        row = await conn.fetchrow(
            "select name, revision_id, deleted from account_state_valid_at() where account_id = $1",
            account_id,
        )
        if row is None:
            raise InvalidArgument("Cannot delete an account without any committed changes")

        if row["deleted"]:
            raise InvalidArgument("Cannot delete an already deleted account")

        has_clearing_shares = await conn.fetchval(
            "select exists (select from account_state_valid_at() p where not p.deleted and $1 = any(p.involved_accounts))",
            account_id,
        )

        if has_clearing_shares:
            raise InvalidArgument("Cannot delete an account that is references by another clearing account")

        revision_id = await conn.fetchval(
            "insert into account_revision (user_id, account_id) values ($1, $2) returning id",
            user.id,
            account_id,
        )
        await conn.execute(
            "insert into account_history (id, revision_id, name, description, owning_user_id, date_info, deleted) "
            "select $1, $2, name, description, owning_user_id, date_info, true "
            "from account_history ah where ah.id = $1 and ah.revision_id = $3 ",
            account_id,
            revision_id,
            row["revision_id"],
        )

        await create_group_log(
            conn=conn,
            group_id=group_id,
            user=user,
            type="account-deleted",
            message=f"deleted account account {row['name']}",
        )
        await self._commit_revision(conn=conn, revision_id=revision_id)
