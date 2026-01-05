# pylint: disable=attribute-defined-outside-init,missing-kwoa
import os
import secrets
from datetime import date
from typing import Awaitable, Protocol

import pytest
from asyncpg.pool import Pool
from sftkit.database import DatabaseConfig

from abrechnung.application.accounts import AccountService
from abrechnung.application.export_import import ExportImportService
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
from abrechnung.domain.accounts import AccountType, ClearingAccount, ClearingShares, NewAccount, PersonalAccount
from abrechnung.domain.groups import Group
from abrechnung.domain.transactions import (
    NewFile,
    NewTransaction,
    NewTransactionPosition,
    Transaction,
    TransactionShares,
    TransactionType,
)
from abrechnung.domain.users import User


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
async def export_import_service(
    db_pool: Pool, group_service: GroupService, account_service: AccountService, transaction_service: TransactionService
) -> ExportImportService:
    return ExportImportService(
        db_pool,
        config=TEST_CONFIG,
        group_service=group_service,
        account_service=account_service,
        transaction_service=transaction_service,
    )


class CreateTestUser(Protocol):
    def __call__(self) -> Awaitable[tuple[User, str]]: ...


@pytest.fixture
async def create_test_user(db_pool: Pool, user_service: UserService) -> CreateTestUser:
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
async def dummy_user(create_test_user: CreateTestUser) -> User:
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


class CreateTestAccount(Protocol):
    def __call__(self, group_id: int) -> Awaitable[PersonalAccount]: ...


@pytest.fixture
async def create_test_account(account_service: AccountService, dummy_user: User) -> CreateTestAccount:
    async def _create(group_id: int) -> PersonalAccount:
        account_id: int = await account_service.create_account(
            user=dummy_user,
            group_id=group_id,
            account=NewAccount(
                type=AccountType.personal,
                name=secrets.token_hex(16),
                description=f"account {secrets.token_hex(16)} description",
            ),
        )
        account = await account_service.get_account(user=dummy_user, group_id=group_id, account_id=account_id)
        return account

    return _create


class CreateTestEvent(Protocol):
    def __call__(self, group_id: int, clearing_shares: ClearingShares) -> Awaitable[ClearingAccount]: ...


@pytest.fixture
async def create_test_event(account_service: AccountService, dummy_user: User) -> CreateTestEvent:
    async def _create(group_id: int, clearing_shares: ClearingShares) -> ClearingAccount:
        account_id: int = await account_service.create_account(
            user=dummy_user,
            group_id=group_id,
            account=NewAccount(
                type=AccountType.clearing,
                name=secrets.token_hex(16),
                description=f"account {secrets.token_hex(16)} description",
                date_info=date.today(),
                clearing_shares=clearing_shares,
            ),
        )
        account = await account_service.get_account(user=dummy_user, group_id=group_id, account_id=account_id)
        return account

    return _create


class CreateTestPurchase(Protocol):
    def __call__(
        self,
        group_id: int,
        value: float,
        creditor_id: int,
        debitor_shares: TransactionShares,
        positions: list[NewTransactionPosition] | None = None,
        files: list[NewFile] | None = None,
    ) -> Awaitable[Transaction]: ...


@pytest.fixture
async def create_test_purchase(transaction_service: TransactionService, dummy_user: User) -> CreateTestPurchase:
    async def _create(
        group_id: int,
        value: float,
        creditor_id: int,
        debitor_shares: TransactionShares,
        positions: list[NewTransactionPosition] | None = None,
        files: list[NewFile] | None = None,
    ) -> Transaction:
        files = files or []
        positions = positions or []
        transaction_id: int = await transaction_service.create_transaction(
            user=dummy_user,
            group_id=group_id,
            transaction=NewTransaction(
                type=TransactionType.purchase,
                name=secrets.token_hex(16),
                description="transaction description",
                currency_identifier="EUR",
                currency_conversion_rate=1.0,
                value=value,
                creditor_shares={creditor_id: 1.0},
                debitor_shares=debitor_shares,
                billed_at=date.today(),
                tags=[],
                new_files=files,
                new_positions=positions,
            ),
        )
        transaction = await transaction_service.get_transaction(user=dummy_user, transaction_id=transaction_id)
        return transaction

    return _create


class CreateTestTransfer(Protocol):
    def __call__(
        self,
        group_id: int,
        value: float,
        creditor_id: int,
        debitor_id: int,
    ) -> Awaitable[Transaction]: ...


@pytest.fixture
async def create_test_transfer(transaction_service: TransactionService, dummy_user: User) -> CreateTestTransfer:
    async def _create(
        group_id: int,
        value: float,
        creditor_id: int,
        debitor_id: int,
    ) -> Transaction:
        transaction_id: int = await transaction_service.create_transaction(
            user=dummy_user,
            group_id=group_id,
            transaction=NewTransaction(
                type=TransactionType.transfer,
                name=secrets.token_hex(16),
                description="transaction description",
                currency_identifier="EUR",
                currency_conversion_rate=1.0,
                value=value,
                creditor_shares={creditor_id: 1.0},
                debitor_shares={debitor_id: 1.0},
                billed_at=date.today(),
                tags=[],
                new_files=[],
                new_positions=[],
            ),
        )
        transaction = await transaction_service.get_transaction(user=dummy_user, transaction_id=transaction_id)
        return transaction

    return _create
