import asyncio
import json
import logging
from collections import defaultdict
from uuid import UUID

import aiohttp
import schema
from aiohttp import web
from jose import jwt

from abrechnung.http.utils import json_serializer

logger = logging.getLogger(__name__)

routes = web.RouteTableDef()

CLIENT_SCHEMA = schema.Schema(
    schema.Or(
        {"type": "auth", "data": {"access_token": str}},
        {
            "type": "subscribe",
            "data": schema.Or(
                {"scope": "group"},
                {
                    "scope": schema.Or("account", "transaction"),
                    "group_id": schema.Use(UUID),
                },
            ),
        },
        {
            "type": "unsubscribe",
            "data": schema.Or(
                {"scope": "group"},
                {
                    "scope": schema.Or("account", "transaction"),
                    "group_id": schema.Use(UUID),
                },
            ),
        },
    )
)

SERVER_SCHEMA = schema.Schema(
    schema.Or(
        {"type": "error", "data": {"msg": str}},
        {
            "type": "notification",
            "data": {
                "scope": str,
                schema.Optional("group_id"): schema.Use(UUID),
                schema.Optional("account_id"): schema.Use(UUID),
                schema.Optional("transaction_id"): schema.Use(UUID),
            },
        },
        {"type": "auth_success", "data": {}},
    )
)


class NotificationHandler:
    def __init__(self):
        self._websockets: dict[UUID, set[web.WebSocketResponse]] = defaultdict(set)

        # map of user_id to map of scope to set of group_ids a user is listening to changes for
        self._user_listeners: set[UUID] = set()
        self._group_listeners: dict[UUID, set[UUID]] = defaultdict(set)

    def _notify_users(self, user_ids: set[UUID], msg: dict):
        for user_id in user_ids:
            if user_id in self._user_listeners:
                for websocket in self._websockets.get(user_id, set()):
                    # TODO: figure out if this is a good idea, aka. calling an async function from a sync context like
                    #  this
                    asyncio.get_event_loop().create_task(
                        websocket.send_str(
                            data=json.dumps(msg, default=json_serializer)
                        )
                    )

    def _notify_group(self, user_ids: set[UUID], group_id: UUID, msg: dict):
        for user_id in user_ids:
            if (
                user_id in self._group_listeners
                and group_id in self._group_listeners[user_id]
            ):
                for websocket in self._websockets.get(user_id, set()):
                    # TODO: figure out if this is a good idea, aka. calling an async function from a sync context like
                    #  this
                    asyncio.get_event_loop().create_task(
                        websocket.send_str(
                            data=json.dumps(msg, default=json_serializer)
                        )
                    )

    def add_websocket(self, user_id: UUID, websocket: web.WebSocketResponse):
        self._websockets[user_id].add(websocket)

    def remove_websocket(self, user_id: UUID, websocket: web.WebSocketResponse):
        self._websockets[user_id].remove(websocket)
        if len(self._websockets[user_id]) == 0:
            del self._websockets[user_id]

    def add_user_listener(self, user_id: UUID):
        self._user_listeners.add(user_id)

    def remove_user_listener(self, user_id: UUID):
        self._user_listeners.remove(user_id)

    def add_group_listener(self, user_id: UUID, group_id: UUID):
        self._group_listeners[user_id].add(group_id)

    def remove_group_listener(self, user_id: UUID, group_id: UUID):
        if user_id in self._group_listeners:
            self._group_listeners[user_id].remove(group_id)
            if len(self._group_listeners[user_id]) == 0:
                del self._group_listeners[user_id]

    # def event_listener(self, event: NotificationEvent):
    #     logger.info(f"handling notification event {event}")
    #     if isinstance(event, GroupNotification):
    #         self._notify_users(
    #             user_ids=event.user_ids,
    #             msg={
    #                 "type": "notification",
    #                 "data": {"scope": "group", "group_id": event.group_id},
    #             },
    #         )
    #     elif isinstance(event, AccountNotification):
    #         self._notify_group(
    #             user_ids=event.user_ids,
    #             group_id=event.group_id,
    #             msg={
    #                 "type": "notification",
    #                 "data": {
    #                     "scope": "account",
    #                     "group_id": event.group_id,
    #                     "account_id": event.account_id,
    #                 },
    #             },
    #         )
    #     elif isinstance(event, TransactionNotification):
    #         self._notify_group(
    #             user_ids=event.user_ids,
    #             group_id=event.group_id,
    #             msg={
    #                 "type": "notification",
    #                 "data": {
    #                     "scope": "transaction",
    #                     "group_id": event.group_id,
    #                     "transaction_id": event.transaction_id,
    #                 },
    #             },
    #         )


@routes.get("/ws")
async def websocket_handler(request):
    # FIXME: make me pretty please, I am very ugly
    ws = web.WebSocketResponse()
    await ws.prepare(request)

    user_id = None

    async for msg in ws:
        if msg.type == aiohttp.WSMsgType.TEXT:
            try:
                data = json.loads(msg.data)
                CLIENT_SCHEMA.validate(data)

                if data["type"] == "auth":
                    # TODO: move this somewhere else
                    token = jwt.decode(
                        data["data"]["access_token"],
                        request.app["secret_key"],
                        algorithms="HS256",
                    )
                    user_id = UUID(token["user_id"])
                    request.app["user_service"].get_user(
                        user_id=user_id
                    )  # check if the user exists
                    await ws.send_json({"type": "auth_success", "data": {}})
                    break

            except (TypeError, json.JSONDecodeError, schema.SchemaError) as e:
                await ws.send_json({"type": "error", "data": {"msg": str(e)}})

        elif msg.type == aiohttp.WSMsgType.ERROR:
            logger.info(f"ws connection closed with exception {ws.exception()}")
            await ws.close()
            return

    if user_id is None:  # we have not managed to be authenticated
        await ws.close()
        return

    notification_handler: NotificationHandler = request.app["notification_handler"]
    notification_handler.add_websocket(user_id=user_id, websocket=ws)

    async for msg in ws:
        if msg.type == aiohttp.WSMsgType.TEXT:
            try:
                data = json.loads(msg.data)
                CLIENT_SCHEMA.validate(data)

                if data["type"] == "subscribe":
                    if data["data"]["scope"] == "group":
                        notification_handler.add_user_listener(user_id)
                    else:
                        # TODO: make this more fine grained
                        notification_handler.add_group_listener(
                            user_id, UUID(data["data"]["group_id"])
                        )
                elif data["type"] == "unsubscribe":
                    if data["data"]["scope"] == "group":
                        notification_handler.remove_user_listener(user_id)
                    else:
                        # TODO: make this more fine grained
                        notification_handler.remove_group_listener(
                            user_id, UUID(data["data"]["group_id"])
                        )

            except (TypeError, json.JSONDecodeError, schema.SchemaError) as e:
                await ws.send_json({"type": "error", "data": {"msg": str(e)}})

        elif msg.type == aiohttp.WSMsgType.ERROR:
            logger.info(f"ws connection closed with exception {ws.exception()}")
            await ws.close()
            break

    notification_handler.remove_websocket(user_id=user_id, websocket=ws)

    return ws
