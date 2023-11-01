# pylint: disable=attribute-defined-outside-init,missing-kwoa
import asyncio
import logging
import os
from unittest import IsolatedAsyncioTestCase as TestCase

import asyncpg
from asyncpg.pool import Pool

from abrechnung.application.users import UserService
from abrechnung.config import Config, EmailConfig, ApiConfig, RegistrationConfig, ServiceConfig
from abrechnung.database.migrations import reset_schema, apply_revisions
from abrechnung.domain.users import User
from abrechnung.framework.database import create_db_pool, DatabaseConfig

lock = asyncio.Lock()


def get_test_db_config() -> DatabaseConfig:
    return DatabaseConfig(
        user=os.environ.get("TEST_DB_USER", "abrechnung-test"),
        password=os.environ.get("TEST_DB_PASSWORD", "asdf1234"),
        host=os.environ.get("TEST_DB_HOST", "localhost"),
        dbname=os.environ.get("TEST_DB_DATABASE", "abrechnung-test"),
        port=int(os.environ.get("TEST_DB_PORT", 5432)),
    )


TEST_CONFIG = Config(
    email=EmailConfig(
        host="localhost",
        port=555555,
        address="abrechnung@stusta.de",
    ),
    api=ApiConfig(
        secret_key="asdf",
        host="localhost",
        port=8000,
    ),
    registration=RegistrationConfig(enabled=True),
    database=get_test_db_config(),
    service=ServiceConfig(
        url="https://abrechnung.example.lol",
        api_url="https://abrechnung.example.lol",
        name="Test Abrechnung",
    ),
)


async def get_test_db() -> Pool:
    """
    get a connection pool to the test database
    """
    pool = await create_db_pool(TEST_CONFIG.database)

    await reset_schema(pool)
    await apply_revisions(pool)

    return pool


class BaseTestCase(TestCase):
    def __init__(self, *args, log_level=logging.DEBUG, **kwargs):
        super().__init__(*args, **kwargs)
        logging.basicConfig(level=log_level)

    async def _create_test_user(self, username: str, email: str) -> tuple[User, str]:
        """returns the user id and password"""
        # pylint: disable=protected-access
        async with self.db_pool.acquire() as conn:
            password = "asdf1234"
            hashed_password = self.user_service._hash_password(password)
            user_id = await conn.fetchval(
                "insert into usr (username, email, hashed_password, pending) values ($1, $2, $3, false) returning id",
                username,
                email,
                hashed_password,
            )
            user = await self.user_service.get_user(user_id=user_id)

            return user, password

    async def asyncSetUp(self) -> None:
        await lock.acquire()
        self.db_pool = await get_test_db()
        self.db_conn: asyncpg.Connection = await self.db_pool.acquire()
        self.test_config = TEST_CONFIG
        self.user_service = UserService(self.db_pool, config=self.test_config)

    async def asyncTearDown(self) -> None:
        await self.db_conn.close()
        await self.db_pool.close()

        lock.release()
