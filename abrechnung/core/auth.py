from sftkit.database import Connection
from sftkit.error import InvalidArgument

from abrechnung.domain.groups import GroupMember
from abrechnung.domain.users import User


async def check_group_permissions(
    conn: Connection,
    group_id: int,
    user: User,
    is_owner: bool = False,
    can_write: bool = False,
) -> GroupMember:
    membership = await conn.fetch_maybe_one(
        GroupMember,
        "select g.*, u.username from group_membership g "
        "join usr u on g.user_id = u.id "
        "where g.group_id = $1 and g.user_id = $2",
        group_id,
        user.id,
    )
    if membership is None:
        raise InvalidArgument(f"group not found")

    if can_write and not (membership.is_owner or membership.can_write):
        raise PermissionError(f"write access to group denied")

    if is_owner and not membership.is_owner:
        raise PermissionError(f"owner access to group denied")

    return membership


async def create_group_log(
    conn: Connection,
    group_id: int,
    user: User,
    type: str,
    message: str | None = None,
    affected_user_id: int | None = None,
):
    await conn.execute(
        "insert into group_log (group_id, user_id, type, message, affected) " "values ($1, $2, $3, $4, $5)",
        group_id,
        user.id,
        type,
        "" if message is None else message,
        affected_user_id,
    )
