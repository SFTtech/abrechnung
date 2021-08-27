from functools import wraps

from asyncpg.pool import Pool


class NotFoundError(Exception):
    pass


class Application:
    def __init__(self, db_pool: Pool):
        self.db_pool = db_pool


def require_group_permissions(is_owner: bool = False, can_write: bool = False):
    def decorator(func):
        @wraps(func)
        async def wrapper(self, *, user_id, group_id, **kwargs):
            async with self.db_pool.acquire() as conn:
                membership = await conn.fetchrow(
                    "select is_owner, can_write from group_membership where group_id = $1 and user_id = $2",
                    group_id,
                    user_id,
                )
                if membership is None:
                    raise PermissionError(f"access to group denied")

                if can_write and not (
                    membership["is_owner"] or membership["can_write"]
                ):
                    raise PermissionError(f"write access to group denied")

                if is_owner and not membership["is_owner"]:
                    raise PermissionError(f"owner access to group denied")

            return await func(user_id=user_id, group_id=group_id, **kwargs)

        return wrapper

    return decorator
