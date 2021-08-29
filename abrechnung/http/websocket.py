import logging

import schema
from aiohttp import web

logger = logging.getLogger(__name__)

routes = web.RouteTableDef()

CLIENT_SCHEMA = schema.Schema(
    schema.Or(
        {
            "type": "subscribe",
            "token": str,
            "data": {"subscription_type": str, "element_id": int},
        },
        {
            "type": "unsubscribe",
            "token": str,
            "data": {"subscription_type": str, "element_id": int},
        },
    )
)

SERVER_SCHEMA = schema.Schema(
    schema.Or(
        {"type": "error", "data": {"code": int, "msg": str}},
        {
            "type": "notification",
            "data": {
                "subscription_type": str,
                "element_id": int,
            },
        },
        {
            "type": "subscribe_success",
            "data": {
                "subscription_type": str,
                "element_id": int,
            },
        },
        {
            "type": "unsubscribe_success",
            "data": {
                "subscription_type": str,
                "element_id": int,
            },
        },
    )
)


def make_error_msg(code: int, msg: str) -> dict:
    return {"type": "error", "data": {"code": code, "msg": msg}}
