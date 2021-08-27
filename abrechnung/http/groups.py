from datetime import datetime, timezone

import schema
from aiohttp import web
from aiohttp.abc import Request
from schema import Schema

from abrechnung.application import NotFoundError
from abrechnung.domain import InvalidCommand
from abrechnung.http.serializers import (
    GroupSerializer,
    UserSerializer,
    AccountSerializer,
    GroupMemberSerializer,
)
from abrechnung.http.utils import validate, json_response

routes = web.RouteTableDef()


@routes.get("/groups")
async def list_groups(request):
    try:
        groups = await request.app["group_service"].list_groups(
            user_id=request["user"]["user_id"]
        )
    except NotFoundError:
        raise web.HTTPForbidden(reason="permission denied")

    serializer = GroupSerializer(groups)

    return json_response(data=serializer.to_repr())


@routes.post("/groups")
@validate(
    Schema({"name": str, "description": str, "currency_symbol": str, "terms": str})
)
async def create_group(request: Request, data):
    group_id = await request.app["group_service"].create_group(
        user_id=request["user"]["user_id"],
        name=data["name"],
        description=data["description"],
        currency_symbol=data["currency_symbol"],
        terms=data["terms"],
    )

    return json_response(data={"group_id": str(group_id)})


@routes.get(r"/groups/{group_id:\d+}")
async def get_group(request: Request):
    try:
        group = await request.app["group_service"].get_group(
            user_id=request["user"]["user_id"],
            group_id=int(request.match_info["group_id"]),
        )
    except PermissionError:
        raise web.HTTPForbidden(reason="permission denied")

    serializer = GroupSerializer(group)

    return json_response(data=serializer.to_repr())


@routes.get(r"/groups/{group_id:\d+}/members")
async def list_members(request):

    try:
        members = await request.app["group_service"].list_members(
            user_id=request["user"]["user_id"],
            group_id=int(request.match_info["group_id"]),
        )
    except PermissionError:
        raise web.HTTPForbidden(reason="permission denied")

    serializer = GroupMemberSerializer(members)

    return json_response(data=serializer.to_repr())


@routes.get(r"/groups/{group_id:\d+}/accounts")
async def list_accounts(request):

    try:
        accounts = await request.app["account_service"].list_accounts(
            user_id=request["user"]["user_id"],
            group_id=int(request.match_info["group_id"]),
        )
    except PermissionError:
        raise web.HTTPForbidden(reason="permission denied")

    serializer = AccountSerializer(accounts)

    return json_response(data=serializer.to_repr())


@routes.post(r"/groups/{group_id:\d+}/accounts")
@validate(Schema({"name": str, "description": str, "type": str}))
async def create_account(request: Request, data: dict):

    try:
        account_id = await request.app["account_service"].create_account(
            user_id=request["user"]["user_id"],
            group_id=int(request.match_info["group_id"]),
            name=data["name"],
            description=data["description"],
            type=data["type"],
        )
    except InvalidCommand as e:
        raise web.HTTPBadRequest(reason=str(e))
    except PermissionError:
        raise web.HTTPForbidden(reason="permission denied")

    return json_response(data={"account_id": str(account_id)})


@routes.get(r"/groups/{group_id:\d+}/accounts/{account_id:\d+}")
async def get_account(request: Request):
    try:
        account = await request.app["account_service"].get_account(
            user_id=request["user"]["user_id"],
            group_id=int(request.match_info["group_id"]),
            account_id=int(request.match_info["account_id"]),
        )
    except NotFoundError as e:
        raise web.HTTPNotFound(reason=str(e))
    except PermissionError:
        raise web.HTTPForbidden(reason="permission denied")

    serializer = AccountSerializer(account)

    return json_response(data=serializer.to_repr())


@routes.post(r"/groups/{group_id:\d+}/accounts/{account_id:\d+}")
@validate(schema.Schema({"name": str, "description": str}))
async def update_account(request: Request, data: dict):
    try:
        await request.app["account_service"].update_account(
            user_id=request["user"]["user_id"],
            group_id=int(request.match_info["group_id"]),
            account_id=int(request.match_info["account_id"]),
            name=data["name"],
            description=data["description"],
        )
    except InvalidCommand as e:
        raise web.HTTPBadRequest(reason=str(e))
    except PermissionError:
        raise web.HTTPForbidden(reason="permission denied")

    return json_response(status=web.HTTPNoContent.status_code)


@routes.post(r"/groups/{group_id:\d+}/invites")
@validate(
    schema.Schema(
        {
            "description": str,
            "single_use": bool,
            "valid_until": schema.Use(datetime.fromisoformat),
        }
    )
)
async def create_invite(request: Request, data: dict):
    valid_until = datetime.fromisoformat(data["valid_until"])
    if valid_until.tzinfo is None:
        valid_until = valid_until.replace(tzinfo=timezone.utc)

    try:
        await request.app["group_service"].create_invite(
            user_id=request["user"]["user_id"],
            group_id=int(request.match_info["group_id"]),
            description=data["description"],
            single_use=data["single_use"],
            valid_until=valid_until,
        )
    except InvalidCommand as e:
        raise web.HTTPBadRequest(reason=str(e))
    except PermissionError:
        raise web.HTTPForbidden(reason="permission denied")

    return json_response(status=web.HTTPNoContent.status_code)


@routes.delete(r"/groups/{group_id:\d+}/invites/{invite_id:\d+}")
async def create_invite(request: Request):
    try:
        await request.app["group_service"].delete_invite(
            user_id=request["user"]["user_id"],
            group_id=int(request.match_info["group_id"]),
            invite_id=int(request.match_info["invite_id"]),
        )
    except InvalidCommand as e:
        raise web.HTTPBadRequest(reason=str(e))
    except PermissionError:
        raise web.HTTPForbidden(reason="permission denied")

    return json_response(status=web.HTTPNoContent.status_code)


@routes.post(r"/groups/{group_id:\d+}/preview")
@validate(schema.Schema({"invite_token": str}))
async def preview_group(request: Request, data: dict):
    try:
        group = await request.app["group_service"].preview_group(
            user_id=request["user"]["user_id"],
            group_id=int(request.match_info["group_id"]),
            invite_token=data["invite_token"],
        )
    except InvalidCommand as e:
        raise web.HTTPBadRequest(reason=str(e))
    except PermissionError:
        raise web.HTTPForbidden(reason="permission denied")

    serializer = GroupSerializer(group)

    return json_response(data=serializer.to_repr())


@routes.post(r"/groups/{group_id:\d+}/join")
@validate(schema.Schema({"invite_token": str}))
async def preview_group(request: Request, data: dict):
    try:
        await request.app["group_service"].join_group(
            user_id=request["user"]["user_id"],
            group_id=int(request.match_info["group_id"]),
            invite_token=data["invite_token"],
        )
    except InvalidCommand as e:
        raise web.HTTPBadRequest(reason=str(e))
    except PermissionError:
        raise web.HTTPForbidden(reason="permission denied")

    return json_response(status=web.HTTPNoContent.status_code)
