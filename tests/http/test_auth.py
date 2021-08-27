import logging

from aiohttp import web
from aiohttp.test_utils import unittest_run_loop
from jose import jwt

from abrechnung.application.users import Users
from abrechnung.http import create_app
from abrechnung.http.auth import token_for_user
from abrechnung.system import create_runner
from tests.http import BaseHTTPAPITest


class AuthAPITest(BaseHTTPAPITest):
    async def get_application(self) -> web.Application:
        runner = create_runner()
        runner.start()

        self.user_service: Users = runner.get(Users)

        self.jwt_secret_key = "asdf1234"
        app = create_app(runner=runner, secret_key=self.jwt_secret_key)
        logging.basicConfig(level=logging.DEBUG)

        return app

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
        user_id = self.user_service.register_user(
            username="user", email="email@email.com", password="password"
        )
        resp = await self.client.post(
            f"/api/v1/auth/login",
            json={"username": "user", "password": "password"},
        )
        self.assertEqual(200, resp.status)
        ret_data = await resp.json()
        self.assertIsNotNone(ret_data["user_id"])
        self.assertIsNotNone(ret_data["access_token"])

        token = ret_data["access_token"]
        # now check that we can actually fetch our profile with the token
        resp = await self.client.get(
            f"/api/v1/profile", headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(200, resp.status)
        ret_data = await resp.json()
        self.assertEqual(str(user_id), ret_data["id"])
        self.assertEqual("user", ret_data["username"])
        self.assertEqual("email@email.com", ret_data["email"])

        # also check that a random token does not pass
        resp = await self.client.get(
            f"/api/v1/profile", headers={"Authorization": f"Bearer foolol"}
        )
        self.assertEqual(401, resp.status)

        invalid_token = jwt.encode(
            {"user_id": str(user_id)}, key="very_secret_invalid_key", algorithm="HS256"
        )
        resp = await self.client.get(
            f"/api/v1/profile", headers={"Authorization": f"Bearer {invalid_token}"}
        )
        self.assertEqual(401, resp.status)

    @unittest_run_loop
    async def test_profile_management(self):
        user_id = self.user_service.register_user(
            username="user", email="email@email.com", password="password"
        )
        token = token_for_user(user_id, self.jwt_secret_key)

        headers = {"Authorization": f"Bearer {token}"}

        resp = await self.client.post(
            f"/api/v1/profile/change_email",
            headers=headers,
            json={"email": "new_email@email.com", "password": "password"},
        )
        self.assertEqual(204, resp.status)

        resp = await self.client.get(f"/api/v1/profile", headers=headers)
        self.assertEqual(200, resp.status)
        profile = await resp.json()
        self.assertEqual("new_email@email.com", profile["email"])

        resp = await self.client.post(
            f"/api/v1/profile/change_password",
            headers=headers,
            json={"old_password": "password", "new_password": "password2"},
        )
        self.assertEqual(204, resp.status)

        # check that we cannot change anything without providing the correct password
        resp = await self.client.post(
            f"/api/v1/profile/change_password",
            headers=headers,
            json={"old_password": "password", "new_password": "password3"},
        )
        self.assertEqual(400, resp.status)
