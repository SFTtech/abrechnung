# pylint: disable=attribute-defined-outside-init,missing-kwoa
import asyncio
import os
import secrets

import pytest
from asyncpg.pool import Pool
from sftkit.database import DatabaseConfig

from abrechnung.application.accounts import AccountService
from abrechnung.application.groups import GroupService
from abrechnung.application.transactions import TransactionService
from abrechnung.application.users import UserService
from abrechnung.config import (
    ApiConfig,
    Config,
    EmailConfig,
    RegistrationConfig,
    ServiceConfig,
)
from abrechnung.database.migrations import get_database, reset_schema
from abrechnung.domain.groups import Group
from abrechnung.domain.users import User

lock = asyncio.Lock()


def get_test_db_config() -> DatabaseConfig:
    return DatabaseConfig(
        user=os.environ.get("TEST_DB_USER"),
        password=os.environ.get("TEST_DB_PASSWORD"),
        host=os.environ.get("TEST_DB_HOST"),
        dbname=os.environ.get("TEST_DB_DATABASE", "abrechnung_test"),
        port=int(os.environ.get("TEST_DB_PORT", "5432")),
        sslrootcert=None,
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
    ),
)


@pytest.fixture(scope="session")
async def db_pool() -> Pool:
    """
    get a connection pool to the test database
    """
    database = get_database(TEST_CONFIG.database)
    pool = await database.create_pool()

    await reset_schema(pool)
    await database.apply_migrations()

    return pool


@pytest.fixture
async def user_service(db_pool: Pool) -> UserService:
    return UserService(db_pool, config=TEST_CONFIG)


@pytest.fixture
async def group_service(db_pool: Pool) -> GroupService:
    return GroupService(db_pool, config=TEST_CONFIG)


@pytest.fixture
async def account_service(db_pool: Pool) -> AccountService:
    return AccountService(db_pool, config=TEST_CONFIG)


@pytest.fixture
async def transaction_service(db_pool: Pool) -> TransactionService:
    return TransactionService(db_pool, config=TEST_CONFIG)


@pytest.fixture
async def create_test_user(db_pool: Pool, user_service: UserService):
    async def _create() -> tuple[User, str]:
        async with db_pool.acquire() as conn:
            password = "asdf1234"
            hashed_password = user_service._hash_password(password)  # pylint: disable=protected-access
            user_id = await conn.fetchval(
                "insert into usr (username, email, hashed_password, pending) values ($1, $2, $3, false) returning id",
                secrets.token_hex(20),
                f"{secrets.token_hex(20)}@something.com",
                hashed_password,
            )
            user = await user_service.get_user(user_id=user_id)

            return user, password

    return _create


@pytest.fixture
async def dummy_user(create_test_user) -> User:
    user, _ = await create_test_user()
    return user


@pytest.fixture
async def dummy_group(group_service: GroupService, dummy_user: User) -> Group:
    group_id = await group_service.create_group(
        user=dummy_user,
        name=secrets.token_hex(16),
        description="description",
        currency_identifier="EUR",
        terms="terms",
        add_user_account_on_join=False,
    )
    return await group_service.get_group(user=dummy_user, group_id=group_id)
