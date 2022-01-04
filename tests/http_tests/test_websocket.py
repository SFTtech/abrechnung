import asyncio
import json
from datetime import datetime, timedelta, date, timezone

import aiohttp
from aiohttp import web

from abrechnung.http.auth import token_for_user
from tests.http_tests import BaseHTTPAPITest


class WebsocketAPITest(BaseHTTPAPITest):
    async def expect_ws_message(self, ws: web.WebSocketResponse, expected_msg: dict):
        resp = await ws.receive(timeout=1)
        self.assertEqual(resp.type, aiohttp.WSMsgType.TEXT)
        resp_json = json.loads(resp.data)
        self.assertEqual(expected_msg, resp_json | expected_msg)

    async def test_websocket_notifications(self):
        user_id, password = await self._create_test_user(
            username="user", email="email@email.com"
        )
        _, session_id, _ = await self.user_service.login_user(
            "user", password=password, session_name="session1"
        )
        token = token_for_user(
            user_id, session_id=session_id, secret_key=self.secret_key
        )

        ws = await self.client.ws_connect("/api/v1/ws")
        self.assertIsNotNone(ws)

        await ws.send_json(
            {
                "type": "subscribe",
                "token": token,
                "data": {"subscription_type": "group", "element_id": user_id},
            }
        )

        await self.expect_ws_message(
            ws,
            {
                "type": "subscribe_success",
                "data": {
                    "element_id": user_id,
                    "subscription_type": "group",
                },
            },
        )

        group_id = await self.group_service.create_group(
            user_id=user_id,
            name="group1",
            description="asdf",
            currency_symbol="€",
            terms="terms...",
        )

        # make sure we receive a notification on the group scope
        await self.expect_ws_message(
            ws,
            {
                "type": "notification",
                "data": {
                    "element_id": user_id,
                    "group_id": group_id,
                    "subscription_type": "group",
                },
            },
        )

        await ws.send_json(
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
            user_id=user_id,
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
        await ws.send_json(
            {
                "type": "subscribe",
                "token": token,
                "data": {"subscription_type": "transaction", "element_id": group_id},
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
            user_id=user_id,
            group_id=group_id,
            type="transfer",
            value=1.2,
            currency_symbol="€",
            currency_conversion_rate=1.0,
            billed_at=date.today(),
            description="asdf",
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
        await ws.send_json(
            {
                "type": "subscribe",
                "token": token,
                "data": {"subscription_type": "group_invite", "element_id": group_id},
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
            user_id=user_id,
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

        await ws.send_json(
            {
                "type": "unsubscribe",
                "token": token,
                "data": {"subscription_type": "transaction", "element_id": group_id},
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

        await ws.send_json(
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

        await ws.send_json(
            {
                "type": "unsubscribe",
                "token": token,
                "data": {"subscription_type": "group", "element_id": user_id},
            }
        )

        await self.expect_ws_message(
            ws,
            {
                "type": "unsubscribe_success",
                "data": {
                    "element_id": user_id,
                    "subscription_type": "group",
                },
            },
        )
