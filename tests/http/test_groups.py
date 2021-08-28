from datetime import timedelta, datetime

from aiohttp.test_utils import unittest_run_loop

from abrechnung.http.auth import token_for_user
from tests.http import HTTPAPITest


class GroupAPITest(HTTPAPITest):
    async def _fetch_group(self, group_id: int, expected_status: int = 200) -> dict:
        resp = await self._get(f"/api/v1/groups/{group_id}")
        self.assertEqual(expected_status, resp.status)
        ret_data = await resp.json()
        self.assertEqual(group_id, ret_data["id"])
        return ret_data

    async def _fetch_account(
        self, group_id: int, account_id: int, expected_status: int = 200
    ) -> dict:
        resp = await self._get(f"/api/v1/groups/{group_id}/accounts/{account_id}")
        self.assertEqual(expected_status, resp.status)
        ret_data = await resp.json()
        self.assertEqual(account_id, ret_data["id"])
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
        group_id = await self.group_service.create_group(
            user_id=self.test_user_id,
            name="name",
            description="description",
            currency_symbol="€",
            terms="terms",
        )
        resp = await self._get(f"/api/v1/groups/{group_id}")
        self.assertEqual(200, resp.status)
        ret_data = await resp.json()
        self.assertEqual(group_id, ret_data["id"])
        self.assertEqual("name", ret_data["name"])

        resp = await self._get(f"/api/v1/groups/asdf1234")
        self.assertEqual(404, resp.status)

        resp = await self._get(f"/api/v1/groups/133323")
        self.assertEqual(403, resp.status)

    @unittest_run_loop
    async def test_list_groups(self):
        resp = await self._get(f"/api/v1/groups")
        self.assertEqual(200, resp.status)
        ret_data = await resp.json()
        self.assertEqual(0, len(ret_data))

        group1_id = await self.group_service.create_group(
            user_id=self.test_user_id,
            name="name1",
            description="description",
            currency_symbol="€",
            terms="terms",
        )
        group2_id = await self.group_service.create_group(
            user_id=self.test_user_id,
            name="name2",
            description="description",
            currency_symbol="€",
            terms="terms",
        )
        resp = await self._get(f"/api/v1/groups")
        self.assertEqual(200, resp.status)
        ret_data = await resp.json()
        self.assertEqual(2, len(ret_data))
        self.assertEqual({group1_id, group2_id}, set([e["id"] for e in ret_data]))

    @unittest_run_loop
    async def test_create_account(self):
        group_id = await self.group_service.create_group(
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
        group_id = await self.group_service.create_group(
            user_id=self.test_user_id,
            name="name",
            description="description",
            currency_symbol="€",
            terms="terms",
        )
        account_id = await self.account_service.create_account(
            user_id=self.test_user_id,
            group_id=group_id,
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
        self.assertEqual("new_name", a["name"])
        self.assertEqual("description", a["description"])

        resp = await self._post(
            f"/api/v1/groups/{group_id}/accounts/{account_id}",
            json={
                "name": "new_name2",
                "description": "description1",
            },
        )
        self.assertEqual(204, resp.status)
        a = await self._fetch_account(group_id, account_id)
        self.assertEqual("new_name2", a["name"])
        self.assertEqual("description1", a["description"])

    @unittest_run_loop
    async def test_list_accounts(self):
        group_id = await self.group_service.create_group(
            user_id=self.test_user_id,
            name="name",
            description="description",
            currency_symbol="€",
            terms="terms",
        )
        account1_id = await self.account_service.create_account(
            user_id=self.test_user_id,
            group_id=group_id,
            type="personal",
            name="account1",
            description="description",
        )
        account2_id = await self.account_service.create_account(
            user_id=self.test_user_id,
            group_id=group_id,
            type="personal",
            name="account2",
            description="description",
        )
        resp = await self._get(f"/api/v1/groups/{group_id}/accounts")
        self.assertEqual(200, resp.status)
        ret_data = await resp.json()
        self.assertEqual(2, len(ret_data))
        self.assertEqual({account1_id, account2_id}, set([e["id"] for e in ret_data]))

    @unittest_run_loop
    async def test_list_members(self):
        group_id = await self.group_service.create_group(
            self.test_user_id, "name", "description", "€", "terms"
        )
        resp = await self._get(f"/api/v1/groups/{group_id}/members")
        self.assertEqual(200, resp.status)
        ret_data = await resp.json()
        self.assertEqual(1, len(ret_data))
        self.assertEqual({self.test_user_id}, set([e["user_id"] for e in ret_data]))

    @unittest_run_loop
    async def test_get_account(self):
        group_id = await self.group_service.create_group(
            user_id=self.test_user_id,
            name="name",
            description="description",
            currency_symbol="€",
            terms="terms",
        )
        account_id = await self.account_service.create_account(
            user_id=self.test_user_id,
            group_id=group_id,
            type="personal",
            name="account1",
            description="description",
        )
        ret_data = await self._fetch_account(group_id, account_id)
        self.assertEqual("account1", ret_data["name"])

        resp = await self._get(f"/api/v1/groups/{group_id}/accounts/asdf1234")
        self.assertEqual(404, resp.status)

        resp = await self._get(f"/api/v1/groups/foobar/accounts/{account_id}")
        self.assertEqual(404, resp.status)

        resp = await self._get(f"/api/v1/groups/{group_id}/accounts/13232")
        self.assertEqual(404, resp.status)

    @unittest_run_loop
    async def test_invites(self):
        group_id = await self.group_service.create_group(
            user_id=self.test_user_id,
            name="group1",
            description="description",
            currency_symbol="€",
            terms="terms",
        )
        resp = await self._post(
            f"/api/v1/groups/{group_id}/invites",
            json={
                "description": "description",
                "single_use": False,
                "valid_until": (datetime.now() + timedelta(hours=1)).isoformat(),
            },
        )
        self.assertEqual(204, resp.status)

        resp = await self._get(f"/api/v1/groups/{group_id}/invites")
        self.assertEqual(200, resp.status)
        invites = await resp.json()
        self.assertEqual(1, len(invites))

        # we hardcode assume the invite id is 0 to check if the id counting works as expected
        resp = await self._delete(
            f"/api/v1/groups/{group_id}/invites/{invites[0]['id']}"
        )
        self.assertEqual(204, resp.status)

        resp = await self._get(f"/api/v1/groups/{group_id}/invites")
        self.assertEqual(200, resp.status)
        invites = await resp.json()
        self.assertEqual(0, len(invites))

        # now check that we can actually preview the group as a different user
        resp = await self._post(
            f"/api/v1/groups/{group_id}/invites",
            json={
                "description": "description",
                "single_use": True,
                "valid_until": (datetime.now() + timedelta(hours=1)).isoformat(),
            },
        )
        self.assertEqual(204, resp.status)

        resp = await self._get(f"/api/v1/groups/{group_id}/invites")
        self.assertEqual(200, resp.status)
        invites = await resp.json()
        self.assertEqual(1, len(invites))
        invite_token = invites[0]["token"]
        self.assertIsNotNone(invite_token)

        user2_id, _ = await self._create_test_user("user", "email2@email.stuff")
        jwt_token = token_for_user(user2_id, self.secret_key)
        resp = await self.client.post(
            f"/api/v1/groups/{group_id}/preview",
            json={"invite_token": invite_token},
            headers={"Authorization": f"Bearer {jwt_token}"},
        )
        self.assertEqual(200, resp.status)
        prev_group_data = await resp.json()
        self.assertEqual("group1", prev_group_data["name"])
        self.assertEqual(group_id, prev_group_data["id"])

        resp = await self.client.post(
            f"/api/v1/groups/{group_id}/join",
            json={"invite_token": invite_token},
            headers={"Authorization": f"Bearer {jwt_token}"},
        )
        self.assertEqual(204, resp.status)
