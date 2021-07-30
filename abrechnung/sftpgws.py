#!/usr/bin/env python3

"""
sft psql websocket gateway

Basically a websocket bridge to PostgreSQL.


(c) 2020-2021 Jonas Jelten <jj@sft.lol>

License: GPLv3 or any later version


The database needs these API functions for sftpgws:

* on startup
  * `channel_id:bigint forwarder_boot(forwarder:text)`
  * `functions:table get_allowed_functions()`

* client connections
  * `connection_id:bigint client_connected(forwarder:text)`
  * `client_disconnected(id:bigint)`

* on shutdown
  * `deleted_connections:integer forwarder_stop(forwarder:text)`
"""

import asyncio
import json
import logging
import re
import traceback
from datetime import datetime
from uuid import UUID

import aiohttp.web
import asyncpg

from . import util
from .subcommand import SubCommand


def encode_json(obj):
    if isinstance(obj, UUID):
        return str(obj)

    if isinstance(obj, datetime):
        return obj.isoformat()

    raise TypeError(f'cannot encode object of type {type(obj)}')


async def db_connect(cfg):
    """
    get a connection pool to the database
    """

    return await asyncpg.create_pool(
        user=cfg['database']['user'],
        password=cfg['database']['password'],
        database=cfg['database']['dbname'],
        host=cfg['database']['host']
    )


