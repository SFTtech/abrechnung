from datetime import timezone

from aiohttp import web
from aiohttp.abc import Request
from marshmallow import Schema, fields

from abrechnung.application import NotFoundError
from abrechnung.http.openapi import docs, json_schema
from abrechnung.http.serializers import (
    GroupSchema,
    GroupMemberSchema,
    GroupInviteSchema,
    GroupPreviewSchema,
    GroupLogSchema,
)
from abrechnung.http.utils import json_response, PrefixedRouteTableDef

routes = PrefixedRouteTableDef("/api")


@routes.get("/v1/groups")
@docs(tags=["groups"], summary="list the current users groups", description="")
async def list_groups(request):
    try:
        groups = await request.app["group_service"].list_groups(user=request["user"])
    except NotFoundError:
        raise web.HTTPForbidden(reason="permission denied")

    serializer = GroupSchema()

    return json_response(data=serializer.dump(groups, many=True))


@routes.post("/v1/groups")
@docs(tags=["groups"], summary="create a group", description="")
@json_schema(
    Schema.from_dict(
        {
            "name": fields.Str(required=True),
            "description": fields.Str(),
            "currency_symbol": fields.Str(required=True),
            "add_user_account_on_join": fields.Bool(required=False, load_default=False),
            "terms": fields.Str(),
        },
        name="CreateGroupSchema",
    )
)
async def create_group(request: Request):
    data = request["json"]
    group_id = await request.app["group_service"].create_group(
        user=request["user"],
        name=data["name"],
        description=data.get("description"),
        currency_symbol=data["currency_symbol"],
        add_user_account_on_join=data["add_user_account_on_join"],
        terms=data.get("terms"),
    )

    return json_response(data={"group_id": group_id})


@routes.get(r"/v1/groups/{group_id:\d+}")
@docs(tags=["groups"], summary="fetch group details", description="")
async def get_group(request: Request):
    group = await request.app["group_service"].get_group(
        user=request["user"],
        group_id=int(request.match_info["group_id"]),
    )

    serializer = GroupSchema()

    return json_response(data=serializer.dump(group))


@routes.post(r"/v1/groups/{group_id:\d+}")
@docs(tags=["groups"], summary="update group details", description="")
@json_schema(
    Schema.from_dict(
        {
            "name": fields.Str(required=True),
            "description": fields.Str(),
            "currency_symbol": fields.Str(required=True),
            "terms": fields.Str(),
            "add_user_account_on_join": fields.Bool(required=True),
        },
        name="UpdateGroupSchema",
    )
)
async def update_group(request: Request):
    data = request["json"]
    await request.app["group_service"].update_group(
        user=request["user"],
        group_id=int(request.match_info["group_id"]),
        name=data["name"],
        description=data.get("description"),
        currency_symbol=data["currency_symbol"],
        add_user_account_on_join=data["add_user_account_on_join"],
        terms=data.get("terms"),
    )

    return web.Response(status=web.HTTPNoContent.status_code)


@routes.delete(r"/v1/groups/{group_id:\d+}")
@docs(tags=["groups"], summary="delete a group", description="")
async def delete_group(request: Request):
    await request.app["group_service"].delete_group(
        user=request["user"],
        group_id=int(request.match_info["group_id"]),
    )

    return web.Response(status=web.HTTPNoContent.status_code)


@routes.post(r"/v1/groups/{group_id:\d+}/leave")
@docs(tags=["groups"], summary="leave a group", description="")
async def leave_group(request: Request):
    await request.app["group_service"].leave_group(
        user=request["user"],
        group_id=int(request.match_info["group_id"]),
    )

    return web.Response(status=web.HTTPNoContent.status_code)


@routes.get(r"/v1/groups/{group_id:\d+}/members")
@docs(tags=["groups"], summary="list all members of a group", description="")
async def list_members(request: web.Request):
    members = await request.app["group_service"].list_members(
        user=request["user"],
        group_id=int(request.match_info["group_id"]),
    )

    serializer = GroupMemberSchema()

    return json_response(data=serializer.dump(members, many=True))


@routes.get(r"/v1/groups/{group_id:\d+}/logs")
@docs(tags=["groups"], summary="fetch the group log", description="")
async def list_log(request: web.Request):
    logs = await request.app["group_service"].list_log(
        user=request["user"],
        group_id=int(request.match_info["group_id"]),
    )

    serializer = GroupLogSchema()

    return json_response(data=serializer.dump(logs, many=True))


