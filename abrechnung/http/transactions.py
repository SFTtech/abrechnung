from datetime import datetime

from aiohttp import web
from aiohttp.abc import Request
from aiohttp.web_request import FileField
from marshmallow import Schema, fields

from abrechnung.http.openapi import docs, json_schema
from abrechnung.http.serializers import TransactionSchema
from abrechnung.http.utils import json_response

routes = web.RouteTableDef()


async def _transaction_response(request, transaction_id: int) -> web.Response:
    transaction = await request.app["transaction_service"].get_transaction(
        user_id=request["user"]["user_id"], transaction_id=transaction_id
    )

    serializer = TransactionSchema()
    return json_response(data=serializer.dump(transaction))


@routes.get(r"/groups/{group_id:\d+}/transactions")
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
        user_id=request["user"]["user_id"],
        group_id=group_id,
        min_last_changed=min_last_changed,
        additional_transactions=forced_transaction_ids,
    )

    serializer = TransactionSchema()
    return json_response(data=serializer.dump(transactions, many=True))


@routes.post(r"/groups/{group_id:\d+}/transactions")
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
        },
        name="CreateTransactionSchema",
    )
)
async def create_transaction(request: Request):
    data = request["json"]
    group_id: int = int(request.match_info["group_id"])

    transaction_id = await request.app["transaction_service"].create_transaction(
        user_id=request["user"]["user_id"],
        group_id=group_id,
        description=data["description"],
        type=data["type"],
        currency_symbol=data["currency_symbol"],
        currency_conversion_rate=float(data["currency_conversion_rate"]),
        billed_at=data["billed_at"],
        value=float(data["value"]),
    )

    return await _transaction_response(request, transaction_id)


@routes.get(r"/transactions/{transaction_id:\d+}")
@docs(
    tags=["transactions"],
    summary="get transaction details",
    responses={200: {"schema": TransactionSchema, "description": ""}},
    description="",
)
async def get_transaction(request: Request):
    transaction = await request.app["transaction_service"].get_transaction(
        user_id=request["user"]["user_id"],
        transaction_id=int(request.match_info["transaction_id"]),
    )

    serializer = TransactionSchema()
    return json_response(data=serializer.dump(transaction))


@routes.post(r"/transactions/{transaction_id:\d+}")
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
        },
        name="UpdateTransactionSchema",
    )
)
async def update_transaction(request: Request):
    data = request["json"]
    transaction_id = int(request.match_info["transaction_id"])

    await request.app["transaction_service"].update_transaction(
        user_id=request["user"]["user_id"],
        transaction_id=transaction_id,
        value=data["value"],
        description=data["description"],
        currency_symbol=data["currency_symbol"],
        currency_conversion_rate=data["currency_conversion_rate"],
        billed_at=data["billed_at"],
    )

    return await _transaction_response(request, transaction_id)


@routes.post(r"/transactions/{transaction_id:\d+}/commit")
@docs(
    tags=["transactions"],
    summary="commit currently pending transaction changes",
    responses={200: {"schema": TransactionSchema, "description": ""}},
    description="",
)
async def commit_transaction(request: Request):
    transaction_id = int(request.match_info["transaction_id"])
    await request.app["transaction_service"].commit_transaction(
        user_id=request["user"]["user_id"],
        transaction_id=transaction_id,
    )

    return await _transaction_response(request, transaction_id)


@routes.delete(r"/transactions/{transaction_id:\d+}")
@docs(
    tags=["transactions"],
    summary="delete a transaction",
    responses={200: {"schema": TransactionSchema, "description": ""}},
    description="",
)
async def delete_transaction(request: Request):
    transaction_id = int(request.match_info["transaction_id"])
    await request.app["transaction_service"].delete_transaction(
        user_id=request["user"]["user_id"],
        transaction_id=transaction_id,
    )

    return await _transaction_response(request, transaction_id)


@routes.post(r"/transactions/{transaction_id:\d+}/new_change")
@docs(
    tags=["transactions"],
    summary="create a new pending transaction revision",
    responses={200: {"schema": TransactionSchema, "description": ""}},
    description="",
)
async def create_transaction_change(request: Request):
    transaction_id = int(request.match_info["transaction_id"])
    await request.app["transaction_service"].create_transaction_change(
        user_id=request["user"]["user_id"],
        transaction_id=int(request.match_info["transaction_id"]),
    )

    return await _transaction_response(request, transaction_id)


@routes.post(r"/transactions/{transaction_id:\d+}/discard")
@docs(
    tags=["transactions"],
    summary="discard currently pending transaction changes",
    responses={200: {"schema": TransactionSchema, "description": ""}},
    description="",
)
async def discard_transaction_change(request: Request):
    transaction_id = int(request.match_info["transaction_id"])
    await request.app["transaction_service"].discard_transaction_changes(
        user_id=request["user"]["user_id"],
        transaction_id=transaction_id,
    )

    return await _transaction_response(request, transaction_id)


