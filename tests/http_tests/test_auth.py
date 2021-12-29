import jwt

from abrechnung.http.auth import token_for_user
from tests.http_tests import BaseHTTPAPITest


class AuthAPITest(BaseHTTPAPITest):
    async def _login(
        self,
        username: str,
        password: str,
        session_name: str = "dummy session",
        expected_status: int = 200,
    ):
        resp = await self.client.post(
            f"/api/v1/auth/login",
            json={
                "username": username,
                "password": password,
                "session_name": session_name,
            },
        )
        self.assertEqual(expected_status, resp.status)
        return await resp.json()

    async def _fetch_profile(self, token: str, expected_status: int = 200):
        resp = await self.client.get(
            f"/api/v1/profile", headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(expected_status, resp.status)
        if resp.status < 400:
            return await resp.json()

        return None

    async def test_register_user(self):
        resp = await self.client.post(
            f"/api/v1/auth/register",
            json={
                "username": "user",
                "email": "email@mail.com",
                "password": "password",
            },
        )
        self.assertEqual(200, resp.status)
        ret_data = await resp.json()
        self.assertIsNotNone(ret_data["user_id"])

        resp = await self.client.post(
            f"/api/v1/auth/register",
            json={
                "username": "user2",
                "email": "email@mail.com",
                "password": "password",
            },
        )
        self.assertEqual(400, resp.status)

    async def test_login_user(self):
        user_name = "user"
        email = "email@email.com"
        user_id = await self.user_service.register_user(
            username=user_name, email=email, password="password"
        )
        await self._login(user_name, "password", expected_status=400)

        # fetch the registration token from the database
        async with self.db_pool.acquire() as conn:
            token = await conn.fetchval(
                "select token from pending_registration where user_id = $1", user_id
            )

        resp = await self.client.post(
            f"/api/v1/auth/confirm_registration", json={"token": str(token)}
        )
        self.assertEqual(204, resp.status)

        # now we should be able to login and get a session token
        resp = await self._login(email, "password")
        self.assertIsNotNone(resp["user_id"])
        self.assertIsNotNone(resp["access_token"])
        self.assertIsNotNone(resp["session_token"])

        resp = await self._login("user", "password")

        token = resp["access_token"]
        # now check that we can actually fetch our profile with the token
        ret_data = await self._fetch_profile(token)
        self.assertEqual(user_id, ret_data["id"])
        self.assertEqual(user_name, ret_data["username"])
        self.assertEqual(email, ret_data["email"])
        # we logged in twice, once with our email, once with our username
        self.assertEqual(2, len(ret_data["sessions"]))

        # also check that a random token does not pass
        await self._fetch_profile("foolol", expected_status=401)

        invalid_token = jwt.encode(
            {"user_id": user_id}, key="very_secret_invalid_key", algorithm="HS256"
        )
        await self._fetch_profile(invalid_token, expected_status=401)

        # now check that we can logout and afterwards not fetch the profile anymore
        resp = await self.client.post(
            f"/api/v1/auth/logout", headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(204, resp.status)
        await self._fetch_profile(token, expected_status=401)

    async def test_change_password(self):
        user_id, password = await self._create_test_user("user", "user@email.stuff")
        _, session_id, _ = await self.user_service.login_user(
            "user", password=password, session_name="session1"
        )
        token = token_for_user(user_id, session_id, self.secret_key)

        headers = {"Authorization": f"Bearer {token}"}

        # check that we cannot change anything without providing the correct password
        resp = await self.client.post(
            f"/api/v1/profile/change_password",
            headers=headers,
            json={"old_password": "foobar", "new_password": "password3"},
        )
        self.assertEqual(400, resp.status)

        resp = await self.client.post(
            f"/api/v1/profile/change_password",
            headers=headers,
            json={"old_password": password, "new_password": "password2"},
        )
        self.assertEqual(204, resp.status)

        # check that we can login with the new password
        await self._login("user", "password2")

    async def test_change_email(self):
        username = "user1"
        old_email = "user@stusta.de"
        new_email = "new_email@stusta.de"
        user_id, password = await self._create_test_user(username, old_email)
        _, session_id, _ = await self.user_service.login_user(
            username=username, password=password, session_name="session1"
        )
        token = token_for_user(user_id, session_id, self.secret_key)

        headers = {"Authorization": f"Bearer {token}"}
        resp = await self.client.post(
            f"/api/v1/profile/change_email",
            headers=headers,
            json={"email": new_email, "password": password},
        )
        self.assertEqual(204, resp.status)

        resp = await self.client.post(
            f"/api/v1/profile/change_email",
            headers=headers,
            json={"email": new_email, "password": "asdf1234"},
        )
        self.assertEqual(400, resp.status)

        resp = await self.client.get(f"/api/v1/profile", headers=headers)
        self.assertEqual(200, resp.status)
        profile = await resp.json()
        # we still have the old email
        self.assertEqual(old_email, profile["email"])

        # confirm the email change
        # fetch the registration token from the database
        async with self.db_pool.acquire() as conn:
            token = await conn.fetchval(
                "select token from pending_email_change where user_id = $1", user_id
            )
        resp = await self.client.post(
            f"/api/v1/auth/confirm_email_change", json={"token": "foobar lol"}
        )
        self.assertEqual(400, resp.status)

        resp = await self.client.post(
            f"/api/v1/auth/confirm_email_change", json={"token": str(token)}
        )
        self.assertEqual(204, resp.status)

        # now we have the new email
        resp = await self.client.get(f"/api/v1/profile", headers=headers)
        self.assertEqual(200, resp.status)
        profile = await resp.json()
        # we still have the old email
        self.assertEqual(new_email, profile["email"])

    async def test_reset_password(self):
        user_email = "user@stusta.de"
        username = "user1"
        user_id, password = await self._create_test_user(username, user_email)
        resp = await self.client.post(
            f"/api/v1/auth/recover_password",
            json={"email": "fooo@stusta.de"},
        )
        self.assertEqual(403, resp.status)

        resp = await self.client.post(
            f"/api/v1/auth/recover_password",
            json={"email": user_email},
        )
        self.assertEqual(204, resp.status)

        # confirm the email change
        # fetch the registration token from the database
        async with self.db_pool.acquire() as conn:
            token = await conn.fetchval(
                "select token from pending_password_recovery where user_id = $1",
                user_id,
            )

        self.assertIsNotNone(token)

        resp = await self.client.post(
            f"/api/v1/auth/confirm_password_recovery",
            json={"token": "foobar", "new_password": "secret secret"},
        )
        self.assertEqual(400, resp.status)

        resp = await self.client.post(
            f"/api/v1/auth/confirm_password_recovery",
            json={"token": str(token), "new_password": "new_password"},
        )
        self.assertEqual(204, resp.status)

        # check that we can login with the new password
        await self._login(username, "new_password")

    async def test_sessions(self):
        user_email = "user@email.email"
        username = "user1"
        user_id, password = await self._create_test_user(username, user_email)

        resp = await self._login(username, password, session_name="session1")
        token = resp["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        profile = await self._fetch_profile(token)
        self.assertEqual(1, len(profile["sessions"]))
        self.assertEqual("session1", profile["sessions"][0]["name"])
        session_id = profile["sessions"][0]["id"]

        resp = await self.client.post(
            "/api/v1/auth/rename_session",
            json={"session_id": session_id, "name": "new_session_name"},
            headers=headers,
        )
        self.assertEqual(204, resp.status)

        profile = await self._fetch_profile(token)
        self.assertEqual(1, len(profile["sessions"]))
        self.assertEqual("new_session_name", profile["sessions"][0]["name"])
        session_id = profile["sessions"][0]["id"]

        resp = await self.client.post(
            "/api/v1/auth/delete_session",
            json={"session_id": session_id},
            headers=headers,
        )
        self.assertEqual(204, resp.status)
        await self._fetch_profile(token, expected_status=401)