class SFTPGWS(SubCommand):
    """
    sft psql websocket gateway
    """

    def __init__(self, config, **args):
        self.cfg = config

        # map connection_id -> tx queue
        self.tx_queues = dict()

        # map allowed function name -> (requires_connection_id, is_procedure)
        self.function_whitelist = dict()

        self.logger = logging.getLogger(__name__)

        # psql notification channel id,
        # we get this when booting from the db.
        self.channel_id = None
        self.channel_name = None

    async def run(self):
        """
        run the websocket server
        """

        db_pool = await db_connect(self.cfg)

        async with db_pool.acquire() as conn:
            # configure automatic decoding of json type postgresql values
            await conn.set_type_codec(
                'json',
                encoder=json.dumps,
                decoder=json.loads,
                schema='pg_catalog'
            )

            # register at db
            self.channel_id = await conn.fetchval(
                "select * from forwarder_boot($1);",
                self.cfg['websocket']['id']
            )

            self.logger.info(f'DB gave us channel_id {self.channel_id!r}')
            self.channel_name = f'channel{self.channel_id}'

            # one channel for NOTIFY to this db-client
            await conn.add_listener(self.channel_name,
                                    self.on_psql_notification)

            for record in await conn.fetch("select * from get_allowed_functions();"):
                self.function_whitelist[record[0]] = record[1], record[2]

            try:
                app = aiohttp.web.Application()
                app['pool'] = db_pool
                app.router.add_route('GET', '/',
                                     self.handle_ws_connection)

                await aiohttp.web._run_app(app,
                                           host=self.cfg['websocket']['host'],
                                           port=self.cfg['websocket']['port'],
                                           print=None)
            finally:
                # deregister at db
                await conn.execute("select * from forwarder_stop($1);",
                                   self.cfg['websocket']['id'])

    def on_psql_notification(self, connection, pid, channel, payload):
        """
        this is called by psql to deliver a notify.

        psql sends a json to this notification channel,
        which it knows by the forwarder id assigned to us on boot.

        expected json message from psql:
        {
            -- what connectionids this notification is for
            "connections": "*" or [connid, ...],

            -- which event this notification describes
            "event": "...",

            -- event-specific args
            "args": ...
        }

        """
        del connection, pid  # unused

        if channel != self.channel_name:
            raise Exception(f"bug: forwarder got a notification "
                            f"for channel {channel!r}, "
                            f"but registered is {self.channel_name!r}")

        payload_json = json.loads(payload)

        connections = payload_json['connections']
        for connection_id in self.tx_queues if connections == '*' else connections:
            message = {
                "type": "notification",
                "event": payload_json["event"],
                "args": payload_json["args"]
                # TODO: support for connection_id-specific 'triggers' and 'count'
            }
            try:
                self.tx_queues.get(connection_id).put_nowait(message)
            except KeyError:
                pass  # tx queue is no longer available
            except asyncio.QueueFull:
                self.logger.warning(f'[{connection_id}] tx queue full, skipping notification')

    async def handle_ws_connection(self, request):
        """
        how to talk over a websocket connection.
        """
        ws = aiohttp.web.WebSocketResponse()
        await ws.prepare(request)

        # get a database connection
        async with request.app['pool'].acquire() as connection:
            # register the client connection at the db
            connection_id = await connection.fetchval(
                "select * from client_connected($1);",
                self.channel_id
            )
            self.logger.info(f'[{connection_id}] connected')

            # create the tx queue and task
            tx_queue = asyncio.Queue(maxsize=1000)
            self.tx_queues[connection_id] = tx_queue
            tx_task = asyncio.create_task(self.tx_task(ws, tx_queue))

            try:
                async for msg in ws:
                    try:
                        self.logger.info(f'[{connection_id}] unhandled websocket message {msg.type}, {msg.data}')
                        if msg.type == aiohttp.WSMsgType.TEXT:
                            msg_obj = json.loads(msg.data)
                            response = await self.ws_message(connection, connection_id, msg_obj)
                        else:
                            self.logger.info(f'[{connection_id}] unhandled websocket message {msg.type}')
                            continue
                    except Exception as exc:
                        traceback.print_exc()
                        response = {
                            'type': 'generic-error',
                            'error-id': type(exc).__name__,
                            'error': str(exc)
                        }
                    try:
                        tx_queue.put_nowait(response)
                    except asyncio.QueueFull:
                        self.logger.error(f'[{connection_id}] tx queue full')
                        break
            finally:
                # deregister the client connection
                await connection.execute("call client_disconnected($1);", connection_id)
                # stop the tx task
                del self.tx_queues[connection_id]
                tx_task.cancel()
                await tx_task
                self.logger.info(f'[{connection_id}] disconnected')

        return ws

    @staticmethod
    async def tx_task(ws, tx_queue):
        """
        task for sending messages from a queue to a websocket connection
        """
        while True:
            item = await tx_queue.get()
            msg = json.dumps(item, default=encode_json) + '\n'
            await asyncio.shield(ws.send_str(msg))

    async def ws_message(self, connection, connection_id, msg):
        """
        the websocket client sent a message. handle it.
        """
        msg_type = msg['type']

        if msg_type == 'call':
            # call a sql function

            call_id = msg['id']
            func = msg['func']
            args = msg['args']

            # check if func is allowed
            try:
                requires_connection_id, is_procedure = self.function_whitelist[func]
            except KeyError:
                return {
                    "type": "call-error",
                    "id": call_id,
                    "error-id": "bad-function-name",
                    "error": f"not a callable function: {func!r}",
                }

            # construct the sql query
            if requires_connection_id:
                args['connection_id'] = connection_id

            # argument variables for the function
            func_args = []
            # arguments for psql
            query_args = []

            for arg_idx, (name, value) in enumerate(args.items()):
                # we can't pass function argument names
                # as $%d-parameter.
                if not re.match(r"[a-zA-Z0-9_]+", name):
                    return {
                        "type": "call-error",
                        "id": call_id,
                        "error-id": "bad-argument-name",
                        "error": f"argument name invalid: {name!r}",
                    }

                func_args.append(f'{name} := ${arg_idx + 1:d}')
                query_args.append(value)

            if is_procedure:
                query = f"call {func}({', '.join(func_args)});"
            else:
                query = f"select * from {func}({', '.join(func_args)});"

            self.logger.info(f"[{connection_id}] {util.BOLD}{query}{util.NORMAL} {query_args!r}")

            prepared_query = await connection.prepare(query)
            for arg_id, arg_info in enumerate(prepared_query.get_parameters()):
                if arg_info.name == 'timestamptz':
                    query_args[arg_id] = datetime.strptime(
                        query_args[arg_id],
                        "%Y-%m-%dT%H:%M:%S.%f%z"
                    )

            try:
                # perform the call!
                query_result = await prepared_query.fetch(*query_args, timeout=10)
            except asyncpg.RaiseError as exc:
                # a specific error was raised in the db
                error_id, error = exc.args[0].split(':', maxsplit=1)
                return {
                    "type": "call-error",
                    "id": call_id,
                    "error-id": error_id,
                    "error": error
                }
            except asyncpg.PostgresError as exc:
                return {
                    "type": "call-error",
                    "id": call_id,
                    "error-id": type(exc).__name__,
                    "error": str(exc)
                }

            # TODO: BIG TODO: figure out whether this is efficient enough
            return_types = prepared_query.get_attributes()
            return_data = [
                dict((name, json.loads(value) if ret_type.type.name == 'json' and value is not None else value) for ret_type, name, value in
                     zip(return_types, query_result[0].keys(), record)) for record in query_result
            ]

            return {
                "type": "call-result",
                "id": call_id,
                "data": return_data
            }

        elif msg_type == 'trigger':
            # set up redirect for notification to a function call

            call_id = msg.get('id')
            # TODO notification -> func call setup
            raise NotImplementedError()

        else:
            raise Exception(f"unknown message type {msg_type!r}")

        raise Exception("reached unreachable place")
