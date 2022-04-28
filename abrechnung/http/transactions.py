from datetime import datetime

from aiohttp import web
from aiohttp.abc import Request
from aiohttp.web_request import FileField
from marshmallow import Schema, fields

from abrechnung.http.openapi import docs, json_schema
from abrechnung.http.serializers import TransactionSchema, TransactionPositionSchema
from abrechnung.http.utils import json_response, PrefixedRouteTableDef

routes = PrefixedRouteTableDef("/api")


async def _transaction_response(request, transaction_id: int) -> web.Response:
    transaction = await request.app["transaction_service"].get_transaction(
        user=request["user"], transaction_id=transaction_id
    )

    serializer = TransactionSchema()
    return json_response(data=serializer.dump(transaction))


@routes.get(r"/v1/groups/{group_id:\d+}/transactions")
@docs(
    tags=["transactions"],
    summary="list all transactions in a group",
    responses={200: {"schema": TransactionSchema(many=True), "description": ""}},
    description="",
)
async def list_transactions(request):
    group_id: int = int(request.match_info["group_id"])
    min_last_changed = request.query.get("min_last_changed")

    if min_last_changed:
        try:
            min_last_changed = datetime.fromisoformat(min_last_changed)
        except ValueError:
            raise web.HTTPBadRequest(
                reason="Invalid query param 'min_last_changed', must be a valid ISO timestamp."
            )

    forced_transaction_ids = request.query.get("transaction_ids")
    if forced_transaction_ids:
        try:
            forced_transaction_ids = [int(x) for x in forced_transaction_ids.split(",")]
        except ValueError:
            raise web.HTTPBadRequest(
                reason="Invalid query param 'transaction_ids', must be a comma separated list of integers"
            )

    transactions = await request.app["transaction_service"].list_transactions(
        user=request["user"],
        group_id=group_id,
        min_last_changed=min_last_changed,
        additional_transactions=forced_transaction_ids,
    )

    serializer = TransactionSchema()
    return json_response(data=serializer.dump(transactions, many=True))


@routes.post(r"/v1/groups/{group_id:\d+}/transactions")
@docs(
    tags=["transactions"],
    summary="create a new transaction",
    responses={200: {"schema": TransactionSchema, "description": ""}},
    description="",
)
@json_schema(
    Schema.from_dict(
        {
            "description": fields.Str(),
            "type": fields.Str(),
            "value": fields.Number(),
            "currency_symbol": fields.Str(),
            "billed_at": fields.Date(),
            "currency_conversion_rate": fields.Number(),
            "creditor_shares": fields.Dict(
                fields.Int(), fields.Number(), load_default=None, required=False
            ),
            "debitor_shares": fields.Dict(
                fields.Int(), fields.Number(), load_default=None, required=False
            ),
            "perform_commit": fields.Bool(load_default=False, required=False),
        },
        name="CreateTransactionSchema",
    )
)
async def create_transaction(request: Request):
    data = request["json"]
    group_id: int = int(request.match_info["group_id"])

    transaction_id = await request.app["transaction_service"].create_transaction(
        user=request["user"],
        group_id=group_id,
        description=data["description"],
        type=data["type"],
        currency_symbol=data["currency_symbol"],
        currency_conversion_rate=float(data["currency_conversion_rate"]),
        billed_at=data["billed_at"],
        value=float(data["value"]),
        creditor_shares=data["creditor_shares"],
        debitor_shares=data["debitor_shares"],
        perform_commit=data["perform_commit"],
    )

    return await _transaction_response(request, transaction_id)


@routes.get(r"/v1/transactions/{transaction_id:\d+}")
@docs(
    tags=["transactions"],
    summary="get transaction details",
    responses={200: {"schema": TransactionSchema, "description": ""}},
    description="",
)
async def get_transaction(request: Request):
    transaction = await request.app["transaction_service"].get_transaction(
        user=request["user"],
        transaction_id=int(request.match_info["transaction_id"]),
    )

    serializer = TransactionSchema()
    return json_response(data=serializer.dump(transaction))


@routes.post(r"/v1/transactions/{transaction_id:\d+}")
@docs(
    tags=["transactions"],
    summary="update transaction details",
    responses={200: {"schema": TransactionSchema, "description": ""}},
    description="",
)
@json_schema(
    Schema.from_dict(
        {
            "description": fields.Str(),
            "value": fields.Number(),
            "currency_symbol": fields.Str(),
            "billed_at": fields.Date(),
            "currency_conversion_rate": fields.Number(),
            "creditor_shares": fields.Dict(
                fields.Int(), fields.Number(), load_default=None, required=False
            ),
            "debitor_shares": fields.Dict(
                fields.Int(), fields.Number(), load_default=None, required=False
            ),
            "positions": fields.List(
                fields.Nested(TransactionPositionSchema),
                required=False,
                nullable=True,
                load_default=None,
            ),
            "perform_commit": fields.Bool(load_default=False, required=False),
        },
        name="UpdateTransactionSchema",
    )
)
async def update_transaction(request: Request):
    data = request["json"]
    transaction_id = int(request.match_info["transaction_id"])

    await request.app["transaction_service"].update_transaction(
        user=request["user"],
        transaction_id=transaction_id,
        value=data["value"],
        description=data["description"],
        currency_symbol=data["currency_symbol"],
        currency_conversion_rate=data["currency_conversion_rate"],
        billed_at=data["billed_at"],
        creditor_shares=data["creditor_shares"],
        debitor_shares=data["debitor_shares"],
        positions=data["positions"],
        perform_commit=data["perform_commit"],
    )

    return await _transaction_response(request, transaction_id)


