import asyncio
import json
import logging
import traceback
from typing import Optional

import asyncpg
import schema
from fastapi import APIRouter, Request, WebSocket, WebSocketException, status

from abrechnung.application.users import UserService
from abrechnung.config import Config
from abrechnung.http.utils import encode_json

router = APIRouter(
    prefix="/api",
    tags=["websocket"],
)

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


class NotificationManager:
    def __init__(self, config: Config):
        self.logger = logging.getLogger(__name__)
        self.config = config

        # map of connection_id to websocket
        self.active_connections: dict[int, WebSocket] = {}

        # psql notification channel id,
        # we get this when booting from the db.
        self.channel_id: Optional[int] = None
        self.channel_name: Optional[str] = None

        self.db_pool: Optional[asyncpg.Pool] = None
        self.connection: Optional[asyncpg.Connection] = None

    async def initialize(self, db_pool: asyncpg.Pool):
        self.db_pool = db_pool
        self.connection = await self.db_pool.acquire()
        await self.connection.set_type_codec("json", encoder=json.dumps, decoder=json.loads, schema="pg_catalog")
        await self.connection.set_type_codec("jsonb", encoder=json.dumps, decoder=json.loads, schema="pg_catalog")
        await self._register_forwarder(self.connection, forwarder_id=self.config.api.id)

    async def teardown(self):
        await self._unregister_forwarder(self.connection, forwarder_id=self.config.api.id)
        if self.connection:
            await self.connection.close()

    async def _on_psql_notification(self, connection: asyncpg.Connection, pid: int, channel: str, payload: str):
        """
        this is called by psql to deliver a notify.

        psql sends a json to this notification channel,
        which it knows by the forwarder id assigned to us on boot.

        expected json message from psql:
        {
            -- what connectionids this notification is for
            "connections": [connid, ...],

            -- which event this notification describes
            "event": "...",

            -- event-specific args
            "args": ...
        }

        """
        # del connection, pid  # unused

        self.logger.debug(f"Received psql notification on channel {channel} with payload {payload}")

        if channel != self.channel_name:
            raise Exception(
                f"bug: forwarder got a notification "
                f"for channel {channel!r}, "
                f"but registered is {self.channel_name!r}"
            )

        payload_json = json.loads(payload)
        event = payload_json.pop("event")
        connections = payload_json["connections"]
        for connection_id in connections:
            message = {
                "type": "notification",
                "data": {"subscription_type": event, **payload_json["data"]},
            }
            try:
                await self.active_connections[connection_id].send_json(message)
            except KeyError:
                pass  # websocket
            except asyncio.QueueFull:
                self.logger.warning(f"[{connection_id}] tx queue full, skipping notification")

    async def _register_forwarder(self, connection: asyncpg.Connection, forwarder_id: str):
        # register at db
        self.channel_id = await connection.fetchval("select channel_id from forwarder_boot($1)", forwarder_id)

        self.logger.info(f"Registered forwarder {forwarder_id}: DB gave us channel_id {self.channel_id!r}")
        self.channel_name = f"channel{self.channel_id}"

        # one channel for NOTIFY to this db-client
        await connection.add_listener(self.channel_name, self._on_psql_notification)

        self.logger.info(f"Listening on postgresql triggers on channel '{self.channel_name}'")

    async def _unregister_forwarder(self, connection: asyncpg.Connection, forwarder_id: str):
        # deregister at db
        await connection.remove_listener(self.channel_name, self._on_psql_notification)

        self.logger.info(f"Unregistered forwarder {forwarder_id}")
        await connection.execute("select * from forwarder_stop($1)", forwarder_id)

    async def connect(self, websocket: WebSocket) -> int:
        await websocket.accept()
        if self.db_pool is None:
            raise WebSocketException(code=status.WS_1011_INTERNAL_ERROR)
        async with self.db_pool.acquire() as connection:
            # register the client connection at the db
            connection_id = await connection.fetchval("select connection_id from client_connected($1)", self.channel_id)
            self.logger.debug(f"Websocket client connected with id {connection_id}")

        self.active_connections[connection_id] = websocket

        return connection_id

    async def disconnect(self, connection_id: int, websocket: WebSocket):
        del self.active_connections[connection_id]

        if self.db_pool is None:
            raise WebSocketException(code=status.WS_1011_INTERNAL_ERROR)
        async with self.db_pool.acquire() as connection:
            # deregister the client connection
            await connection.execute("call client_disconnected($1)", connection_id)

        self.logger.debug(f"websocket client with id {connection_id} disconnected")


def get_notification_manager(request: Request) -> NotificationManager:
    return request.state.notification_manager


@router.websocket("/v1/ws")
async def websocket_endpoint(
    ws: WebSocket,
):
    """
    how to talk over a websocket connection.
    """
    notification_manager = ws.state.notification_manager
    db_pool = ws.state.db_pool
    user_service = ws.state.user_service

    connection_id = await notification_manager.connect(websocket=ws)

    try:
        while True:
            msg = await ws.receive_json()
            CLIENT_SCHEMA.validate(msg)
            try:
                async with db_pool.acquire() as connection:
                    response = await ws_message(connection, connection_id, msg, user_service)
            except (
                asyncpg.DataError,
                schema.SchemaError,
            ) as exc:
                response = make_error_msg(code=status.HTTP_400_BAD_REQUEST, msg=str(exc))
            except Exception as exc:
                traceback.print_exc()
                response = make_error_msg(code=status.HTTP_500_INTERNAL_SERVER_ERROR, msg=str(exc))

            serialized_response = json.dumps(response, default=encode_json)
            await ws.send_text(serialized_response)
    finally:
        await notification_manager.disconnect(connection_id=connection_id, websocket=ws)


async def ws_message(
    connection: asyncpg.Connection,
    connection_id: int,
    msg: dict,
    user_service: UserService,
) -> dict:
    """
    the websocket client sent a message. handle it.
    """
    auth_token = msg["token"]
    try:
        token_metadata = user_service.decode_jwt_payload(auth_token)
    except PermissionError as exc:
        return make_error_msg(code=status.HTTP_401_UNAUTHORIZED, msg=str(exc))

    msg_type = msg["type"]
    user_id = token_metadata.user_id
    data = msg["data"]
    if msg_type == "subscribe":
        try:
            await connection.execute(
                "call subscribe($1, $2, $3, $4)",
                connection_id,
                user_id,
                data["subscription_type"],
                data["element_id"],
            )
            return {"type": "subscribe_success", "data": data}
        except (asyncpg.RaiseError, asyncpg.PostgresError) as exc:
            # a specific error was raised in the db
            return make_error_msg(code=status.HTTP_400_BAD_REQUEST, msg=str(exc))
    elif msg_type == "unsubscribe":
        try:
            await connection.execute(
                "call unsubscribe($1, $2, $3, $4)",
                connection_id,
                user_id,
                data["subscription_type"],
                data["element_id"],
            )
            return {"type": "unsubscribe_success", "data": data}
        except (asyncpg.RaiseError, asyncpg.PostgresError) as exc:
            return make_error_msg(code=status.HTTP_400_BAD_REQUEST, msg=str(exc))

    else:
        return make_error_msg(
            code=status.HTTP_400_BAD_REQUEST,
            msg=f"invalid message type {msg_type}",
        )
