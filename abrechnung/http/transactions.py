from uuid import UUID

import schema
from aiohttp import web
from aiohttp.abc import Request

from abrechnung.application.groups import InvalidCommand
from abrechnung.domain.transactions import (
    InvalidTransactionCommand,
    InvalidTransactionCommit,
)
from abrechnung.http.serializers import TransactionSerializer
from abrechnung.http.utils import json_response, validate
from abrechnung.utils import parse_url_uuid

routes = web.RouteTableDef()


@routes.get("/groups/{group_id}/transactions")
async def list_transactions(request):
    group_id = parse_url_uuid(request.match_info["group_id"], "Invalid group id")
    if not request.app["group_service"].is_user_member(
        request["user"]["user_id"], group_id=group_id
    ):
        raise web.HTTPForbidden(reason="permission denied")

    transactions = request.app["group_read_service"].list_transactions(
        request["user"]["user_id"], group_id
    )

    serializer = TransactionSerializer(transactions)
    return json_response(data=serializer.to_repr())


@routes.post("/groups/{group_id}/transactions")
@validate(
    schema.Schema(
        {
            "description": str,
            "type": str,
            "value": schema.Or(float, int),
            "currency_symbol": str,
            "currency_conversion_rate": schema.Or(float, int),
        }
    )
)
async def create_transaction(request: Request, data: dict):
    group_id = parse_url_uuid(request.match_info["group_id"], "Invalid group id")
    if not request.app["group_service"].user_has_permissions(
        request["user"]["user_id"], group_id=group_id, can_write=True
    ):
        raise web.HTTPForbidden(reason="permission denied")

    transaction_id = request.app["group_service"].create_transaction(
        request["user"]["user_id"],
        group_id,
        description=data["description"],
        type=data["type"],
        currency_symbol=data["currency_symbol"],
        currency_conversion_rate=float(data["currency_conversion_rate"]),
        value=float(data["value"]),
    )

    return json_response(data={"transaction_id": str(transaction_id)})


@routes.get("/groups/{group_id}/transactions/{transaction_id}")
async def get_transaction(request: Request):
    group_id = parse_url_uuid(request.match_info["group_id"], "Invalid group id")
    transaction_id = parse_url_uuid(
        request.match_info["transaction_id"], "Invalid transaction id"
    )

    try:
        transaction = request.app["group_read_service"].get_transaction(
            request["user"]["user_id"], group_id, transaction_id
        )
    except PermissionError:
        raise web.HTTPForbidden(reason="permission denied")

    serializer = TransactionSerializer(transaction)

    return json_response(data=serializer.to_repr())


@routes.post("/groups/{group_id}/transactions/{transaction_id}/commit")
async def commit_transaction(request: Request):
    group_id = parse_url_uuid(request.match_info["group_id"], "Invalid group id")
    transaction_id = parse_url_uuid(
        request.match_info["transaction_id"], "Invalid transaction id"
    )

    try:
        request.app["group_service"].commit_transaction(
            user_id=request["user"]["user_id"], transaction_id=transaction_id
        )
    except (InvalidCommand, InvalidTransactionCommit) as e:
        raise web.HTTPBadRequest(reason=str(e))
    except PermissionError:
        raise web.HTTPForbidden(reason="permission denied")

    return json_response(status=web.HTTPNoContent.status_code)


@routes.post("/groups/{group_id}/transactions/{transaction_id}/creditor_shares")
@validate(
    schema.Schema(
        {
            "account_id": schema.Use(UUID),
            "value": schema.Or(float, int),
        }
    )
)
async def add_or_change_creditor_share(request: Request, data: dict):
    group_id = parse_url_uuid(request.match_info["group_id"], "Invalid group id")
    transaction_id = parse_url_uuid(
        request.match_info["transaction_id"], "Invalid transaction id"
    )

    try:
        request.app["group_service"].add_or_change_creditor_share(
            user_id=request["user"]["user_id"],
            transaction_id=transaction_id,
            account_id=UUID(data["account_id"]),
            value=float(data["value"]),
        )
    except PermissionError:
        raise web.HTTPForbidden(reason="permission denied")
    except InvalidTransactionCommand:
        raise web.HTTPBadRequest()

    return json_response(status=web.HTTPNoContent.status_code)


