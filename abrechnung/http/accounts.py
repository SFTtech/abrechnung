from marshmallow import Schema, fields
from aiohttp import web

from abrechnung.http.openapi import docs, json_schema
from abrechnung.http.serializers import AccountSchema
from abrechnung.http.utils import json_response, PrefixedRouteTableDef

routes = PrefixedRouteTableDef("/api")


async def _account_response(request, account_id: int) -> web.Response:
    account = await request.app["account_service"].get_account(
        user=request["user"], account_id=account_id
    )

    serializer = AccountSchema()
    return json_response(data=serializer.dump(account))


@routes.get(r"/v1/groups/{group_id:\d+}/accounts")
@docs(
    tags=["accounts"],
    summary="list all accounts in a group",
    description="",
    responses={200: {"schema": AccountSchema(many=True), "description": ""}},
)
async def list_accounts(request):
    try:
        accounts = await request.app["account_service"].list_accounts(
            user=request["user"],
            group_id=int(request.match_info["group_id"]),
        )
    except PermissionError:
        raise web.HTTPForbidden(reason="permission denied")

    serializer = AccountSchema()
    return json_response(data=serializer.dump(accounts, many=True))


@routes.post(r"/v1/groups/{group_id:\d+}/accounts")
@docs(
    tags=["accounts"],
    summary="create a new group account",
    description="",
    responses={200: {"schema": AccountSchema(), "description": ""}},
)
@json_schema(
    Schema.from_dict(
        {
            "name": fields.Str(),
            "description": fields.Str(),
            "type": fields.Str(),
            "owning_user_id": fields.Int(
                allow_none=True, load_default=None, required=False
            ),
            "clearing_shares": fields.Dict(
                fields.Int(), fields.Number(), allow_none=True, load_default=None
            ),
        },
        name="CreateAccountSchema",
    )
)
async def create_account(request: web.Request):
    data = request["json"]
    account_id = await request.app["account_service"].create_account(
        user=request["user"],
        group_id=int(request.match_info["group_id"]),
        name=data["name"],
        description=data["description"],
        type=data["type"],
        owning_user_id=data["owning_user_id"],
        clearing_shares=data["clearing_shares"],
    )

    return await _account_response(request=request, account_id=account_id)


@routes.get(r"/v1/accounts/{account_id:\d+}")
@docs(
    tags=["accounts"],
    summary="fetch a group account",
    description="",
    responses={200: {"schema": AccountSchema(), "description": ""}},
)
async def get_account(request: web.Request):
    account_id = int(request.match_info["account_id"])
    return await _account_response(request=request, account_id=account_id)


@routes.post(r"/v1/accounts/{account_id:\d+}")
@docs(
    tags=["accounts"],
    summary="update an account",
    description="",
    responses={200: {"schema": AccountSchema(), "description": ""}},
)
@json_schema(
    Schema.from_dict(
        {
            "name": fields.Str(),
            "description": fields.Str(),
            "owning_user_id": fields.Int(
                allow_none=True, load_default=None, required=False
            ),
            "clearing_shares": fields.Dict(
                fields.Int(), fields.Number(), allow_none=True, load_default=None
            ),
        },
        name="UpdateAccountSchema",
    )
)
async def update_account(request: web.Request):
    account_id = int(request.match_info["account_id"])
    data = request["json"]
    await request.app["account_service"].update_account(
        user=request["user"],
        account_id=account_id,
        name=data["name"],
        description=data["description"],
        owning_user_id=data["owning_user_id"],
        clearing_shares=data["clearing_shares"],
    )

    return await _account_response(request=request, account_id=account_id)


@routes.delete(r"/v1/accounts/{account_id:\d+}")
@docs(
    tags=["accounts"],
    summary="delete an account",
    description="",
    responses={200: {"schema": AccountSchema(), "description": ""}},
)
async def delete_account(request: web.Request):
    account_id = int(request.match_info["account_id"])
    await request.app["account_service"].delete_account(
        user=request["user"],
        account_id=account_id,
    )

    return await _account_response(request=request, account_id=account_id)
