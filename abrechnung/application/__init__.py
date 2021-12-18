from typing import Optional

import asyncpg
from asyncpg.pool import Pool

from abrechnung.config import Config


class NotFoundError(Exception):
    pass


class InvalidCommand(Exception):
    pass


class Application:
    def __init__(self, db_pool: Pool, config: Config):
        self.db_pool = db_pool
        self.cfg = config


async def check_group_permissions(
    conn: asyncpg.Connection,
    group_id: int,
    user_id: int,
    is_owner: bool = False,
    can_write: bool = False,
) -> tuple[bool, bool]:
    membership = await conn.fetchrow(
        "select is_owner, can_write from group_membership where group_id = $1 and user_id = $2",
        group_id,
        user_id,
    )
    if membership is None:
        raise NotFoundError(f"group not found")

    if can_write and not (membership["is_owner"] or membership["can_write"]):
        raise PermissionError(f"write access to group denied")

    if is_owner and not membership["is_owner"]:
        raise PermissionError(f"owner access to group denied")

    return membership["can_write"], membership["is_owner"]


async def create_group_log(
    conn: asyncpg.Connection,
    group_id: int,
    user_id: int,
    type: str,
    message: Optional[str] = None,
    affected_user_id: Optional[int] = None,
):
    await conn.execute(
        "insert into group_log (group_id, user_id, type, message, affected) "
        "values ($1, $2, $3, $4, $5)",
        group_id,
        user_id,
        type,
        "" if message is None else message,
        affected_user_id,
    )