@routes.post(r"/v1/transactions/{transaction_id:\d+}/positions")
@docs(
    tags=["transactions"],
    summary="update transaction positions",
    responses={200: {"schema": TransactionSchema, "description": ""}},
    description="",
)
@json_schema(
    Schema.from_dict(
        {
            "positions": fields.List(
                fields.Nested(TransactionPositionSchema),
            ),
            "perform_commit": fields.Bool(load_default=False, required=False),
        },
        name="UpdateTransactionSchemaV2",
    )
)
async def update_transaction_positions(request: Request):
    data = request["json"]
    transaction_id = int(request.match_info["transaction_id"])

    await request.app["transaction_service"].update_transaction_positions(
        user=request["user"],
        transaction_id=transaction_id,
        positions=data["positions"],
        perform_commit=data["perform_commit"],
    )

    return await _transaction_response(request, transaction_id)


@routes.post(r"/v1/transactions/{transaction_id:\d+}/commit")
@docs(
    tags=["transactions"],
    summary="commit currently pending transaction changes",
    responses={200: {"schema": TransactionSchema, "description": ""}},
    description="",
)
async def commit_transaction(request: Request):
    transaction_id = int(request.match_info["transaction_id"])
    await request.app["transaction_service"].commit_transaction(
        user=request["user"],
        transaction_id=transaction_id,
    )

    return await _transaction_response(request, transaction_id)


@routes.delete(r"/v1/transactions/{transaction_id:\d+}")
@docs(
    tags=["transactions"],
    summary="delete a transaction",
    responses={200: {"schema": TransactionSchema, "description": ""}},
    description="",
)
async def delete_transaction(request: Request):
    transaction_id = int(request.match_info["transaction_id"])
    await request.app["transaction_service"].delete_transaction(
        user=request["user"],
        transaction_id=transaction_id,
    )

    return await _transaction_response(request, transaction_id)


@routes.post(r"/v1/transactions/{transaction_id:\d+}/new_change")
@docs(
    tags=["transactions"],
    summary="create a new pending transaction revision",
    responses={200: {"schema": TransactionSchema, "description": ""}},
    description="",
)
async def create_transaction_change(request: Request):
    transaction_id = int(request.match_info["transaction_id"])
    await request.app["transaction_service"].create_transaction_change(
        user=request["user"],
        transaction_id=int(request.match_info["transaction_id"]),
    )

    return await _transaction_response(request, transaction_id)


@routes.post(r"/v1/transactions/{transaction_id:\d+}/discard")
@docs(
    tags=["transactions"],
    summary="discard currently pending transaction changes",
    responses={200: {"schema": TransactionSchema, "description": ""}},
    description="",
)
async def discard_transaction_change(request: Request):
    transaction_id = int(request.match_info["transaction_id"])
    await request.app["transaction_service"].discard_transaction_changes(
        user=request["user"],
        transaction_id=transaction_id,
    )

    return await _transaction_response(request, transaction_id)


@routes.post(r"/v1/transactions/{transaction_id:\d+}/files")
@docs(
    tags=["transactions"],
    summary="upload a file as a transaction attachment",
    description="",
    responses={200: {"schema": TransactionSchema, "description": ""}},
)
async def upload_file(request: Request):
    data = await request.post()

    if "file" not in data or not isinstance(data["file"], FileField):
        raise web.HTTPBadRequest(reason=f"File data required")
    if "filename" not in data or not isinstance(data["filename"], str):
        raise web.HTTPBadRequest(reason=f"File Name required")

    transaction_id = int(request.match_info["transaction_id"])
    file_field: FileField = data["file"]
    # filename contains the name of the file in string format.
    filename = data["filename"]
    input_file = file_field.file
    mime_type = file_field.content_type
    try:
        content = input_file.read()
    except Exception as e:
        raise web.HTTPBadRequest(reason=f"Cannot read uploaded file: {e}")

    await request.app["transaction_service"].upload_file(
        user=request["user"],
        transaction_id=transaction_id,
        filename=filename,
        mime_type=mime_type,
        content=content,
    )

    return await _transaction_response(request, transaction_id)


@routes.delete(r"/v1/files/{file_id:\d+}")
@docs(
    tags=["transactions"],
    summary="delete a transaction attachment",
    description="",
    responses={200: {"schema": TransactionSchema, "description": ""}},
)
async def delete_file(request: Request):
    transaction_id, revision_id = await request.app["transaction_service"].delete_file(
        user=request["user"],
        file_id=int(request.match_info["file_id"]),
    )

    return await _transaction_response(request, transaction_id)


@routes.get(r"/v1/files/{file_id:\d+}/{blob_id:\d+}")
@docs(
    tags=["transactions"],
    summary="fetch the (binary) contents of a transaction attachment",
    description="",
)
async def get_file_contents(request: Request):
    file_id = int(request.match_info["file_id"])
    blob_id = int(request.match_info["blob_id"])
    mime_type, content = await request.app["transaction_service"].read_file_contents(
        user=request["user"],
        file_id=file_id,
        blob_id=blob_id,
    )

    return web.Response(body=content, content_type=mime_type)
