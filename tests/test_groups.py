import secrets
from datetime import datetime, timedelta

import pytest
from asyncpg import Pool
from sftkit.error import InvalidArgument

from abrechnung.application.groups import GroupService
from abrechnung.application.transactions import TransactionService
from abrechnung.domain.groups import Group, GroupInvite, GroupPreview
from abrechnung.domain.transactions import UpdateTransaction
from abrechnung.domain.users import User

from .conftest import CreateTestAccount, CreateTestEvent, CreateTestPurchase, CreateTestUser


async def test_basic_invites(
    group_service: GroupService,
    dummy_group: Group,
    dummy_user: User,
    create_test_user: CreateTestUser,
):
    invite_id = await group_service.create_invite(
        user=dummy_user,
        group_id=dummy_group.id,
        description="",
        single_use=False,
        join_as_editor=False,
        valid_until=datetime.now() + timedelta(days=1),
    )
    invite: GroupInvite = await group_service.get_invite(user=dummy_user, group_id=dummy_group.id, invite_id=invite_id)
    assert not invite.join_as_editor
    assert not invite.single_use

    user2, _ = await create_test_user()

    group_id = await group_service.join_group(user=user2, invite_token=invite.token)
    assert group_id == dummy_group.id


async def test_single_use_invite(
    group_service: GroupService,
    dummy_group: Group,
    dummy_user: User,
    create_test_user: CreateTestUser,
):
    invite_id = await group_service.create_invite(
        user=dummy_user,
        group_id=dummy_group.id,
        description="",
        single_use=True,
        join_as_editor=False,
        valid_until=datetime.now() + timedelta(days=1),
    )
    invite: GroupInvite = await group_service.get_invite(user=dummy_user, group_id=dummy_group.id, invite_id=invite_id)
    assert invite.single_use

    user2, _ = await create_test_user()
    group_id = await group_service.join_group(user=user2, invite_token=invite.token)
    assert group_id == dummy_group.id

    user3, _ = await create_test_user()
    with pytest.raises(Exception):
        await group_service.join_group(user=user3, invite_token=invite.token)


async def test_invite_without_expiry_date(
    group_service: GroupService,
    dummy_group: Group,
    dummy_user: User,
    create_test_user: CreateTestUser,
):
    invite_id = await group_service.create_invite(
        user=dummy_user,
        group_id=dummy_group.id,
        description="",
        single_use=True,
        join_as_editor=False,
        valid_until=None,
    )
    invite: GroupInvite = await group_service.get_invite(user=dummy_user, group_id=dummy_group.id, invite_id=invite_id)
    assert invite.valid_until is None

    user2, _ = await create_test_user()
    group_id = await group_service.join_group(user=user2, invite_token=invite.token)
    assert group_id == dummy_group.id


async def test_invite_link_preview(
    group_service: GroupService,
    dummy_group: Group,
    dummy_user: User,
    create_test_user: CreateTestUser,
):
    invite_id = await group_service.create_invite(
        user=dummy_user,
        group_id=dummy_group.id,
        description="",
        single_use=True,
        join_as_editor=False,
        valid_until=None,
    )
    invite: GroupInvite = await group_service.get_invite(user=dummy_user, group_id=dummy_group.id, invite_id=invite_id)
    assert invite.single_use

    user2, _ = await create_test_user()
    preview: GroupPreview = await group_service.preview_group(user=user2, invite_token=invite.token)
    assert preview.id == dummy_group.id


async def test_archive_group(
    group_service: GroupService,
    dummy_user: User,
):
    group_id = await group_service.create_group(
        user=dummy_user,
        name=secrets.token_hex(16),
        description="description",
        currency_identifier="EUR",
        terms="terms",
        add_user_account_on_join=False,
    )

    await group_service.archive_group(user=dummy_user, group_id=group_id)
    group = await group_service.get_group(user=dummy_user, group_id=group_id)
    assert group.archived
    await group_service.unarchive_group(user=dummy_user, group_id=group_id)
    group = await group_service.get_group(user=dummy_user, group_id=group_id)
    assert not group.archived


async def test_delete_group(
    group_service: GroupService,
    dummy_user: User,
):
    group_id = await group_service.create_group(
        user=dummy_user,
        name=secrets.token_hex(16),
        description="description",
        currency_identifier="EUR",
        terms="terms",
        add_user_account_on_join=False,
    )

    await group_service.delete_group(user=dummy_user, group_id=group_id)


