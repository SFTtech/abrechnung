from aiohttp.test_utils import unittest_run_loop
from jose import jwt

from abrechnung.http.auth import token_for_user
from tests.http_tests import BaseHTTPAPITest


class AuthAPITest(BaseHTTPAPITest):
    @unittest_run_loop
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

    @unittest_run_loop
    async def test_login_user(self):
        user_id = await self.user_service.register_user(
            username="user", email="email@email.com", password="password"
        )
        resp = await self.client.post(
            f"/api/v1/auth/login",
            json={"username": "user", "password": "password"},
        )
        # we cannot login yet as the registration is still pending
        self.assertEqual(401, resp.status)

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
        resp = await self.client.post(
            f"/api/v1/auth/login",
            json={"username": "user", "password": "password"},
        )
        self.assertEqual(200, resp.status)
        ret_data = await resp.json()
        self.assertIsNotNone(ret_data["user_id"])
        self.assertIsNotNone(ret_data["access_token"])
        self.assertIsNotNone(ret_data["session_token"])

        token = ret_data["access_token"]
        # now check that we can actually fetch our profile with the token
        resp = await self.client.get(
            f"/api/v1/profile", headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(200, resp.status)
        ret_data = await resp.json()
        self.assertEqual(user_id, ret_data["id"])
        self.assertEqual("user", ret_data["username"])
        self.assertEqual("email@email.com", ret_data["email"])

        # also check that a random token does not pass
        resp = await self.client.get(
            f"/api/v1/profile", headers={"Authorization": f"Bearer foolol"}
        )
        self.assertEqual(401, resp.status)

        invalid_token = jwt.encode(
            {"user_id": user_id}, key="very_secret_invalid_key", algorithm="HS256"
        )
        resp = await self.client.get(
            f"/api/v1/profile", headers={"Authorization": f"Bearer {invalid_token}"}
        )
        self.assertEqual(401, resp.status)

    @unittest_run_loop
    async def test_change_password(self):
        user_id, password = await self._create_test_user("user", "user@email.stuff")
        _, session_id, _ = await self.user_service.login_user("user", password=password)
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
        resp = await self.client.post(
            f"/api/v1/auth/login",
            json={"username": "user", "password": "password2"},
        )
        self.assertEqual(200, resp.status)

    @unittest_run_loop
    async def test_change_email(self):
        username = "user1"
        old_email = "user@email.stuff"
        new_email = "new_email@email.stuffs"
        user_id, password = await self._create_test_user(username, old_email)
        _, session_id, _ = await self.user_service.login_user(
            username=username, password=password
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

    @unittest_run_loop
    async def test_reset_password(self):
        user_email = "user@email.email"
        username = "user1"
        user_id, password = await self._create_test_user(username, user_email)
        resp = await self.client.post(
            f"/api/v1/auth/recover_password",
            json={"email": "fooo@lulz.lul"},
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
        resp = await self.client.post(
            f"/api/v1/auth/login",
            json={"username": username, "password": "new_password"},
        )
        self.assertEqual(200, resp.status)
