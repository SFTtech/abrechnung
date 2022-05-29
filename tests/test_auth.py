from copy import deepcopy
from datetime import datetime, timedelta

from abrechnung.application.users import UserService

from abrechnung.application.groups import GroupService
from abrechnung.config import Config

from tests import AsyncTestCase, TEST_CONFIG


class TransactionLogicTest(AsyncTestCase):
    async def setUpAsync(self) -> None:
        await super().setUpAsync()
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
        config = deepcopy(TEST_CONFIG)
        config["registration"]["allow_guest_users"] = True
        config["registration"]["valid_email_domains"] = ["stusta.de"]
        test_config = Config.from_dict(config)
        user_service = UserService(self.db_pool, config=test_config)

        invite_token_id = await self.group_service.create_invite(
            user=self.user,
            group_id=self.group_id,
            description="foo",
            single_use=False,
            join_as_editor=False,
            valid_until=datetime.now() + timedelta(hours=1),
        )
        self.assertIsNotNone(invite_token_id)
        invites = await self.group_service.list_invites(
            user=self.user, group_id=self.group_id
        )
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
                email="foobar@somethingsomething.com",
                password="asdf1234",
            )