class ChangeShareResponse(Schema):
    account_id = fields.Int()
    value = fields.Number()


class DeleteShareResponse(Schema):
    account_id = fields.Int()


@routes.post(r"/transactions/{transaction_id:\d+}/creditor_shares")
@docs(
    tags=["transactions"],
    summary="add or update a creditor share",
    responses={200: {"schema": TransactionSchema, "description": ""}},
    description="",
)
@json_schema(ChangeShareResponse)
async def add_or_change_creditor_share(request: Request):
    data = request["json"]
    transaction_id = int(request.match_info["transaction_id"])
    await request.app["transaction_service"].add_or_change_creditor_share(
        user_id=request["user"]["user_id"],
        transaction_id=transaction_id,
        account_id=data["account_id"],
        value=float(data["value"]),
    )

    return await _transaction_response(request, transaction_id)


@routes.post(r"/transactions/{transaction_id:\d+}/creditor_shares/switch")
@docs(
    tags=["transactions"],
    summary="switch the current creditor share",
    description="For transfer type transactions only one creditor share is allowed, "
    "this allows switching the currently selected creditor share with a new one. "
    "This is essentially a shortcut to deleting the current share and adding a new one.",
    responses={200: {"schema": TransactionSchema, "description": ""}},
)
@json_schema(ChangeShareResponse)
async def switch_creditor_share(request: Request):
    data = request["json"]
    transaction_id = int(request.match_info["transaction_id"])
    await request.app["transaction_service"].switch_creditor_share(
        user_id=request["user"]["user_id"],
        transaction_id=transaction_id,
        account_id=data["account_id"],
        value=float(data["value"]),
    )

    return await _transaction_response(request, transaction_id)


@routes.delete(r"/transactions/{transaction_id:\d+}/creditor_shares")
@docs(
    tags=["transactions"],
    summary="delete a creditor share",
    responses={200: {"schema": TransactionSchema, "description": ""}},
    description="",
)
@json_schema(DeleteShareResponse)
async def delete_creditor_share(request: Request):
    data = request["json"]
    transaction_id = int(request.match_info["transaction_id"])
    await request.app["transaction_service"].delete_creditor_share(
        user_id=request["user"]["user_id"],
        transaction_id=transaction_id,
        account_id=data["account_id"],
    )

    return await _transaction_response(request, transaction_id)


@routes.post(r"/transactions/{transaction_id:\d+}/debitor_shares")
@docs(
    tags=["transactions"],
    summary="add or change a debitor share",
    responses={200: {"schema": TransactionSchema, "description": ""}},
    description="",
)
@json_schema(ChangeShareResponse)
async def add_or_change_debitor_share(request: Request):
    data = request["json"]
    transaction_id = int(request.match_info["transaction_id"])
    await request.app["transaction_service"].add_or_change_debitor_share(
        user_id=request["user"]["user_id"],
        transaction_id=transaction_id,
        account_id=data["account_id"],
        value=float(data["value"]),
    )

    return await _transaction_response(request, transaction_id)


@routes.post(r"/transactions/{transaction_id:\d+}/debitor_shares/switch")
@docs(
    tags=["transactions"],
    summary="switch the current debitor share",
    description="For transfer and purchase type transactions only one debitor share is allowed, "
    "this allows switching the currently selected debitor share with a new one. "
    "This is essentially a shortcut to deleting the current share and adding a new one.",
    responses={200: {"schema": TransactionSchema, "description": ""}},
)
@json_schema(ChangeShareResponse)
async def switch_debitor_share(request: Request):
    data = request["json"]
    transaction_id = int(request.match_info["transaction_id"])
    await request.app["transaction_service"].switch_debitor_share(
        user_id=request["user"]["user_id"],
        transaction_id=transaction_id,
        account_id=data["account_id"],
        value=float(data["value"]),
    )

    return await _transaction_response(request, transaction_id)


@routes.delete(r"/transactions/{transaction_id:\d+}/debitor_shares")
@docs(
    tags=["transactions"],
    summary="delete a debitor share",
    responses={200: {"schema": TransactionSchema, "description": ""}},
    description="",
)
@json_schema(DeleteShareResponse)
async def delete_debitor_share(request: Request):
    data = request["json"]
    transaction_id = int(request.match_info["transaction_id"])
    await request.app["transaction_service"].delete_debitor_share(
        user_id=request["user"]["user_id"],
        transaction_id=transaction_id,
        account_id=data["account_id"],
    )

    return await _transaction_response(request, transaction_id)


class PositionCreateResponse(Schema):
    transaction = fields.Nested(TransactionSchema)
    item_id = fields.Int()


