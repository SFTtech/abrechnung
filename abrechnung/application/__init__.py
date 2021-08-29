from functools import wraps

import asyncpg
from asyncpg.pool import Pool


class NotFoundError(Exception):
    pass


class CommandError(Exception):
    pass


class Application:
    def __init__(self, db_pool: Pool):
        self.db_pool = db_pool


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
        raise PermissionError(f"access to group denied")

    if can_write and not (membership["is_owner"] or membership["can_write"]):
        raise PermissionError(f"write access to group denied")

    if is_owner and not membership["is_owner"]:
        raise PermissionError(f"owner access to group denied")

    return membership["can_write"], membership["is_owner"]
