import asyncio
import logging
import os
from unittest import IsolatedAsyncioTestCase as TestCase

import asyncpg
from asyncpg.pool import Pool

from abrechnung.application.users import UserService
from abrechnung.config import Config
from abrechnung.database import revisions
from abrechnung.domain.users import User

lock = asyncio.Lock()


def get_test_db_config() -> dict:
    return {
        "user": os.environ.get("TEST_DB_USER", "abrechnung-test"),
        "password": os.environ.get("TEST_DB_PASSWORD", "asdf1234"),
        "host": os.environ.get("TEST_DB_HOST", "localhost"),
        "dbname": os.environ.get("TEST_DB_DATABASE", "abrechnung-test"),
        "port": int(os.environ.get("TEST_DB_PORT", 5432)),
    }


TEST_CONFIG = {
    "api": {
        "secret_key": "asdf",
        "host": "localhost",
        "port": 8000,
    },
    "registration": {"enabled": True},
    "database": get_test_db_config(),
    "service": {
        "url": "https://abrechnung.example.lol",
        "api_url": "https://abrechnung.example.lol",
        "name": "Test Abrechnung",
    },
}


async def get_test_db() -> Pool:
    """
    get a connection pool to the test database
    """
    cfg = get_test_db_config()
    pool = await asyncpg.create_pool(
        user=cfg["user"],
        password=cfg["password"],
        database=cfg["dbname"],
        host=cfg["host"],
        port=cfg["port"],
        min_size=5,
        max_size=5,
    )

    await revisions.reset_schema(pool)
    await revisions.apply_revisions(pool)

    return pool


class AsyncTestCase(TestCase):
    def __init__(self, *args, log_level=logging.DEBUG, **kwargs):
        super().__init__(*args, **kwargs)
        logging.basicConfig(level=log_level)

    async def _create_test_user(self, username: str, email: str) -> tuple[User, str]:
        """returns the user id and password"""
        # pylint: disable=protected-access
        async with self.db_pool.acquire() as conn:
            password = "asdf1234"
            hashed_password = UserService._hash_password(password)
            user_id = await conn.fetchval(
                "insert into usr (username, email, hashed_password, pending) values ($1, $2, $3, false) returning id",
                username,
                email,
                hashed_password,
            )
            user = await self.user_service.get_user(user_id=user_id)

            return user, password

    def setUp(self) -> None:
        try:
            self.loop = asyncio.get_running_loop()
        except (AttributeError, RuntimeError):  # AttributeError->py36
            self.loop = asyncio.get_event_loop_policy().get_event_loop()

        self.loop.run_until_complete(self._setup_db())
        self.loop.run_until_complete(self.setUpAsync())

    async def _setup_db(self):
        await lock.acquire()

        self.db_pool = await get_test_db()
        self.db_conn: asyncpg.Connection = await self.db_pool.acquire()

    async def _teardown_db(self):
        await self.db_conn.close()
        await self.db_pool.close()

        lock.release()

    async def setUpAsync(self) -> None:
        self.secret_key = "asdf1234"
        self.test_config = Config.from_dict(TEST_CONFIG)
        self.user_service = UserService(self.db_pool, config=self.test_config)

    def tearDown(self) -> None:
        self.loop.run_until_complete(self.tearDownAsync())
        self.loop.run_until_complete(self._teardown_db())

    async def tearDownAsync(self) -> None:
        pass
