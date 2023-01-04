import asyncpg
from fastapi import Request, Depends

from abrechnung.application.accounts import AccountService
from abrechnung.application.groups import GroupService
from abrechnung.application.transactions import TransactionService
from abrechnung.application.users import UserService
from abrechnung.config import Config


def get_config(request: Request) -> Config:
    return request.state.config


def get_db_pool(request: Request) -> asyncpg.Pool:
    return request.state.db_pool


async def get_db_conn(
    db_pool: asyncpg.Pool = Depends(get_db_pool),
) -> asyncpg.Connection:
    async with db_pool.acquire() as conn:
        yield conn


async def get_db_transaction(
    db_pool: asyncpg.Pool = Depends(get_db_pool),
) -> asyncpg.Connection:
    async with db_pool.acquire() as conn:
        async with conn.transaction():
            yield conn


def get_user_service(request: Request) -> UserService:
    return request.state.user_service


def get_group_service(request: Request) -> GroupService:
    return request.state.group_service


def get_account_service(request: Request) -> AccountService:
    return request.state.account_service


def get_transaction_service(request: Request) -> TransactionService:
    return request.state.transaction_service