@routes.post("/groups/{group_id}/transactions/{transaction_id}/creditor_shares/switch")
@validate(
    schema.Schema(
        {
            "account_id": schema.Use(UUID),
            "value": schema.Or(float, int),
        }
    )
)
async def switch_creditor_share(request: Request, data: dict):
    group_id = parse_url_uuid(request.match_info["group_id"], "Invalid group id")
    transaction_id = parse_url_uuid(
        request.match_info["transaction_id"], "Invalid transaction id"
    )

    try:
        request.app["group_service"].switch_creditor_share(
            user_id=request["user"]["user_id"],
            transaction_id=transaction_id,
            account_id=UUID(data["account_id"]),
            value=float(data["value"]),
        )
    except PermissionError:
        raise web.HTTPForbidden(reason="permission denied")
    except InvalidTransactionCommand as e:
        raise web.HTTPBadRequest(reason=str(e))

    return json_response(status=web.HTTPNoContent.status_code)


@routes.delete("/groups/{group_id}/transactions/{transaction_id}/creditor_shares")
@validate(
    schema.Schema(
        {
            "account_id": schema.Use(UUID),
        }
    )
)
async def delete_creditor_share(request: Request, data: dict):
    group_id = parse_url_uuid(request.match_info["group_id"], "Invalid group id")
    transaction_id = parse_url_uuid(
        request.match_info["transaction_id"], "Invalid transaction id"
    )

    try:
        request.app["group_service"].delete_creditor_share(
            user_id=request["user"]["user_id"],
            transaction_id=transaction_id,
            account_id=UUID(data["account_id"]),
        )
    except PermissionError:
        raise web.HTTPForbidden(reason="permission denied")
    except InvalidTransactionCommand as e:
        raise web.HTTPBadRequest(reason=str(e))

    return json_response(status=web.HTTPNoContent.status_code)


@routes.post("/groups/{group_id}/transactions/{transaction_id}/debitor_shares")
@validate(
    schema.Schema(
        {
            "account_id": schema.Use(UUID),
            "value": schema.Or(float, int),
        }
    )
)
async def add_or_change_debitor_share(request: Request, data: dict):
    group_id = parse_url_uuid(request.match_info["group_id"], "Invalid group id")
    transaction_id = parse_url_uuid(
        request.match_info["transaction_id"], "Invalid transaction id"
    )

    try:
        request.app["group_service"].add_or_change_debitor_share(
            user_id=request["user"]["user_id"],
            transaction_id=transaction_id,
            account_id=UUID(data["account_id"]),
            value=float(data["value"]),
        )
    except PermissionError:
        raise web.HTTPForbidden(reason="permission denied")

    return json_response(status=web.HTTPNoContent.status_code)


@routes.post("/groups/{group_id}/transactions/{transaction_id}/debitor_shares/switch")
@validate(
    schema.Schema(
        {
            "account_id": schema.Use(UUID),
            "value": schema.Or(float, int),
        }
    )
)
async def switch_debitor_share(request: Request, data: dict):
    group_id = parse_url_uuid(request.match_info["group_id"], "Invalid group id")
    transaction_id = parse_url_uuid(
        request.match_info["transaction_id"], "Invalid transaction id"
    )

    try:
        request.app["group_service"].switch_debitor_share(
            user_id=request["user"]["user_id"],
            transaction_id=transaction_id,
            account_id=UUID(data["account_id"]),
            value=float(data["value"]),
        )
    except PermissionError:
        raise web.HTTPForbidden(reason="permission denied")
    except InvalidTransactionCommand as e:
        raise web.HTTPBadRequest(reason=str(e))

    return json_response(status=web.HTTPNoContent.status_code)


@routes.delete("/groups/{group_id}/transactions/{transaction_id}/debitor_shares")
@validate(
    schema.Schema(
        {
            "account_id": schema.Use(UUID),
        }
    )
)
async def delete_debitor_share(request: Request, data: dict):
    group_id = parse_url_uuid(request.match_info["group_id"], "Invalid group id")
    transaction_id = parse_url_uuid(
        request.match_info["transaction_id"], "Invalid transaction id"
    )

    try:
        request.app["group_service"].delete_debitor_share(
            user_id=request["user"]["user_id"],
            transaction_id=transaction_id,
            account_id=UUID(data["account_id"]),
        )
    except PermissionError:
        raise web.HTTPForbidden(reason="permission denied")
    except InvalidTransactionCommand as e:
        raise web.HTTPBadRequest(reason=str(e))

    return json_response(status=web.HTTPNoContent.status_code)
