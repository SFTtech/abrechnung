from datetime import timedelta, datetime, timezone

from tests.http_tests.common import HTTPAPITest


class GroupAPITest(HTTPAPITest):
    async def _fetch_group(self, group_id: int, expected_status: int = 200) -> dict:
        resp = await self._get(f"/api/v1/groups/{group_id}")
        self.assertEqual(expected_status, resp.status_code)
        if expected_status >= 400:
            return {}
        ret_data = resp.json()
        self.assertEqual(group_id, ret_data["id"])
        return ret_data

    async def _fetch_account(self, account_id: int, expected_status: int = 200) -> dict:
        resp = await self._get(f"/api/v1/accounts/{account_id}")
        self.assertEqual(expected_status, resp.status_code)
        if expected_status >= 400:
            return {}
        ret_data = resp.json()
        self.assertEqual(account_id, ret_data["id"])
        return ret_data

    async def _fetch_members(self, group_id: int, expected_status: int = 200) -> dict:
        resp = await self._get(f"/api/v1/groups/{group_id}/members")
        self.assertEqual(expected_status, resp.status_code)
        if expected_status >= 400:
            return {}
        ret_data = resp.json()
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
        self.assertEqual(200, resp.status_code)
        ret_data = resp.json()
        self.assertIsNotNone(ret_data["id"])
        group_id = ret_data["id"]

        group = await self._fetch_group(group_id)
        self.assertEqual("name", group["name"])

        await self._fetch_group(13333, 404)

        resp = await self._post(
            f"/api/v1/groups/{group_id}",
            json={
                "name": "name2",
                "description": "description2",
                "currency_symbol": "$",
                "terms": "new terms",
                "add_user_account_on_join": False,
            },
        )
        self.assertEqual(200, resp.status_code)

        group = await self._fetch_group(group_id)
        self.assertEqual("name2", group["name"])
        self.assertEqual("description2", group["description"])
        self.assertEqual("$", group["currency_symbol"])
        self.assertEqual("new terms", group["terms"])

    async def test_delete_group(self):
        user2, user2_password = await self._create_test_user("user2", "user2@test.com")
        _, session_id, session_token = await self.user_service.login_user(
            username="user2", password=user2_password, session_name="foobar"
        )
        user2_token = await self.user_service.get_access_token_from_session_token(
            session_token=session_token
        )
        group_id = await self.group_service.create_group(
            user=self.test_user,
            name="foobar",
            description="foobar",
            currency_symbol="€",
            terms="foo",
            add_user_account_on_join=False,
        )
        async with self.db_pool.acquire() as conn:
            await conn.execute(
                "insert into group_membership (user_id, group_id, is_owner, can_write) "
                "values ($1, $2, true, true)",
                user2.id,
                group_id,
            )

        account1_id = await self.account_service.create_account(
            user=self.test_user,
            group_id=group_id,
            type="personal",
            name="account1",
            description="",
        )
        account2_id = await self.account_service.create_account(
            user=self.test_user,
            group_id=group_id,
            type="personal",
            name="account2",
            description="",
        )

        transaction_id = await self.transaction_service.create_transaction(
            user=self.test_user,
            group_id=group_id,
            type="purchase",
            name="asdf",
            description="asdf",
            billed_at=datetime.now(tz=timezone.utc),
            currency_symbol="€",
            currency_conversion_rate=1.0,
            tags=[],
            value=20.0,
            debitor_shares={account1_id: 1.0},
            creditor_shares={account2_id: 1.0},
        )

        resp = await self._delete(f"/api/v1/groups/{group_id}")
        self.assertEqual(403, resp.status_code)

        resp = await self._post(f"/api/v1/groups/{group_id}/leave")
        self.assertEqual(204, resp.status_code)

        await self._fetch_group(group_id, expected_status=404)

        resp = await self.client.delete(
            f"/api/v1/groups/{group_id}",
            headers={"Authorization": f"Bearer {user2_token}"},
        )
        self.assertEqual(204, resp.status_code)

        async with self.db_pool.acquire() as conn:
            gid = await conn.fetchval("select id from grp where grp.id = $1", group_id)
            self.assertIsNone(gid)

    async def test_list_groups(self):
        resp = await self._get(f"/api/v1/groups")
        self.assertEqual(200, resp.status_code)
        ret_data = resp.json()
        self.assertEqual(0, len(ret_data))

        group1_id = await self.group_service.create_group(
            user=self.test_user,
            name="name1",
            description="description",
            currency_symbol="€",
            terms="terms",
            add_user_account_on_join=False,
        )
        group2_id = await self.group_service.create_group(
            user=self.test_user,
            name="name2",
            description="description",
            currency_symbol="€",
            terms="terms",
            add_user_account_on_join=False,
        )
        resp = await self._get(f"/api/v1/groups")
        self.assertEqual(200, resp.status_code)
        ret_data = resp.json()
        self.assertEqual(2, len(ret_data))
        self.assertEqual({group1_id, group2_id}, set([e["id"] for e in ret_data]))

    async def test_create_account(self):
        group_id = await self.group_service.create_group(
            user=self.test_user,
            name="name",
            description="description",
            currency_symbol="€",
            terms="terms",
            add_user_account_on_join=False,
        )
        resp = await self._post(
            f"/api/v1/groups/{group_id}/accounts",
            json={
                "name": "name",
                "description": "description",
                "type": "personal",
            },
        )
        self.assertEqual(200, resp.status_code)
        ret_data = resp.json()
        self.assertIsNotNone(ret_data["id"])

    async def test_update_account(self):
        group_id = await self.group_service.create_group(
            user=self.test_user,
            name="name",
            description="description",
            currency_symbol="€",
            terms="terms",
            add_user_account_on_join=False,
        )
        account_id = await self.account_service.create_account(
            user=self.test_user,
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
        self.assertEqual(200, resp.status_code)

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
        self.assertEqual(200, resp.status_code)
        a = await self._fetch_account(account_id)
        self.assertEqual("new_name2", a["committed_details"]["name"])
        self.assertEqual("description1", a["committed_details"]["description"])

    async def test_list_accounts(self):
        group_id = await self.group_service.create_group(
            user=self.test_user,
            name="name",
            description="description",
            currency_symbol="€",
            terms="terms",
            add_user_account_on_join=False,
        )
        account1_id = await self.account_service.create_account(
            user=self.test_user,
            group_id=group_id,
            type="personal",
            name="account1",
            description="description",
        )
        account2_id = await self.account_service.create_account(
            user=self.test_user,
            group_id=group_id,
            type="personal",
            name="account2",
            description="description",
        )
        resp = await self._get(f"/api/v1/groups/{group_id}/accounts")
        self.assertEqual(200, resp.status_code)
        ret_data = resp.json()
        self.assertEqual(2, len(ret_data))
        self.assertEqual({account1_id, account2_id}, set([e["id"] for e in ret_data]))

    async def test_members(self):
        group_id = await self.group_service.create_group(
            user=self.test_user,
            name="name",
            description="description",
            currency_symbol="€",
            terms="terms",
            add_user_account_on_join=False,
        )
        members = await self._fetch_members(group_id)
        self.assertEqual(1, len(members))
        self.assertEqual({self.test_user.id}, set([m["user_id"] for m in members]))

        user2, _ = await self._create_test_user("user2", "user2@email.stuff")
        async with self.db_pool.acquire() as conn:
            await conn.execute(
                "insert into group_membership (user_id, group_id, invited_by) values ($1, $2, $3)",
                user2.id,
                group_id,
                self.test_user.id,
            )

        members = await self._fetch_members(group_id)
        self.assertEqual(2, len(members))
        self.assertEqual(
            {self.test_user.id, user2.id}, set([m["user_id"] for m in members])
        )

        resp = await self._post(
            f"/api/v1/groups/{group_id}/members",
            json={"user_id": user2.id, "can_write": True, "is_owner": False},
        )
        self.assertEqual(200, resp.status_code)

        members = await self._fetch_members(group_id)
        self.assertEqual(2, len(members))
        self.assertTrue(
            list(filter(lambda x: x["user_id"] == user2.id, members))[0]["can_write"]
        )
        self.assertFalse(
            list(filter(lambda x: x["user_id"] == user2.id, members))[0]["is_owner"]
        )

        resp = await self._post(
            f"/api/v1/groups/{group_id}/members",
            json={"user_id": user2.id, "can_write": True, "is_owner": True},
        )
        self.assertEqual(200, resp.status_code)

        members = await self._fetch_members(group_id)
        self.assertEqual(2, len(members))
        self.assertTrue(
            list(filter(lambda x: x["user_id"] == user2.id, members))[0]["can_write"]
        )
        self.assertTrue(
            list(filter(lambda x: x["user_id"] == user2.id, members))[0]["is_owner"]
        )

    async def test_get_account(self):
        group_id = await self.group_service.create_group(
            user=self.test_user,
            name="name",
            description="description",
            currency_symbol="€",
            terms="terms",
            add_user_account_on_join=False,
        )
        account_id = await self.account_service.create_account(
            user=self.test_user,
            group_id=group_id,
            type="personal",
            name="account1",
            description="description",
        )
        ret_data = await self._fetch_account(account_id)
        self.assertEqual("account1", ret_data["committed_details"]["name"])

        resp = await self._get(f"/api/v1/accounts/asdf1234")
        self.assertEqual(422, resp.status_code)

        resp = await self._get(f"/api/v1/accounts/13232")
        self.assertEqual(404, resp.status_code)

    async def test_clearing_accounts(self):
        group_id = await self.group_service.create_group(
            user=self.test_user,
            name="name",
            description="description",
            currency_symbol="€",
            terms="terms",
            add_user_account_on_join=False,
        )
        resp = await self._post(
            f"/api/v1/groups/{group_id}/accounts",
            json={
                "name": "claering name",
                "description": "description",
                "type": "clearing",
                "date_info": datetime.now().date().isoformat(),
            },
        )
        self.assertEqual(200, resp.status_code)
        ret_data = resp.json()
        self.assertIsNotNone(ret_data["id"])
        account_id = ret_data["id"]

        base_account_id = await self.account_service.create_account(
            user=self.test_user,
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
                "date_info": datetime.now().date().isoformat(),
            },
        )

    async def test_invites(self):
        group_id = await self.group_service.create_group(
            user=self.test_user,
            name="group1",
            description="description",
            currency_symbol="€",
            terms="terms",
            add_user_account_on_join=False,
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
        self.assertEqual(200, resp.status_code)

        resp = await self._get(f"/api/v1/groups/{group_id}/invites")
        self.assertEqual(200, resp.status_code)
        invites = resp.json()
        self.assertEqual(1, len(invites))

        # we hardcode assume the invite id is 0 to check if the id counting works as expected
        resp = await self._delete(
            f"/api/v1/groups/{group_id}/invites/{invites[0]['id']}"
        )
        self.assertEqual(204, resp.status_code)

        resp = await self._get(f"/api/v1/groups/{group_id}/invites")
        self.assertEqual(200, resp.status_code)
        invites = resp.json()
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
        self.assertEqual(200, resp.status_code)

        resp = await self._get(f"/api/v1/groups/{group_id}/invites")
        self.assertEqual(200, resp.status_code)
        invites = resp.json()
        self.assertEqual(1, len(invites))
        invite_token = invites[0]["token"]
        self.assertIsNotNone(invite_token)

        user2, password = await self._create_test_user("user", "email2@email.stuff")
        _, session_id, session_token = await self.user_service.login_user(
            username="user", password=password, session_name="session1"
        )
        jwt_token = await self.user_service.get_access_token_from_session_token(
            session_token=session_token
        )
        resp = await self.client.post(
            "/api/v1/groups/preview",
            json={"invite_token": invite_token},
            headers={"Authorization": f"Bearer {jwt_token}"},
        )
        self.assertEqual(200, resp.status_code)
        prev_group_data = resp.json()
        self.assertEqual("group1", prev_group_data["name"])
        self.assertEqual(group_id, prev_group_data["id"])

        resp = await self.client.post(
            "/api/v1/groups/join",
            json={"invite_token": invite_token},
            headers={"Authorization": f"Bearer {jwt_token}"},
        )
        self.assertEqual(200, resp.status_code)

        resp = await self.client.get(
            "/api/v1/groups",
            headers={"Authorization": f"Bearer {jwt_token}"},
        )
        self.assertEqual(200, resp.status_code)
        groups = resp.json()
        self.assertEqual(1, len(groups))

        resp = await self._get(f"/api/v1/groups/{group_id}/invites")
        self.assertEqual(200, resp.status_code)
        invites = resp.json()
        self.assertEqual(0, len(invites))

        resp = await self._get(f"/api/v1/groups/{group_id}/logs")
        self.assertEqual(200, resp.status_code)
        logs = resp.json()
        self.assertEqual(6, len(logs))
        self.assertEqual(
            {"group-created", "member-joined", "invite-created", "invite-deleted"},
            set([log["type"] for log in logs]),
        )

    async def test_group_log(self):
        group_id = await self.group_service.create_group(
            user=self.test_user,
            name="group1",
            description="description",
            currency_symbol="€",
            terms="terms",
            add_user_account_on_join=False,
        )

        resp = await self._post(
            f"/api/v1/groups/{group_id}/send_message", json={"message": "test message"}
        )
        self.assertEqual(204, resp.status_code)

        resp = await self._get(f"/api/v1/groups/{group_id}/logs")
        self.assertEqual(200, resp.status_code)
        logs = resp.json()
        self.assertEqual(3, len(logs))
        self.assertEqual(
            {"group-created", "member-joined", "text-message"},
            set([log["type"] for log in logs]),
        )
