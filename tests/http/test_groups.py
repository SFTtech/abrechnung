import asyncio
from datetime import timedelta, datetime
from uuid import uuid4, UUID

from aiohttp.test_utils import unittest_run_loop

from abrechnung.http.auth import token_for_user
from tests.http import HTTPAPITest


class GroupAPITest(HTTPAPITest):
    async def _fetch_group(self, group_id: UUID, expected_status: int = 200) -> dict:
        resp = await self._get(f"/api/v1/groups/{group_id}")
        self.assertEqual(expected_status, resp.status)
        ret_data = await resp.json()
        self.assertEqual(str(group_id), ret_data["id"])
        return ret_data

    async def _fetch_account(
        self, group_id: UUID, account_id: UUID, expected_status: int = 200
    ) -> dict:
        resp = await self._get(f"/api/v1/groups/{group_id}/accounts/{account_id}")
        self.assertEqual(expected_status, resp.status)
        ret_data = await resp.json()
        self.assertEqual(str(account_id), ret_data["id"])
        return ret_data

    @unittest_run_loop
    async def test_create_group(self):
        resp = await self._post(
            "/api/v1/groups",
            json={
                "name": "name",
                "description": "description",
                "currency_symbol": "€",
                "terms": "terms",
            },
        )
        self.assertEqual(200, resp.status)
        ret_data = await resp.json()
        self.assertIsNotNone(ret_data["group_id"])

    @unittest_run_loop
    async def test_get_group(self):
        group_id = self.group_service.create_group(
            self.test_user_id, "name", "description", "€", "terms"
        )
        resp = await self._get(f"/api/v1/groups/{group_id}")
        self.assertEqual(200, resp.status)
        ret_data = await resp.json()
        self.assertEqual(str(group_id), ret_data["id"])
        self.assertEqual("name", ret_data["name"])

        resp = await self._get(f"/api/v1/groups/asdf1234")
        self.assertEqual(400, resp.status)

        resp = await self._get(f"/api/v1/groups/{uuid4()}")
        self.assertEqual(403, resp.status)

    @unittest_run_loop
    async def test_list_groups(self):
        resp = await self._get(f"/api/v1/groups")
        self.assertEqual(200, resp.status)
        ret_data = await resp.json()
        self.assertEqual(0, len(ret_data))

        group1_id = self.group_service.create_group(
            self.test_user_id, "name1", "description", "€", "terms"
        )
        group2_id = self.group_service.create_group(
            self.test_user_id, "name2", "description", "€", "terms"
        )
        resp = await self._get(f"/api/v1/groups")
        self.assertEqual(200, resp.status)
        ret_data = await resp.json()
        self.assertEqual(2, len(ret_data))
        self.assertEqual(
            {str(group1_id), str(group2_id)}, set([e["id"] for e in ret_data])
        )

    @unittest_run_loop
    async def test_create_account(self):
        group_id = self.group_service.create_group(
            self.test_user_id, "name", "description", "€", "terms"
        )
        resp = await self._post(
            f"/api/v1/groups/{group_id}/accounts",
            json={
                "name": "name",
                "description": "description",
                "type": "personal",
            },
        )
        self.assertEqual(200, resp.status)
        ret_data = await resp.json()
        self.assertIsNotNone(ret_data["account_id"])

    @unittest_run_loop
    async def test_update_account(self):
        group_id = self.group_service.create_group(
            self.test_user_id, "name", "description", "€", "terms"
        )
        account_id = self.group_service.create_account(
            self.test_user_id,
            group_id,
            type="personal",
            name="name",
            description="description",
        )
        resp = await self._post(
            f"/api/v1/groups/{group_id}/accounts/{account_id}",
            json={
                "name": "new_name",
                "description": "description",
            },
        )
        self.assertEqual(204, resp.status)

        a = await self._fetch_account(group_id, account_id)
        self.assertEqual(a["name"], "new_name")
        self.assertEqual(a["description"], "description")

        resp = await self._post(
            f"/api/v1/groups/{group_id}/accounts/{account_id}",
            json={
                "name": "new_name2",
                "description": "description1",
            },
        )
        self.assertEqual(204, resp.status)
        a = await self._fetch_account(group_id, account_id)
        self.assertEqual(a["name"], "new_name2")
        self.assertEqual(a["description"], "description1")

    @unittest_run_loop
    async def test_list_accounts(self):
        group_id = self.group_service.create_group(
            self.test_user_id, "name", "description", "€", "terms"
        )
        account1_id = self.group_service.create_account(
            self.test_user_id, group_id, "personal", "account1", "description"
        )
        account2_id = self.group_service.create_account(
            self.test_user_id, group_id, "personal", "account2", "description"
        )
        resp = await self._get(f"/api/v1/groups/{group_id}/accounts")
        self.assertEqual(200, resp.status)
        ret_data = await resp.json()
        self.assertEqual(2, len(ret_data))
        self.assertEqual(
            {str(account1_id), str(account2_id)}, set([e["id"] for e in ret_data])
        )

    @unittest_run_loop
    async def test_list_members(self):
        group_id = self.group_service.create_group(
            self.test_user_id, "name", "description", "€", "terms"
        )
        resp = await self._get(f"/api/v1/groups/{group_id}/members")
        self.assertEqual(200, resp.status)
        ret_data = await resp.json()
        self.assertEqual(1, len(ret_data))
        self.assertEqual({str(self.test_user_id)}, set([e["id"] for e in ret_data]))

    @unittest_run_loop
    async def test_get_account(self):
        group_id = self.group_service.create_group(
            self.test_user_id, "name", "description", "€", "terms"
        )
        account_id = self.group_service.create_account(
            self.test_user_id, group_id, "personal", "account1", "description"
        )
        ret_data = await self._fetch_account(group_id, account_id)
        self.assertEqual("account1", ret_data["name"])

        resp = await self._get(f"/api/v1/groups/{group_id}/accounts/asdf1234")
        self.assertEqual(400, resp.status)

        resp = await self._get(f"/api/v1/groups/{uuid4()}/accounts/{account_id}")
        self.assertEqual(403, resp.status)

        resp = await self._get(f"/api/v1/groups/{group_id}/accounts/{uuid4()}")
        self.assertEqual(403, resp.status)

    @unittest_run_loop
    async def test_invites(self):
        group_id = self.group_service.create_group(
            self.test_user_id, "group1", "description", "€", "terms"
        )
        resp = await self._post(
            f"/api/v1/groups/{group_id}/invites",
            json={
                "description": "description",
                "single_use": False,
                "valid_until": (datetime.now() + timedelta(hours=1)).isoformat(),
            },
        )
        self.assertEqual(200, resp.status)

        g = await self._fetch_group(group_id)
        self.assertEqual(1, len(g["invites"]))

        # we hardcode assume the invite id is 0 to check if the id counting works as expected
        resp = await self._delete(f"/api/v1/groups/{group_id}/invites/0")
        self.assertEqual(204, resp.status)

        g = await self._fetch_group(group_id)
        self.assertEqual(0, len(g["invites"]))

        # now check that we can actually preview the group as a different user
        resp = await self._post(
            f"/api/v1/groups/{group_id}/invites",
            json={
                "description": "description",
                "single_use": True,
                "valid_until": (datetime.now() + timedelta(hours=1)).isoformat(),
            },
        )
        self.assertEqual(200, resp.status)

        g = await self._fetch_group(group_id)
        self.assertEqual(1, len(g["invites"]))
        invite_token = g["invites"]["token"]

        user2_id = self.user_service.register_user(
            "user2", "email2@email.com", "asdf1234"
        )
        jwt_token = token_for_user(user2_id, self.secret_key)
        resp = await self.client.post(
            f"/api/v1/groups/{group_id}/preview",
            json={"invite_token": invite_token},
            headers={"Authorization": f"Bearer {jwt_token}"},
        )
        self.assertEqual(200, resp.status)
        prev_group_data = await resp.json()
        self.assertEqual("group1", prev_group_data["name"])
        self.assertEqual(str(group_id), prev_group_data["id"])
