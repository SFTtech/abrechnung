from datetime import datetime

import schema
from aiohttp import web
from aiohttp.abc import Request
from schema import Schema

from abrechnung.application.groups import UserNotFound
from abrechnung.domain import InvalidCommand
from abrechnung.http.serializers import (
    GroupSerializer,
    UserSerializer,
    AccountSerializer,
)
from abrechnung.http.utils import validate, json_response
from abrechnung.utils import parse_url_uuid, parse_url_int

routes = web.RouteTableDef()


@routes.get("/groups")
async def list_groups(request):
    try:
        groups = request.app["group_read_service"].list_groups(
            request["user"]["user_id"]
        )
    except UserNotFound:
        raise web.HTTPForbidden(reason="permission denied")

    serializer = GroupSerializer(groups)

    return json_response(data=serializer.to_repr())


@routes.post("/groups")
@validate(
    Schema({"name": str, "description": str, "currency_symbol": str, "terms": str})
)
async def create_group(request: Request, data):
    group_id = request.app["group_service"].create_group(
        request["user"]["user_id"], **data
    )

    return json_response(data={"group_id": str(group_id)})


@routes.get("/groups/{group_id}")
async def get_group(request: Request):
    group_id = parse_url_uuid(request.match_info["group_id"], "Invalid group id")

    try:
        group = request.app["group_read_service"].get_group(
            request["user"]["user_id"], group_id
        )
    except PermissionError:
        raise web.HTTPForbidden(reason="permission denied")

    serializer = GroupSerializer(group)

    return json_response(data=serializer.to_repr())


@routes.get("/groups/{group_id}/members")
async def list_members(request):
    group_id = parse_url_uuid(request.match_info["group_id"], "Invalid group id")

    try:
        members = request.app["group_read_service"].list_members(
            request["user"]["user_id"], group_id
        )
    except PermissionError:
        raise web.HTTPForbidden(reason="permission denied")

    serializer = UserSerializer(members)

    return json_response(data=serializer.to_repr())


@routes.get("/groups/{group_id}/accounts")
async def list_accounts(request):
    group_id = parse_url_uuid(request.match_info["group_id"], "Invalid group id")

    try:
        accounts = request.app["group_read_service"].list_accounts(
            request["user"]["user_id"], group_id
        )
    except PermissionError:
        raise web.HTTPForbidden(reason="permission denied")

    serializer = AccountSerializer(accounts)

    return json_response(data=serializer.to_repr())


@routes.post("/groups/{group_id}/accounts")
@validate(Schema({"name": str, "description": str, "type": str}))
async def create_account(request: Request, data: dict):
    group_id = parse_url_uuid(request.match_info["group_id"], "Invalid group id")

    try:
        account_id = request.app["group_service"].create_account(
            request["user"]["user_id"], group_id, **data
        )
    except InvalidCommand as e:
        raise web.HTTPBadRequest(reason=str(e))
    except PermissionError:
        raise web.HTTPForbidden(reason="permission denied")

    return json_response(data={"account_id": str(account_id)})


@routes.get("/groups/{group_id}/accounts/{account_id}")
async def get_account(request: Request):
    group_id = parse_url_uuid(request.match_info["group_id"], "Invalid group id")
    account_id = parse_url_uuid(request.match_info["account_id"], "Invalid account id")

    try:
        account = request.app["group_read_service"].get_account(
            request["user"]["user_id"], group_id, account_id
        )
    except PermissionError:
        raise web.HTTPForbidden(reason="permission denied")

    serializer = AccountSerializer(account)

    return json_response(data=serializer.to_repr())


@routes.post("/groups/{group_id}/accounts/{account_id}")
@validate(schema.Schema({"name": str, "description": str}))
async def update_account(request: Request, data: dict):
    group_id = parse_url_uuid(request.match_info["group_id"], "Invalid group id")
    account_id = parse_url_uuid(request.match_info["account_id"], "Invalid account id")

    try:
        request.app["group_service"].update_account(
            request["user"]["user_id"],
            group_id=group_id,
            account_id=account_id,
            name=data["name"],
            description=data["description"],
        )
    except InvalidCommand as e:
        raise web.HTTPBadRequest(reason=str(e))
    except PermissionError:
        raise web.HTTPForbidden(reason="permission denied")

    return json_response(status=web.HTTPNoContent.status_code)


@routes.post("/groups/{group_id}/invites")
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
    group_id = parse_url_uuid(request.match_info["group_id"], "Invalid group id")

    try:
        token = request.app["group_service"].create_invite(
            user_id=request["user"]["user_id"],
            group_id=group_id,
            description=data["description"],
            single_use=data["single_use"],
            valid_until=data["valid_until"],
        )
    except InvalidCommand as e:
        raise web.HTTPBadRequest(reason=str(e))
    except PermissionError:
        raise web.HTTPForbidden(reason="permission denied")

    return json_response(data={"token": token})


@routes.delete("/groups/{group_id}/invites/{invite_id}")
async def create_invite(request: Request):
    group_id = parse_url_uuid(request.match_info["group_id"], "Invalid group id")
    invite_id = parse_url_int(request.match_info["invite_id"], "Invalid invite id")

    try:
        request.app["group_service"].delete_invite(
            user_id=request["user"]["user_id"], group_id=group_id, invite_id=invite_id
        )
    except InvalidCommand as e:
        raise web.HTTPBadRequest(reason=str(e))
    except PermissionError:
        raise web.HTTPForbidden(reason="permission denied")

    return json_response(status=web.HTTPNoContent.status_code)


@routes.post("/groups/{group_id}/preview")
@validate(schema.Schema({"invite_token": str}))
async def preview_group(request: Request, data: dict):
    group_id = parse_url_uuid(request.match_info["group_id"], "Invalid group id")

    try:
        group = request.app["group_read_service"].preview_group(
            user_id=request["user"]["user_id"],
            group_id=group_id,
            invite_token=data["invite_token"],
        )
    except InvalidCommand as e:
        raise web.HTTPBadRequest(reason=str(e))
    except PermissionError:
        raise web.HTTPForbidden(reason="permission denied")

    serializer = GroupSerializer(group)

    return json_response(data=serializer.to_repr())


@routes.post("/groups/{group_id}/join")
@validate(schema.Schema({"invite_token": str}))
async def preview_group(request: Request, data: dict):
    group_id = parse_url_uuid(request.match_info["group_id"], "Invalid group id")

    try:
        request.app["group_service"].join_group(
            user_id=request["user"]["user_id"],
            group_id=group_id,
            invite_token=data["invite_token"],
        )
    except InvalidCommand as e:
        raise web.HTTPBadRequest(reason=str(e))
    except PermissionError:
        raise web.HTTPForbidden(reason="permission denied")

    return json_response(status=web.HTTPNoContent.status_code)
