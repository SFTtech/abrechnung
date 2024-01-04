# pylint: disable=attribute-defined-outside-init,missing-kwoa
from datetime import datetime, timedelta

from abrechnung.application.groups import GroupService
from abrechnung.application.users import UserService

from .common import TEST_CONFIG, BaseTestCase


class TransactionLogicTest(BaseTestCase):
    async def asyncSetUp(self) -> None:
        await super().asyncSetUp()
        self.group_service = GroupService(self.db_pool, config=self.test_config)

        self.user, _ = await self._create_test_user("test", "test@test.test")
        self.group_id = await self.group_service.create_group(
            user=self.user,
            name="test group",
            description="",
            currency_symbol="€",
            terms="",
            add_user_account_on_join=False,
        )

    async def test_register_guest_user(self):
        config = TEST_CONFIG.model_copy(deep=True)
        config.registration.allow_guest_users = True
        config.registration.valid_email_domains = ["stusta.de"]
        user_service = UserService(self.db_pool, config=config)

        invite_token_id = await self.group_service.create_invite(
            user=self.user,
            group_id=self.group_id,
            description="foo",
            single_use=False,
            join_as_editor=False,
            valid_until=datetime.now() + timedelta(hours=1),
        )
        self.assertIsNotNone(invite_token_id)
        invites = await self.group_service.list_invites(user=self.user, group_id=self.group_id)
        self.assertEqual(1, len(invites))
        invite_token = invites[0].token

        user_id = await user_service.register_user(
            username="guest user 1",
            email="foobar@something.com",
            password="asdf1234",
            invite_token=invite_token,
        )
        self.assertIsNotNone(user_id)
        guest_user = await user_service.get_user(user_id=user_id)
        self.assertTrue(guest_user.is_guest_user)

        user_id = await user_service.register_user(
            username="no guest user 1",
            email="foobar@stusta.de",
            password="asdf1234",
            invite_token=invite_token,
        )
        self.assertIsNotNone(user_id)
        non_guest_user = await user_service.get_user(user_id=user_id)
        self.assertFalse(non_guest_user.is_guest_user)

        with self.assertRaises(PermissionError):
            await user_service.register_user(
                username="invalid user",
                email="invalid-something@something.com",
                password="asdf1234",
            )

    async def test_register_without_email_confirmation(self):
        config = TEST_CONFIG.model_copy(deep=True)
        config.registration.require_email_confirmation = False
        user_service = UserService(self.db_pool, config=config)

        user_id = await user_service.register_user(
            username="guest user 1",
            email="foobar@something.com",
            password="asdf1234",
        )
        self.assertIsNotNone(user_id)
        user = await user_service.get_user(user_id=user_id)
        self.assertFalse(user.pending)
