import functools
import json
from datetime import datetime, date
from typing import Optional, Any
from uuid import UUID

import asyncpg
from aiohttp import web
from aiohttp.helpers import sentinel
from aiohttp.typedefs import LooseHeaders
from marshmallow import ValidationError

from abrechnung.application import NotFoundError, InvalidCommand


def validate(request_schema: type):
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
                request_schema().load(req_body)
            except ValidationError as e:
                raise web.HTTPBadRequest(
                    reason=f"Request is invalid; there are validation errors: {e.messages}"
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
    except (
        asyncpg.DataError,
        asyncpg.RaiseError,
        asyncpg.IntegrityConstraintViolationError,
        InvalidCommand,
    ) as ex:
        # catch underlying bad query inputs to catch schema violations as bad requests
        status = web.HTTPBadRequest.status_code
        message = str(ex)
    except NotFoundError as ex:
        # catch underlying bad query inputs to catch schema violations as bad requests
        status = web.HTTPNotFound.status_code
        message = str(ex)
    except PermissionError as ex:
        # catch underlying permission errors
        status = web.HTTPForbidden.status_code
        message = str(ex)
    except web.HTTPException as ex:
        message = ex.reason
        status = ex.status
    # except Exception as ex:  # TODO: deliberate whether this is such a good idea, but it guarantees json responses
    #     status = web.HTTPInternalServerError.status_code
    #     message = str(ex)

    return web.json_response({"code": status, "msg": message}, status=status)


def encode_json(obj):
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
        dumps=lambda x: json.dumps(x, default=encode_json),
    )
