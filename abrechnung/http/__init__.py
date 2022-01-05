import asyncio
import json
import logging
import traceback
from typing import Optional

import aiohttp
import aiohttp_cors as aiohttp_cors
import asyncpg.pool
import jwt
import schema
from aiohttp import web
from asyncpg.pool import Pool

from abrechnung.application.accounts import AccountService
from abrechnung.application.groups import GroupService
from abrechnung.application.transactions import TransactionService
from abrechnung.application.users import UserService
from abrechnung.config import Config
from abrechnung.database import db_connect
from abrechnung.http import auth, groups, transactions, websocket, accounts
from abrechnung.http.auth import jwt_middleware, decode_jwt_token
from abrechnung.http.openapi import setup_aiohttp_apispec, validation_middleware
from abrechnung.http.utils import error_middleware, encode_json
from abrechnung.subcommand import SubCommand


class HTTPService(SubCommand):
    """
    sft psql websocket gateway
    """

    def __init__(self, config: Config, **kwargs):
        self.cfg = config

        # map connection_id -> tx queue
        self.tx_queues: dict[int, asyncio.Queue] = dict()

        self.logger = logging.getLogger(__name__)

        # psql notification channel id,
        # we get this when booting from the db.
        self.channel_id: Optional[int] = None
        self.channel_name: Optional[str] = None

    async def run(self):
        """
        run the websocket server
        """

        db_pool = await db_connect(
            username=self.cfg["database"]["user"],
            password=self.cfg["database"]["password"],
            database=self.cfg["database"]["dbname"],
            host=self.cfg["database"]["host"],
        )

        async with db_pool.acquire() as conn:
            # configure automatic decoding of json type postgresql values
            await conn.set_type_codec(
                "json", encoder=json.dumps, decoder=json.loads, schema="pg_catalog"
            )
            await conn.set_type_codec(
                "jsonb", encoder=json.dumps, decoder=json.loads, schema="pg_catalog"
            )

            await self._register_forwarder(conn, forwarder_id=self.cfg["api"]["id"])

            try:
                app = self.create_app(db_pool=db_pool)
                app.router.add_route("GET", "/", self.handle_ws_connection)

                await web._run_app(
                    app, host=self.cfg["api"]["host"], port=self.cfg["api"]["port"]
                )
            finally:
                await self._unregister_forwarder(
                    conn, forwarder_id=self.cfg["api"]["id"]
                )

        await db_pool.close()

    async def _register_forwarder(
        self, connection: asyncpg.Connection, forwarder_id: str
    ):
        # register at db
        self.channel_id = await connection.fetchval(
            "select channel_id from forwarder_boot($1)", forwarder_id
        )

        self.logger.info(
            f"Registered forwarder {forwarder_id}: DB gave us channel_id {self.channel_id!r}"
        )
        self.channel_name = f"channel{self.channel_id}"

        # one channel for NOTIFY to this db-client
        await connection.add_listener(self.channel_name, self.on_psql_notification)

        self.logger.info(
            f"Listening on postgresql triggers on channel '{self.channel_name}'"
        )

    async def _unregister_forwarder(
        self, connection: asyncpg.Connection, forwarder_id: str
    ):
        # deregister at db
        await connection.remove_listener(self.channel_name, self.on_psql_notification)

        self.logger.info(f"Unregistered forwarder {forwarder_id}")
        await connection.execute("select * from forwarder_stop($1)", forwarder_id)

    def _create_api_app(
        self, db_pool: Pool, middlewares: Optional[list] = None
    ) -> web.Application:
        api_app = web.Application(middlewares=middlewares)  # type: ignore
        api_app["secret_key"] = self.cfg["api"]["secret_key"]
        api_app["db_pool"] = db_pool
        api_app["config"] = self.cfg

        api_app["user_service"] = UserService(
            db_pool=db_pool,
            config=self.cfg,
        )
        api_app["group_service"] = GroupService(db_pool=db_pool, config=self.cfg)
        api_app["account_service"] = AccountService(db_pool=db_pool, config=self.cfg)
        api_app["transaction_service"] = TransactionService(
            db_pool=db_pool, config=self.cfg
        )

        api_app.add_routes(groups.routes)
        api_app.add_routes(transactions.routes)
        api_app.add_routes(auth.routes)
        api_app.add_routes(accounts.routes)

        api_app.router.add_route("GET", "/ws", self.handle_ws_connection)
        return api_app

    def create_app(
        self,
        db_pool: Pool,
        middlewares: Optional[list] = None,
    ) -> web.Application:
        app = web.Application()
        app["secret_key"] = self.cfg["api"]["secret_key"]
        app["db_pool"] = db_pool
        app["config"] = self.cfg

        if middlewares is None:
            auth_middleware = jwt_middleware(
                secret=self.cfg["api"]["secret_key"],
                whitelist=[
                    "/api/v1/auth/login",
                    "/api/v1/auth/register",
                    "/api/v1/auth/fetch_access_token",
                    "/api/v1/auth/confirm_registration",
                    "/api/v1/auth/confirm_email_change",
                    "/api/v1/auth/recover_password",
                    "/api/v1/auth/confirm_password_recovery",
                    "/api/v1/ws",
                    "/api/v1/docs",
                    "/api/v1/static",
                ],
            )
            middlewares = [auth_middleware]

        middlewares += [error_middleware, validation_middleware]

        api_app = self._create_api_app(db_pool=db_pool, middlewares=middlewares)

        if self.cfg["api"].get("enable_cors", False):
            cors = aiohttp_cors.setup(
                api_app,
                defaults={
                    "*": aiohttp_cors.ResourceOptions(
                        allow_credentials=True,
                        expose_headers="*",
                        allow_headers="*",
                        allow_methods="*",
                    )
                },
            )
            # add all routes to cors exemptions
            for route in list(api_app.router.routes()):
                cors.add(route)

        setup_aiohttp_apispec(
            app=api_app,
            title="Abrechnung OpenAPI Documentation",
            version="v1",
            url="/docs/swagger.json",
        )

        app.add_subapp("/api/v1/", api_app)

        return app

    def on_psql_notification(
        self, connection: asyncpg.Connection, pid: int, channel: str, payload: str
    ):
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

        self.logger.debug(
            f"Received psql notification on channel {channel} with payload {payload}"
        )

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
                self.tx_queues[connection_id].put_nowait(message)
            except KeyError:
                pass  # tx queue is no longer available
            except asyncio.QueueFull:
                self.logger.warning(
                    f"[{connection_id}] tx queue full, skipping notification"
                )

    async def handle_ws_connection(self, request):
        """
        how to talk over a websocket connection.
        """
        ws = aiohttp.web.WebSocketResponse()
        await ws.prepare(request)

        async with request.app["db_pool"].acquire() as connection:
            # register the client connection at the db
            connection_id = await connection.fetchval(
                "select connection_id from client_connected($1)", self.channel_id
            )
            self.logger.debug(f"Websocket client connected with id {connection_id}")

        # create the tx queue and task
        tx_queue = asyncio.Queue(maxsize=1000)
        self.tx_queues[connection_id] = tx_queue
        tx_task = asyncio.create_task(self.tx_task(ws, tx_queue))

        try:
            async for msg in ws:
                try:
                    if msg.type == aiohttp.WSMsgType.TEXT:
                        msg_obj = json.loads(msg.data)
                        websocket.CLIENT_SCHEMA.validate(msg_obj)

                        async with request.app["db_pool"].acquire() as connection:
                            response = await self.ws_message(
                                connection, connection_id, msg_obj
                            )
                    else:
                        self.logger.info(
                            f"websocket got unhandled websocket message on connection id {connection_id}: {msg.type}"
                        )
                        continue
                except (
                    asyncpg.DataError,
                    json.JSONDecodeError,
                    schema.SchemaError,
                ) as exc:
                    response = websocket.make_error_msg(
                        code=web.HTTPBadRequest.status_code, msg=str(exc)
                    )
                except Exception as exc:
                    traceback.print_exc()
                    response = websocket.make_error_msg(
                        code=web.HTTPInternalServerError.status_code, msg=str(exc)
                    )
                try:
                    tx_queue.put_nowait(response)
                except asyncio.QueueFull:
                    self.logger.error(
                        f"websocket with id {connection_id} error: tx queue full"
                    )
                    break
        finally:
            async with request.app["db_pool"].acquire() as connection:
                # deregister the client connection
                await connection.execute("call client_disconnected($1)", connection_id)
            # stop the tx task
            del self.tx_queues[connection_id]
            tx_task.cancel()
            await tx_task
            self.logger.debug(f"websocket client with id {connection_id} disconnected")

        return ws

    @staticmethod
    async def tx_task(ws, tx_queue):
        """
        task for sending messages from a queue to a websocket connection
        """
        while True:
            item = await tx_queue.get()
            msg = json.dumps(item, default=encode_json) + "\n"
            await asyncio.shield(ws.send_str(msg))

    async def ws_message(
        self, connection: asyncpg.Connection, connection_id: str, msg: dict
    ):
        """
        the websocket client sent a message. handle it.
        """
        auth_token = msg["token"]
        try:
            jwt_claims = decode_jwt_token(auth_token, self.cfg["api"]["secret_key"])
        except jwt.PyJWTError as exc:
            return websocket.make_error_msg(
                code=web.HTTPUnauthorized.status_code, msg=str(exc)
            )

        msg_type = msg["type"]
        user_id = jwt_claims["user_id"]
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
                return websocket.make_error_msg(
                    code=web.HTTPBadRequest.status_code, msg=str(exc)
                )
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
                return websocket.make_error_msg(
                    code=web.HTTPBadRequest.status_code, msg=str(exc)
                )

        else:
            return websocket.make_error_msg(
                code=web.HTTPBadRequest.status_code,
                msg=f"invalid message type {msg_type}",
            )

        raise Exception("reached unreachable place")