@routes.post(r"/transactions/{transaction_id:\d+}/purchase_items")
@docs(
    tags=["transactions"],
    summary="create a transaction position",
    description="",
    responses={
        200: {
            "schema": PositionCreateResponse,
            "description": "",
        }
    },
)
@json_schema(
    Schema.from_dict(
        {
            "name": fields.Str(),
            "price": fields.Number(),
            "communist_shares": fields.Number(),
            "usages": fields.Dict(
                keys=fields.Int(),
                values=fields.Number(),
                required=False,
                load_default=None,
            ),
        },
        name="CreatePositionSchema",
    )
)
async def create_purchase_item(request: Request):
    transaction_id = int(request.match_info["transaction_id"])
    data = request["json"]
    item_id = await request.app["transaction_service"].create_purchase_item(
        user_id=request["user"]["user_id"],
        transaction_id=transaction_id,
        name=data["name"],
        price=data["price"],
        communist_shares=data["communist_shares"],
        usages=data["usages"],
    )
    transaction = await request.app["transaction_service"].get_transaction(
        user_id=request["user"]["user_id"], transaction_id=transaction_id
    )

    serializer = TransactionSchema()

    return json_response(
        data={"transaction": serializer.dump(transaction), "item_id": item_id}
    )


@routes.post(r"/purchase_items/{item_id:\d+}")
@docs(
    tags=["transactions"],
    summary="update a transaction position",
    description="",
    responses={200: {"schema": TransactionSchema, "description": ""}},
)
@json_schema(
    Schema.from_dict(
        {
            "name": fields.Str(),
            "price": fields.Number(),
            "communist_shares": fields.Number(),
        },
        name="UpdatePositionSchema",
    )
)
async def update_purchase_item(request: Request):
    data = request["json"]
    transaction_id, revision_id = await request.app[
        "transaction_service"
    ].update_purchase_item(
        user_id=request["user"]["user_id"],
        item_id=int(request.match_info["item_id"]),
        name=data["name"],
        price=data["price"],
        communist_shares=data["communist_shares"],
    )

    return await _transaction_response(request, transaction_id)


@routes.post(r"/purchase_items/{item_id:\d+}/shares")
@docs(
    tags=["transactions"],
    summary="add or change a transaction position share",
    description="",
    responses={200: {"schema": TransactionSchema, "description": ""}},
)
@json_schema(
    Schema.from_dict(
        {
            "account_id": fields.Int(),
            "share_amount": fields.Number(),
        },
        name="ChangeShareSchema",
    )
)
async def add_or_change_item_share(request: Request):
    data = request["json"]
    transaction_id, revision_id = await request.app[
        "transaction_service"
    ].add_or_change_item_share(
        user_id=request["user"]["user_id"],
        item_id=int(request.match_info["item_id"]),
        account_id=data["account_id"],
        share_amount=data["share_amount"],
    )

    return await _transaction_response(request, transaction_id)


@routes.delete(r"/purchase_items/{item_id:\d+}/shares")
@docs(
    tags=["transactions"],
    summary="delete a position share",
    description="",
    responses={200: {"schema": TransactionSchema, "description": ""}},
)
@json_schema(DeleteShareResponse)
async def delete_item_share(request: Request):
    data = request["json"]
    transaction_id, revision_id = await request.app[
        "transaction_service"
    ].delete_item_share(
        user_id=request["user"]["user_id"],
        item_id=int(request.match_info["item_id"]),
        account_id=data["account_id"],
    )

    return await _transaction_response(request, transaction_id)


@routes.delete(r"/purchase_items/{item_id:\d+}")
@docs(
    tags=["transactions"],
    summary="delete a transaction position",
    description="",
    responses={200: {"schema": TransactionSchema, "description": ""}},
)
async def delete_purchase_item(request: Request):
    transaction_id, revision_id = await request.app[
        "transaction_service"
    ].delete_purchase_item(
        user_id=request["user"]["user_id"], item_id=int(request.match_info["item_id"])
    )

    return await _transaction_response(request, transaction_id)


@routes.post(r"/transactions/{transaction_id:\d+}/files")
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
        user_id=request["user"]["user_id"],
        transaction_id=transaction_id,
        filename=filename,
        mime_type=mime_type,
        content=content,
    )

    return await _transaction_response(request, transaction_id)


@routes.delete(r"/files/{file_id:\d+}")
@docs(
    tags=["transactions"],
    summary="delete a transaction attachment",
    description="",
    responses={200: {"schema": TransactionSchema, "description": ""}},
)
async def delete_file(request: Request):
    transaction_id, revision_id = await request.app["transaction_service"].delete_file(
        user_id=request["user"]["user_id"],
        file_id=int(request.match_info["file_id"]),
    )

    return await _transaction_response(request, transaction_id)


@routes.get(r"/files/{file_id:\d+}/{blob_id:\d+}")
@docs(
    tags=["transactions"],
    summary="fetch the (binary) contents of a transaction attachment",
    description="",
)
async def get_file_contents(request: Request):
    file_id = int(request.match_info["file_id"])
    blob_id = int(request.match_info["blob_id"])
    mime_type, content = await request.app["transaction_service"].read_file_contents(
        user_id=request["user"]["user_id"],
        file_id=file_id,
        blob_id=blob_id,
    )

    return web.Response(body=content, content_type=mime_type)
