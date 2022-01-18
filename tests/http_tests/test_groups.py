from datetime import timedelta, datetime, timezone

from abrechnung.http.auth import token_for_user
from tests.http_tests import HTTPAPITest


class GroupAPITest(HTTPAPITest):
    async def _fetch_group(self, group_id: int, expected_status: int = 200) -> dict:
        resp = await self._get(f"/api/v1/groups/{group_id}")
        self.assertEqual(expected_status, resp.status)
        if expected_status >= 400:
            return {}
        ret_data = await resp.json()
        self.assertEqual(group_id, ret_data["id"])
        return ret_data

    async def _fetch_account(self, account_id: int, expected_status: int = 200) -> dict:
        resp = await self._get(f"/api/v1/accounts/{account_id}")
        self.assertEqual(expected_status, resp.status)
        if expected_status >= 400:
            return {}
        ret_data = await resp.json()
        self.assertEqual(account_id, ret_data["id"])
        return ret_data

    async def _fetch_members(self, group_id: int, expected_status: int = 200) -> dict:
        resp = await self._get(f"/api/v1/groups/{group_id}/members")
        self.assertEqual(expected_status, resp.status)
        if expected_status >= 400:
            return {}
        ret_data = await resp.json()
        self.assertTrue(isinstance(ret_data, list))
        return ret_data

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
        group_id = ret_data["group_id"]

        group = await self._fetch_group(group_id)
        self.assertEqual("name", group["name"])

        await self._fetch_group("asdf1234", 404)
        await self._fetch_group(13333, 404)

        resp = await self._post(
            f"/api/v1/groups/{group_id}",
            json={
                "name": "name2",
                "description": "description2",
                "currency_symbol": "$",
                "terms": "new terms",
            },
        )
        self.assertEqual(204, resp.status)

        group = await self._fetch_group(group_id)
        self.assertEqual("name2", group["name"])
        self.assertEqual("description2", group["description"])
        self.assertEqual("$", group["currency_symbol"])
        self.assertEqual("new terms", group["terms"])

    async def test_delete_group(self):
        user2_id, user2_password = await self._create_test_user(
            "user2", "user2@test.com"
        )
        _, session_id, _ = await self.user_service.login_user(
            "user2", password=user2_password, session_name="foobar"
        )
        user2_token = token_for_user(user2_id, session_id, self.secret_key)
        group_id = await self.group_service.create_group(
            user_id=self.test_user_id,
            name="foobar",
            description="foobar",
            currency_symbol="€",
            terms="foo",
        )
        async with self.db_pool.acquire() as conn:
            await conn.execute(
                "insert into group_membership (user_id, group_id, is_owner, can_write) "
                "values ($1, $2, true, true)",
                user2_id,
                group_id,
            )

        account1_id = await self.account_service.create_account(
            user_id=self.test_user_id,
            group_id=group_id,
            type="personal",
            name="account1",
            description="",
        )
        account2_id = await self.account_service.create_account(
            user_id=self.test_user_id,
            group_id=group_id,
            type="personal",
            name="account2",
            description="",
        )

        transaction_id = await self.transaction_service.create_transaction(
            user_id=self.test_user_id,
            group_id=group_id,
            type="purchase",
            description="asdf",
            billed_at=datetime.now(tz=timezone.utc),
            currency_symbol="€",
            currency_conversion_rate=1.0,
            value=20.0,
        )
        await self.transaction_service.add_or_change_debitor_share(
            user_id=self.test_user_id,
            transaction_id=transaction_id,
            account_id=account1_id,
            value=1.0,
        )
        await self.transaction_service.add_or_change_creditor_share(
            user_id=self.test_user_id,
            transaction_id=transaction_id,
            account_id=account2_id,
            value=1.0,
        )

        resp = await self._delete(f"/api/v1/groups/{group_id}")
        self.assertEqual(403, resp.status)

        resp = await self._post(f"/api/v1/groups/{group_id}/leave")
        self.assertEqual(204, resp.status)

        await self._fetch_group(group_id, expected_status=404)

        resp = await self.client.delete(
            f"/api/v1/groups/{group_id}",
            headers={"Authorization": f"Bearer {user2_token}"},
        )
        self.assertEqual(204, resp.status)

        async with self.db_pool.acquire() as conn:
            gid = await conn.fetchval("select id from grp where grp.id = $1", group_id)
            self.assertIsNone(gid)

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

    async def test_create_account(self):
        group_id = await self.group_service.create_group(
            user_id=self.test_user_id,
            name="name",
            description="description",
            currency_symbol="€",
            terms="terms",
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
        self.assertIsNotNone(ret_data["id"])

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
            f"/api/v1/accounts/{account_id}",
            json={
                "name": "new_name",
                "description": "description",
            },
        )
        self.assertEqual(200, resp.status)

        a = await self._fetch_account(account_id)
        self.assertEqual("new_name", a["committed_details"]["name"])
        self.assertEqual("description", a["committed_details"]["description"])

        resp = await self._post(
            f"/api/v1/accounts/{account_id}",
            json={
                "name": "new_name2",
                "description": "description1",
            },
        )
        self.assertEqual(200, resp.status)
        a = await self._fetch_account(account_id)
        self.assertEqual("new_name2", a["committed_details"]["name"])
        self.assertEqual("description1", a["committed_details"]["description"])

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

    async def test_members(self):
        group_id = await self.group_service.create_group(
            user_id=self.test_user_id,
            name="name",
            description="description",
            currency_symbol="€",
            terms="terms",
        )
        members = await self._fetch_members(group_id)
        self.assertEqual(1, len(members))
        self.assertEqual({self.test_user_id}, set([m["user_id"] for m in members]))

        user2_id, _ = await self._create_test_user("user2", "user2@email.stuff")
        async with self.db_pool.acquire() as conn:
            await conn.execute(
                "insert into group_membership (user_id, group_id, invited_by) values ($1, $2, $3)",
                user2_id,
                group_id,
                self.test_user_id,
            )

        members = await self._fetch_members(group_id)
        self.assertEqual(2, len(members))
        self.assertEqual(
            {self.test_user_id, user2_id}, set([m["user_id"] for m in members])
        )

        resp = await self._post(
            f"/api/v1/groups/{group_id}/members",
            json={"user_id": user2_id, "can_write": True, "is_owner": False},
        )
        self.assertEqual(204, resp.status)

        members = await self._fetch_members(group_id)
        self.assertEqual(2, len(members))
        self.assertTrue(
            list(filter(lambda x: x["user_id"] == user2_id, members))[0]["can_write"]
        )
        self.assertFalse(
            list(filter(lambda x: x["user_id"] == user2_id, members))[0]["is_owner"]
        )

        resp = await self._post(
            f"/api/v1/groups/{group_id}/members",
            json={"user_id": user2_id, "can_write": True, "is_owner": True},
        )
        self.assertEqual(204, resp.status)

        members = await self._fetch_members(group_id)
        self.assertEqual(2, len(members))
        self.assertTrue(
            list(filter(lambda x: x["user_id"] == user2_id, members))[0]["can_write"]
        )
        self.assertTrue(
            list(filter(lambda x: x["user_id"] == user2_id, members))[0]["is_owner"]
        )

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
        ret_data = await self._fetch_account(account_id)
        self.assertEqual("account1", ret_data["committed_details"]["name"])

        resp = await self._get(f"/api/v1/accounts/asdf1234")
        self.assertEqual(404, resp.status)

        resp = await self._get(f"/api/v1/accounts/13232")
        self.assertEqual(404, resp.status)

    async def test_clearing_accounts(self):
        group_id = await self.group_service.create_group(
            user_id=self.test_user_id,
            name="name",
            description="description",
            currency_symbol="€",
            terms="terms",
        )
        resp = await self._post(
            f"/api/v1/groups/{group_id}/accounts",
            json={
                "name": "claering name",
                "description": "description",
                "type": "clearing",
            },
        )
        self.assertEqual(200, resp.status)
        ret_data = await resp.json()
        self.assertIsNotNone(ret_data["id"])
        account_id = ret_data["id"]

        base_account_id = await self.account_service.create_account(
            user_id=self.test_user_id,
            group_id=group_id,
            type="personal",
            name="account1",
            description="description",
        )
        await self._post(
            f"/api/v1/accounts/{account_id}",
            json={
                "name": "account1",
                "description": "description",
                "clearing_shares": {base_account_id: 2.0},
            },
        )

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
                "join_as_editor": False,
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
                "join_as_editor": True,
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

        user2_id, password = await self._create_test_user("user", "email2@email.stuff")
        _, session_id, _ = await self.user_service.login_user(
            "user", password=password, session_name="session1"
        )
        jwt_token = token_for_user(
            user2_id, session_id=session_id, secret_key=self.secret_key
        )
        resp = await self.client.post(
            f"/api/v1/groups/preview",
            json={"invite_token": invite_token},
            headers={"Authorization": f"Bearer {jwt_token}"},
        )
        self.assertEqual(200, resp.status)
        prev_group_data = await resp.json()
        self.assertEqual("group1", prev_group_data["name"])
        self.assertEqual(group_id, prev_group_data["id"])

        resp = await self.client.post(
            f"/api/v1/groups/join",
            json={"invite_token": invite_token},
            headers={"Authorization": f"Bearer {jwt_token}"},
        )
        self.assertEqual(204, resp.status)

        resp = await self.client.get(
            f"/api/v1/groups",
            headers={"Authorization": f"Bearer {jwt_token}"},
        )
        self.assertEqual(200, resp.status)
        groups = await resp.json()
        self.assertEqual(1, len(groups))

        resp = await self._get(f"/api/v1/groups/{group_id}/invites")
        self.assertEqual(200, resp.status)
        invites = await resp.json()
        self.assertEqual(0, len(invites))

        resp = await self._get(f"/api/v1/groups/{group_id}/logs")
        self.assertEqual(200, resp.status)
        logs = await resp.json()
        self.assertEqual(6, len(logs))
        self.assertEqual(
            {"group-created", "member-joined", "invite-created", "invite-deleted"},
            set([log["type"] for log in logs]),
        )

    async def test_group_log(self):
        group_id = await self.group_service.create_group(
            user_id=self.test_user_id,
            name="group1",
            description="description",
            currency_symbol="€",
            terms="terms",
        )

        resp = await self._post(
            f"/api/v1/groups/{group_id}/send_message", json={"message": "test message"}
        )
        self.assertEqual(204, resp.status)

        resp = await self._get(f"/api/v1/groups/{group_id}/logs")
        self.assertEqual(200, resp.status)
        logs = await resp.json()
        self.assertEqual(3, len(logs))
        self.assertEqual(
            {"group-created", "member-joined", "text-message"},
            set([log["type"] for log in logs]),
        )
