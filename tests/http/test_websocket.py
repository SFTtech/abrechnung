import asyncio
import json

import aiohttp
from aiohttp.test_utils import unittest_run_loop

from abrechnung.http.auth import token_for_user
from tests.http import BaseHTTPAPITest


class WebsocketAPITest(BaseHTTPAPITest):
    @unittest_run_loop
    async def test_websocket_notifications(self):
        user_id = self.user_service.register_user(
            username="user", email="email@email.com", password="password"
        )
        token = token_for_user(user_id, self.secret_key)

        ws = await self.client.ws_connect("/api/v1/ws")
        self.assertIsNotNone(ws)

        await ws.send_json({"type": "auth", "data": {"access_token": token}})
        resp = await ws.receive()
        self.assertEqual(resp.type, aiohttp.WSMsgType.TEXT)
        resp_json = json.loads(resp.data)
        self.assertEqual(resp_json["type"], "auth_success")

        await ws.send_json({"type": "subscribe", "data": {"scope": "group"}})
        await asyncio.sleep(0.5)  # leave time for the subscription to be processed

        group_id = self.group_service.create_group(
            user_id=user_id,
            name="group1",
            description="asdf",
            currency_symbol="€",
            terms="terms...",
        )

        # make sure we receive a notification on the group scope
        resp = await ws.receive()
        self.assertEqual(resp.type, aiohttp.WSMsgType.TEXT)
        resp_json = json.loads(resp.data)
        self.assertEqual(resp_json["type"], "notification")
        self.assertEqual(resp_json["data"]["scope"], "group")
        self.assertEqual(resp_json["data"]["group_id"], str(group_id))

        await ws.send_json(
            {
                "type": "subscribe",
                "data": {"scope": "account", "group_id": str(group_id)},
            }
        )
        await asyncio.sleep(0.01)  # leave time for the subscription to be processed
        account_id = self.group_service.create_account(
            user_id=user_id,
            group_id=group_id,
            type="personal",
            name="group1",
            description="asdf",
        )

        resp = await ws.receive()
        self.assertEqual(resp.type, aiohttp.WSMsgType.TEXT)
        resp_json = json.loads(resp.data)
        self.assertEqual(resp_json["type"], "notification")
        self.assertEqual(resp_json["data"]["scope"], "account")
        self.assertEqual(resp_json["data"]["group_id"], str(group_id))
        self.assertEqual(resp_json["data"]["account_id"], str(account_id))

        transaction_id = self.group_service.create_transaction(
            user_id=user_id,
            group_id=group_id,
            type="transfer",
            value=1.2,
            currency_symbol="€",
            currency_conversion_rate=1.0,
            description="asdf",
        )

        resp = await ws.receive()
        self.assertEqual(resp.type, aiohttp.WSMsgType.TEXT)
        resp_json = json.loads(resp.data)
        self.assertEqual(resp_json["type"], "notification")
        self.assertEqual(resp_json["data"]["scope"], "transaction")
        self.assertEqual(resp_json["data"]["group_id"], str(group_id))
        self.assertEqual(resp_json["data"]["transaction_id"], str(transaction_id))
