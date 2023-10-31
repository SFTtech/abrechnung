from .errors import NotFoundError
from abrechnung.framework.database import Connection
from abrechnung.domain.users import User


async def check_group_permissions(
    conn: Connection,
    group_id: int,
    user: User,
    is_owner: bool = False,
    can_write: bool = False,
) -> tuple[bool, bool]:
    membership = await conn.fetchrow(
        "select is_owner, can_write from group_membership where group_id = $1 and user_id = $2",
        group_id,
        user.id,
    )
    if membership is None:
        raise NotFoundError(f"group not found")

    if can_write and not (membership["is_owner"] or membership["can_write"]):
        raise PermissionError(f"write access to group denied")

    if is_owner and not membership["is_owner"]:
        raise PermissionError(f"owner access to group denied")

    return membership["can_write"], membership["is_owner"]


async def create_group_log(
    conn: Connection,
    group_id: int,
    user: User,
    type: str,
    message: str | None = None,
    affected_user_id: int | None = None,
):
    await conn.execute(
        "insert into group_log (group_id, user_id, type, message, affected) "
        "values ($1, $2, $3, $4, $5)",
        group_id,
        user.id,
        type,
        "" if message is None else message,
        affected_user_id,
    )
