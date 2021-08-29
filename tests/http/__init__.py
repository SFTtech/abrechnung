import fcntl
import logging
import os
from pathlib import Path

import asyncpg
from aiohttp.abc import Application
from aiohttp.test_utils import AioHTTPTestCase

from abrechnung.application.accounts import AccountService
from abrechnung.application.groups import GroupService
from abrechnung.application.transactions import TransactionService
from abrechnung.application.users import UserService
from abrechnung.http import HTTPService
from abrechnung.http.auth import token_for_user
from tests.utils import get_test_db


lock_file = Path(f"/run/user/{os.getuid()}/abrechnungs_test_lock")


class BaseHTTPAPITest(AioHTTPTestCase):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        logging.basicConfig(level=logging.DEBUG)

    async def tearDownAsync(self) -> None:
        await self.http_service._unregister_forwarder(
            self.db_conn, forwarder_id="test_forwarder"
        )
        await self.db_conn.close()

        self.lock_fd.close()

    async def _create_test_user(self, username: str, email: str) -> tuple[int, str]:
        """returns the user id and password"""
        async with self.db_pool.acquire() as conn:
            password = "asdf1234"
            hashed_password = UserService._hash_password(password)
            user_id = await conn.fetchval(
                "insert into usr (username, email, hashed_password, pending) values ($1, $2, $3, false) returning id",
                username,
                email,
                hashed_password,
            )

            return user_id, password

    async def get_application(self) -> Application:
        self.db_pool = await get_test_db()

        self.secret_key = "asdf1234"
        self.http_service = HTTPService(config={"api": {"secret_key": self.secret_key}})

        lock_file.touch(exist_ok=True)

        self.lock_fd = lock_file.open("w")
        fcntl.lockf(self.lock_fd, fcntl.LOCK_EX)

        self.db_conn: asyncpg.Connection = await self.db_pool.acquire()
        await self.http_service._register_forwarder(
            self.db_conn, forwarder_id="test_forwarder"
        )

        self.group_service = GroupService(self.db_pool)
        self.account_service = AccountService(self.db_pool)
        self.user_service = UserService(self.db_pool)
        self.transaction_service = TransactionService(self.db_pool)

        app = self.http_service.create_app(
            secret_key=self.secret_key, db_pool=self.db_pool
        )

        return app


class HTTPAPITest(BaseHTTPAPITest):
    async def setUpAsync(self) -> None:
        await super().setUpAsync()

        self.test_user_id, _ = await self._create_test_user(
            "user1", "user1@email.stuff"
        )
        self.jwt_token = token_for_user(self.test_user_id, self.secret_key)

    async def _post(self, *args, **kwargs):
        headers = kwargs.pop("headers", {})
        headers.update({"Authorization": f"Bearer {self.jwt_token}"})
        kwargs["headers"] = headers
        return await self.client.post(*args, **kwargs)

    async def _delete(self, *args, **kwargs):
        headers = kwargs.pop("headers", {})
        headers.update({"Authorization": f"Bearer {self.jwt_token}"})
        kwargs["headers"] = headers
        return await self.client.delete(*args, **kwargs)

    async def _get(self, *args, **kwargs):
        headers = kwargs.pop("headers", {})
        headers.update({"Authorization": f"Bearer {self.jwt_token}"})
        kwargs["headers"] = headers
        return await self.client.get(*args, **kwargs)
