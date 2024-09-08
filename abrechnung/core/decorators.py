from functools import wraps
from inspect import Parameter, signature
from typing import Awaitable, Callable, TypeVar

from abrechnung.core.auth import check_group_permissions

R = TypeVar("R")


def _add_arg_to_signature(original_func, new_func, name: str, annotation):
    sig = signature(original_func)
    if name in sig.parameters:
        return
    new_parameters = tuple(sig.parameters.values()) + (
        Parameter(name, kind=Parameter.KEYWORD_ONLY, annotation=annotation),
    )
    sig = sig.replace(parameters=new_parameters)
    new_func.__signature__ = sig  # type: ignore


def requires_group_permissions(
    requires_write: bool = False, requires_owner: bool = False
) -> Callable[[Callable[..., Awaitable[R]]], Callable[..., Awaitable[R]]]:
    def f(func: Callable[..., Awaitable[R]]):
        original_signature = signature(func)

        @wraps(func)
        async def wrapper(*args, **kwargs):
            if "conn" not in kwargs:
                raise RuntimeError(
                    "requires_group_permissions needs a database connection, "
                    "with_db_transaction needs to be put before this decorator"
                )

            if "group_id" not in kwargs:
                raise RuntimeError("requires_group_permissions requires 'group_id' to be a keyword argument")

            if "user" not in kwargs:
                raise RuntimeError("requires_group_permissions requires 'user' to be a keyword argument")

            conn = kwargs["conn"]
            user = kwargs["user"]
            group_id = kwargs.pop("group_id")
            group_membership = await check_group_permissions(
                conn=conn, group_id=group_id, user=user, can_write=requires_write, is_owner=requires_owner
            )
            if "group_membership" in original_signature.parameters:
                kwargs["group_membership"] = group_membership

            if "group_id" in original_signature.parameters:
                kwargs["group_id"] = group_id

            return await func(*args, **kwargs)

        _add_arg_to_signature(func, wrapper, "group_id", int)

        return wrapper

    return f


def with_group_last_changed_update(func: Callable[..., Awaitable[R]]) -> Callable[..., Awaitable[R]]:
    original_signature = signature(func)

    @wraps(func)
    async def wrapper(*args, **kwargs):
        if "conn" not in kwargs:
            raise RuntimeError(
                "with_group_last_changed_update needs a database connection, "
                "with_db_transaction needs to be put before this decorator"
            )

        if "group_id" not in kwargs:
            raise RuntimeError("with_group_last_changed_update requires 'group_id' to be a keyword argument")

        conn = kwargs["conn"]
        group_id = kwargs.pop("group_id")
        await conn.execute("update grp set last_changed = now() where id = $1", group_id)
        if "group_id" in original_signature.parameters:
            kwargs["group_id"] = group_id

        return await func(*args, **kwargs)

    _add_arg_to_signature(func, wrapper, "group_id", int)

    return wrapper