@routes.post(r"/v1/groups/{group_id:\d+}/send_message")
@docs(tags=["groups"], summary="post a message to the group log", description="")
@json_schema(Schema.from_dict({"message": fields.Str()}, name="SendGroupMessageSchema"))
async def send_group_message(request: web.Request):
    data = request["json"]
    await request.app["group_service"].send_group_message(
        user=request["user"],
        group_id=int(request.match_info["group_id"]),
        message=data["message"],
    )

    return web.Response(status=web.HTTPNoContent.status_code)


@routes.post(r"/v1/groups/{group_id:\d+}/members")
@docs(
    tags=["groups"], summary="update the permissions of a group member", description=""
)
@json_schema(
    Schema.from_dict(
        {
            "user_id": fields.Int(required=True),
            "can_write": fields.Bool(required=True),
            "is_owner": fields.Bool(required=True),
        }
    ),
    name="UpdateMemberPermissionsSchema",
)
async def update_member_permissions(request: web.Request):
    data = request["json"]
    await request.app["group_service"].update_member_permissions(
        user=request["user"],
        group_id=int(request.match_info["group_id"]),
        member_id=data["user_id"],
        can_write=data["can_write"],
        is_owner=data["is_owner"],
    )

    return web.Response(status=web.HTTPNoContent.status_code)


@routes.get(r"/v1/groups/{group_id:\d+}/invites")
@docs(tags=["groups"], summary="list all invite links of a group", description="")
async def list_invites(request):
    invites = await request.app["group_service"].list_invites(
        user=request["user"],
        group_id=int(request.match_info["group_id"]),
    )

    serializer = GroupInviteSchema()

    return json_response(data=serializer.dump(invites, many=True))


@routes.post(r"/v1/groups/{group_id:\d+}/invites")
@docs(tags=["groups"], summary="create a new group invite link", description="")
@json_schema(
    Schema.from_dict(
        {
            "description": fields.Str(required=True),
            "single_use": fields.Bool(required=True),
            "join_as_editor": fields.Bool(required=True),
            "valid_until": fields.DateTime(required=True),
        },
        name="CreateInviteSchema",
    )
)
async def create_invite(request: Request):
    data = request["json"]
    valid_until = data["valid_until"]
    if valid_until.tzinfo is None:
        valid_until = valid_until.replace(tzinfo=timezone.utc)

    await request.app["group_service"].create_invite(
        user=request["user"],
        group_id=int(request.match_info["group_id"]),
        description=data["description"],
        single_use=data["single_use"],
        valid_until=valid_until,
        join_as_editor=data["join_as_editor"],
    )

    return json_response(status=web.HTTPNoContent.status_code)


@routes.delete(r"/v1/groups/{group_id:\d+}/invites/{invite_id:\d+}")
@docs(tags=["groups"], summary="delete a group invite link", description="")
async def delete_invite(request: Request):
    await request.app["group_service"].delete_invite(
        user=request["user"],
        group_id=int(request.match_info["group_id"]),
        invite_id=int(request.match_info["invite_id"]),
    )
    return json_response(status=web.HTTPNoContent.status_code)


@routes.post(r"/v1/groups/preview")
@docs(
    tags=["groups"],
    summary="preview a group before joining using an invite token",
    description="",
)
@json_schema(
    Schema.from_dict(
        {"invite_token": fields.Str(required=True)}, name="PreviewGroupSchema"
    )
)
async def preview_group(request: Request):
    data = request["json"]
    group_preview = await request.app["group_service"].preview_group(
        invite_token=data["invite_token"],
    )

    serializer = GroupPreviewSchema()

    return json_response(data=serializer.dump(group_preview))


@routes.post(r"/v1/groups/join")
@docs(tags=["groups"], summary="join a group using an invite token", description="")
@json_schema(
    Schema.from_dict(
        {"invite_token": fields.Str(required=True)}, name="JoinGroupSchema"
    )
)
async def join_group(request: Request):
    data = request["json"]
    await request.app["group_service"].join_group(
        user=request["user"],
        invite_token=data["invite_token"],
    )

    return json_response(status=web.HTTPNoContent.status_code)