async def test_delete_group_fails_multiple_members(
    group_service: GroupService,
    dummy_user: User,
    create_test_user: CreateTestUser,
    db_pool: Pool,
):
    user2, _ = await create_test_user()
    group_id = await group_service.create_group(
        user=dummy_user,
        name=secrets.token_hex(16),
        description="description",
        currency_identifier="EUR",
        terms="terms",
        add_user_account_on_join=False,
    )
    await db_pool.execute("insert into group_membership (group_id, user_id) values ($1, $2)", group_id, user2.id)

    with pytest.raises(InvalidArgument):
        await group_service.delete_group(user=dummy_user, group_id=group_id)


async def test_group_log_is_structured_and_paginated(
    group_service: GroupService,
    transaction_service: TransactionService,
    dummy_group: Group,
    dummy_user: User,
    create_test_account: CreateTestAccount,
    create_test_event: CreateTestEvent,
    create_test_purchase: CreateTestPurchase,
):
    account = await create_test_account(dummy_group.id)
    event = await create_test_event(dummy_group.id, {account.id: 1.0})
    transaction = await create_test_purchase(
        group_id=dummy_group.id, value=12.5, creditor_id=account.id, debitor_shares={account.id: 1.0}
    )
    await transaction_service.update_transaction(
        user=dummy_user,
        group_id=dummy_group.id,
        transaction_id=transaction.id,
        transaction=UpdateTransaction(
            type=transaction.type,
            name="renamed",
            description="",
            currency_identifier="EUR",
            currency_conversion_rate=1.0,
            value=20.0,
            creditor_shares={account.id: 1.0},
            debitor_shares={account.id: 1.0},
            billed_at=transaction.billed_at,
            split_mode=transaction.split_mode,
        ),
    )
    await transaction_service.delete_transaction(
        user=dummy_user, group_id=dummy_group.id, transaction_id=transaction.id
    )

    logs = await group_service.list_log(user=dummy_user, group_id=dummy_group.id)
    # newest first
    assert [log.id for log in logs] == sorted((log.id for log in logs), reverse=True)
    assert all(log.username == dummy_user.username for log in logs)

    by_type = {log.type: log for log in logs}
    assert by_type["account-created"].account_id == account.id
    assert by_type["account-created"].data["name"] == account.name
    assert by_type["transaction-created"].transaction_id == transaction.id
    assert by_type["transaction-created"].data["value"] == 12.5
    assert by_type["transaction-updated"].data["name"] == "renamed"
    assert by_type["transaction-deleted"].transaction_id == transaction.id
    assert by_type["transaction-deleted"].data["name"] == "renamed"
    assert all(log.transaction_deleted for log in logs if log.transaction_id is not None)
    assert not by_type["account-created"].account_deleted
    assert by_type["event-created"].account_id == event.id
    assert by_type["event-created"].data["name"] == event.name
    assert by_type["member-joined"].affected_username == dummy_user.username

    # pagination
    first_page = await group_service.list_log(user=dummy_user, group_id=dummy_group.id, limit=2)
    assert [log.id for log in first_page] == [log.id for log in logs[:2]]
    second_page = await group_service.list_log(
        user=dummy_user, group_id=dummy_group.id, limit=2, before_id=first_page[-1].id
    )
    assert [log.id for log in second_page] == [log.id for log in logs[2:4]]

    # type filter
    filtered = await group_service.list_log(
        user=dummy_user, group_id=dummy_group.id, types=["transaction-created", "transaction-deleted"]
    )
    assert {log.type for log in filtered} == {"transaction-created", "transaction-deleted"}


async def test_group_log_member_left(
    group_service: GroupService,
    dummy_group: Group,
    dummy_user: User,
    create_test_user: CreateTestUser,
):
    invite_id = await group_service.create_invite(
        user=dummy_user,
        group_id=dummy_group.id,
        description="",
        single_use=False,
        join_as_editor=False,
        valid_until=datetime.now() + timedelta(days=1),
    )
    invite = await group_service.get_invite(user=dummy_user, group_id=dummy_group.id, invite_id=invite_id)
    user2, _ = await create_test_user()
    await group_service.join_group(user=user2, invite_token=invite.token)
    await group_service.leave_group(user=user2, group_id=dummy_group.id)

    logs = await group_service.list_log(user=dummy_user, group_id=dummy_group.id, types=["member-left"])
    assert len(logs) == 1
    # usernames stay resolvable after a user left the group
    assert logs[0].username == user2.username
    assert logs[0].affected_username == user2.username
