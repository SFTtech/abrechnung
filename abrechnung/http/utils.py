import functools
import json
from datetime import datetime, date
from typing import Optional, Any
from uuid import UUID

from aiohttp import web
from aiohttp.helpers import sentinel
from aiohttp.typedefs import LooseHeaders
from schema import Schema, SchemaError


def validate(request_schema: Schema):
    def wrapper(func):
        @functools.wraps(func)
        async def wrapped(request, *args):
            try:
                req_body = await request.json()
            except (json.decoder.JSONDecodeError, TypeError):
                raise web.HTTPBadRequest(
                    reason="Request is malformed; could not decode JSON object."
                )

            try:
                request_schema.validate(req_body)
            except SchemaError as e:
                raise web.HTTPBadRequest(
                    reason=f"Request is invalid; there are validation errors: {e}"
                )

            view_args = request, req_body
            response = await func(*view_args)

            return response

        return wrapped

    return wrapper


@web.middleware
async def error_middleware(request, handler):
    try:
        response = await handler(request)
        if response.status < 400:
            return response
        message = response.message
        status = response.status
    except web.HTTPException as ex:
        if ex.status >= 500:
            raise
        message = ex.reason
        status = ex.status
    return web.json_response({"error": message}, status=status)


def json_serializer(obj):
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    if isinstance(obj, UUID):
        return str(obj)

    raise TypeError(f"Type {type(obj)} is not serializable")


def json_response(
    data: Any = sentinel,
    *,
    text: Optional[str] = None,
    body: Optional[bytes] = None,
    status: int = 200,
    reason: Optional[str] = None,
    headers: Optional[LooseHeaders] = None,
    content_type: str = "application/json",
):
    return web.json_response(
        data,
        text=text,
        body=body,
        status=status,
        reason=reason,
        headers=headers,
        content_type=content_type,
        dumps=lambda x: json.dumps(x, default=json_serializer),
    )
