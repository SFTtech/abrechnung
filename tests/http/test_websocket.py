import asyncio
import json
from datetime import datetime, timedelta

import aiohttp
from aiohttp import web
from aiohttp.test_utils import unittest_run_loop

from abrechnung.http.auth import token_for_user
from tests.http import BaseHTTPAPITest


class WebsocketAPITest(BaseHTTPAPITest):
    async def expect_ws_message(self, ws: web.WebSocketResponse, expected_msg: dict):
        resp = await ws.receive(timeout=1)
        self.assertEqual(resp.type, aiohttp.WSMsgType.TEXT)
        resp_json = json.loads(resp.data)
        self.assertDictEqual(expected_msg, resp_json)

    @unittest_run_loop
    async def test_websocket_notifications(self):
        user_id = await self.user_service.register_user(
            username="user", email="email@email.com", password="password"
        )
        token = token_for_user(user_id, self.secret_key)

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
