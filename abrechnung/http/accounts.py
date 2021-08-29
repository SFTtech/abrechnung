import schema
from aiohttp import web

from abrechnung.application import NotFoundError
from abrechnung.domain import InvalidCommand
from abrechnung.http.serializers import AccountSerializer
from abrechnung.http.utils import validate, json_response

routes = web.RouteTableDef()


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
@validate(schema.Schema({"name": str, "description": str, "type": str}))
async def create_account(request: web.Request, data: dict):

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

    return json_response(data={"account_id": account_id})


@routes.get(r"/groups/{group_id:\d+}/accounts/{account_id:\d+}")
async def get_account(request: web.Request):
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
async def update_account(request: web.Request, data: dict):
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
