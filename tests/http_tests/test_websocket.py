import asyncio
import unittest
from datetime import date, datetime, timedelta

from fastapi.testclient import TestClient

from abrechnung.config import Config
from abrechnung.http.cli import ApiCli
from tests.common import TEST_CONFIG, BaseTestCase


class WebsocketAPITest(BaseTestCase):
    async def asyncSetUp(self) -> None:
        await super().asyncSetUp()

        try:
            self.loop = asyncio.get_running_loop()
        except (AttributeError, RuntimeError):  # AttributeError->py36
            self.loop = asyncio.get_event_loop_policy().get_event_loop()

        self.test_config = Config.parse_obj(TEST_CONFIG)
        self.http_service = ApiCli(config=self.test_config)
        await self.http_service._setup()

        self.client = TestClient(self.http_service.api)
        self.transaction_service = self.http_service.transaction_service
        self.account_service = self.http_service.account_service
        self.group_service = self.http_service.group_service

    async def asyncTearDown(self) -> None:
        await self.http_service._teardown()
        await super().asyncTearDown()

    async def expect_ws_message(self, ws, expected_msg: dict):
        resp = ws.receive_json()
        self.assertEqual(expected_msg, resp | expected_msg)

    @unittest.skip("currently no test utility exists for async websocket tests with fastapi")
    async def test_websocket_notifications(self):
        user, password = await self._create_test_user(username="user", email="email@email.com")
        _, session_id, token = await self.user_service.login_user("user", password=password, session_name="session1")

        with self.client.websocket_connect("/api/v1/ws") as ws:
            self.assertIsNotNone(ws)

            ws.send_json(
                {
                    "type": "subscribe",
                    "token": token,
                    "data": {"subscription_type": "group", "element_id": user.id},
                }
            )

            await self.expect_ws_message(
                ws,
                {
                    "type": "subscribe_success",
                    "data": {
                        "element_id": user.id,
                        "subscription_type": "group",
                    },
                },
            )

            group_id = await self.group_service.create_group(
                user=user,
                name="group1",
                description="asdf",
                currency_symbol="€",
                terms="terms...",
                add_user_account_on_join=False,
            )

            # make sure we receive a notification on the group scope
            await self.expect_ws_message(
                ws,
                {
                    "type": "notification",
                    "data": {
                        "element_id": user.id,
                        "group_id": group_id,
                        "subscription_type": "group",
                    },
                },
            )

            ws.send_json(
                {
                    "type": "subscribe",
                    "token": token,
                    "data": {"subscription_type": "account", "element_id": group_id},
                }
            )

            await self.expect_ws_message(
                ws,
                {
                    "type": "subscribe_success",
                    "data": {
                        "element_id": group_id,
                        "subscription_type": "account",
                    },
                },
            )

            account_id = await self.account_service.create_account(
                user=user,
                group_id=group_id,
                type="personal",
                name="group1",
                description="asdf",
            )
            await self.expect_ws_message(
                ws,
                {
                    "type": "notification",
                    "data": {
                        "element_id": group_id,
                        "account_id": account_id,
                        "subscription_type": "account",
                    },
                },
            )

            # subscribe to transaction changes
            ws.send_json(
                {
                    "type": "subscribe",
                    "token": token,
                    "data": {
                        "subscription_type": "transaction",
                        "element_id": group_id,
                    },
                }
            )

            await self.expect_ws_message(
                ws,
                {
                    "type": "subscribe_success",
                    "data": {
                        "element_id": group_id,
                        "subscription_type": "transaction",
                    },
                },
            )

            transaction_id = await self.transaction_service.create_transaction(
                user=user,
                group_id=group_id,
                type="transfer",
                value=1.2,
                currency_symbol="€",
                currency_conversion_rate=1.0,
                billed_at=date.today(),
                name="asdf",
                description="asdf",
                tags=[],
            )

            await self.expect_ws_message(
                ws,
                {
                    "type": "notification",
                    "data": {
                        "element_id": group_id,
                        "transaction_id": transaction_id,
                        "subscription_type": "transaction",
                        "deleted": False,
                        "revision_committed": None,
                        "revision_version": 0,
                    },
                },
            )

            # subscribe to group invite changes
            ws.send_json(
                {
                    "type": "subscribe",
                    "token": token,
                    "data": {
                        "subscription_type": "group_invite",
                        "element_id": group_id,
                    },
                }
            )

            await self.expect_ws_message(
                ws,
                {
                    "type": "subscribe_success",
                    "data": {
                        "element_id": group_id,
                        "subscription_type": "group_invite",
                    },
                },
            )

            invite_id = await self.group_service.create_invite(
                user=user,
                group_id=group_id,
                description="foobar invite",
                single_use=False,
                valid_until=datetime.now() + timedelta(hours=4),
                join_as_editor=True,
            )

            await self.expect_ws_message(
                ws,
                {
                    "type": "notification",
                    "data": {
                        "element_id": group_id,
                        "invite_id": invite_id,
                        "subscription_type": "group_invite",
                    },
                },
            )

            ws.send_json(
                {
                    "type": "unsubscribe",
                    "token": token,
                    "data": {
                        "subscription_type": "transaction",
                        "element_id": group_id,
                    },
                }
            )

            await self.expect_ws_message(
                ws,
                {
                    "type": "unsubscribe_success",
                    "data": {
                        "element_id": group_id,
                        "subscription_type": "transaction",
                    },
                },
            )

            ws.send_json(
                {
                    "type": "unsubscribe",
                    "token": token,
                    "data": {"subscription_type": "account", "element_id": group_id},
                }
            )

            await self.expect_ws_message(
                ws,
                {
                    "type": "unsubscribe_success",
                    "data": {
                        "element_id": group_id,
                        "subscription_type": "account",
                    },
                },
            )

            ws.send_json(
                {
                    "type": "unsubscribe",
                    "token": token,
                    "data": {"subscription_type": "group", "element_id": user.id},
                }
            )

            await self.expect_ws_message(
                ws,
                {
                    "type": "unsubscribe_success",
                    "data": {
                        "element_id": user.id,
                        "subscription_type": "group",
                    },
                },
            )
