# pylint: disable=attribute-defined-outside-init,missing-kwoa
import secrets
from datetime import datetime, timedelta

import pytest
from asyncpg import Pool
from sftkit.error import AccessDenied, InvalidArgument

from abrechnung.application.groups import GroupService
from abrechnung.application.users import UserService
from abrechnung.domain.groups import Group
from abrechnung.domain.users import User

from .conftest import TEST_CONFIG, CreateTestUser


async def test_register_with_email_confirmation(user_service: UserService, db_pool: Pool):
    username = secrets.token_hex(16)
    user_id = await user_service.register_user(
        username=username,
        email=f"{secrets.token_hex(16)}@something.com",
        password="asdf1234",
    )
    assert user_id is not None
    user = await user_service.get_user(user_id=user_id)
    assert user.pending
    with pytest.raises(InvalidArgument):
        await user_service.login_user(username=username, password="asdf1234", session_name="dummy session")

    registration_token = await db_pool.fetchval(
        "select token from pending_registration where user_id = $1 limit 1", user.id
    )
    await user_service.confirm_registration(token=str(registration_token))
    await user_service.login_user(username=username, password="asdf1234", session_name="dummy session")


async def test_register_without_email_confirmation(db_pool: Pool):
    config = TEST_CONFIG.model_copy(deep=True)
    config.registration.require_email_confirmation = False
    user_service = UserService(db_pool, config=config)

    username = secrets.token_hex(16)
    user_id = await user_service.register_user(
        username=username,
        email=f"{secrets.token_hex(16)}@something.com",
        password="asdf1234",
    )
    assert user_id is not None
    user = await user_service.get_user(user_id=user_id)
    assert not user.pending
    uid, _, _ = await user_service.login_user(username=username, password="asdf1234", session_name="dummy session")
    assert user_id == uid


async def test_register_guest_user(group_service: GroupService, db_pool: Pool, dummy_group: Group, dummy_user: User):
    config = TEST_CONFIG.model_copy(deep=True)
    config.registration.allow_guest_users = True
    config.registration.valid_email_domains = ["stusta.de"]
    user_service = UserService(db_pool, config=config)

    invite_token_id = await group_service.create_invite(
        user=dummy_user,
        group_id=dummy_group.id,
        description="foo",
        single_use=False,
        join_as_editor=False,
        valid_until=datetime.now() + timedelta(hours=1),
    )
    assert invite_token_id is not None
    invites = await group_service.list_invites(user=dummy_user, group_id=dummy_group.id)
    assert len(invites) == 1
    invite_token = invites[0].token

    username1 = secrets.token_hex(16)
    user_id = await user_service.register_user(
        username=username1,
        email=f"{username1}@something.com",
        password="asdf1234",
        invite_token=invite_token,
    )
    assert user_id is not None
    guest_user = await user_service.get_user(user_id=user_id)
    assert guest_user.is_guest_user

    with pytest.raises(InvalidArgument):  # email confirmation required
        await user_service.login_user(username=username1, password="asdf1234", session_name="dummy session")

    confirmation_token = await db_pool.fetchval("select token from pending_registration where user_id = $1", user_id)
    await user_service.confirm_registration(token=str(confirmation_token))
    uid, _, _ = await user_service.login_user(username=username1, password="asdf1234", session_name="dummy session")
    assert user_id == uid

    username2 = secrets.token_hex(16)
    user_id = await user_service.register_user(
        username=username2,
        email=f"{username2}@stusta.de",
        password="asdf1234",
        invite_token=invite_token,
    )
    assert user_id is not None
    non_guest_user = await user_service.get_user(user_id=user_id)
    assert not non_guest_user.is_guest_user
    with pytest.raises(InvalidArgument):  # email confirmation required
        await user_service.login_user(username=username2, password="asdf1234", session_name="dummy session")

    confirmation_token = await db_pool.fetchval("select token from pending_registration where user_id = $1", user_id)
    await user_service.confirm_registration(token=str(confirmation_token))
    uid, _, _ = await user_service.login_user(username=username2, password="asdf1234", session_name="dummy session")
    assert user_id == uid

    with pytest.raises(AccessDenied):
        await user_service.register_user(
            username=secrets.token_hex(16),
            email=f"{secrets.token_hex(16)}@something.com",
            password="asdf1234",
        )


async def test_change_email(user_service: UserService, db_pool: Pool, create_test_user: CreateTestUser):
    user, pw = await create_test_user()
    new_email = f"{secrets.token_hex(16)}@something.com"
    await user_service.request_email_change(user=user, email=new_email, password=pw)

    confirmation_token = await db_pool.fetchval(
        "select token from pending_email_change where user_id = $1 limit 1", user.id
    )
    await user_service.confirm_email_change(token=str(confirmation_token))
    updated_user = await user_service.get_user(user_id=user.id)
    assert updated_user.email == new_email


async def test_change_password(user_service: UserService, create_test_user: CreateTestUser):
    user, pw = await create_test_user()
    new_password = secrets.token_hex(16)

    await user_service.change_password(user=user, old_password=pw, new_password=new_password)

    await user_service.login_user(username=user.username, password=new_password, session_name=secrets.token_hex(16))


async def test_password_recovery(user_service: UserService, db_pool: Pool, create_test_user: CreateTestUser):
    user, _ = await create_test_user()
    new_password = secrets.token_hex(16)

    await user_service.request_password_recovery(email=user.email)

    confirmation_token = await db_pool.fetchval(
        "select token from pending_password_recovery where user_id = $1 limit 1", user.id
    )
    await user_service.confirm_password_recovery(token=str(confirmation_token), new_password=new_password)

    await user_service.login_user(username=user.username, password=new_password, session_name=secrets.token_hex(16))
