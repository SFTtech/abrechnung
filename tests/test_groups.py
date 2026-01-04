import secrets
from datetime import datetime, timedelta

import pytest
from asyncpg import Pool
from sftkit.error import InvalidArgument

from abrechnung.application.groups import GroupService
from abrechnung.domain.groups import Group, GroupInvite, GroupPreview
from abrechnung.domain.users import User

from .conftest import CreateTestUser


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
