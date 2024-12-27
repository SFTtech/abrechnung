# pylint: disable=attribute-defined-outside-init,missing-kwoa
import asyncio
import logging
import os
from unittest import IsolatedAsyncioTestCase as TestCase

import asyncpg
from asyncpg.pool import Pool
from sftkit.database import DatabaseConfig

from abrechnung.application.users import UserService
from abrechnung.config import (
    ApiConfig,
    Config,
    EmailConfig,
    RegistrationConfig,
    ServiceConfig,
)
from abrechnung.database.migrations import get_database, reset_schema
from abrechnung.domain.users import User

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
        base_url="https://abrechnung.example.lol",
    ),
    registration=RegistrationConfig(enabled=True),
    database=get_test_db_config(),
    service=ServiceConfig(
        name="Test Abrechnung",
        url="https://abrechnung.example.lol",
    ),
)


async def get_test_db() -> Pool:
    """
    get a connection pool to the test database
    """
    database = get_database(TEST_CONFIG)
    pool = await database.create_pool()

    await reset_schema(pool)
    await database.apply_migrations()

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
