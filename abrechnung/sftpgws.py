#!/usr/bin/env python3

"""
sft psql websocket gateway

(c) 2020 Jonas Jelten <jj@sft.lol>

License: GPLv3 or any later version
"""

from .subcommand import SubCommand

import json
import logging
import re

import aiohttp.web
import asyncpg


"""
in forwarderconfig uuid generieren

create table connections(
    id serial,
    forwarderid text,
    conn_started timestamptz
);
"""


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

    @staticmethod
    def argparse_register(argparser):
        pass

    def __init__(self, config, **args):
        self.cfg = config

        # map client_id -> websocket
        self.open_connections = dict()

        # functions allowed to be called
        self.function_whitelist = {
            "test",
        }

    async def run(self):
        """
        run the websocket server
        """

        db_pool = await db_connect(self.cfg)

        async with db_pool.acquire() as conn:
            # register at db
            channel_id = await conn.fetchval("SELECT forwarder_boot($1);",
                                             self.cfg['websocket']['id'])

            logging.info(f'DB gave us channel_id {channel_id!r}')

            # one global channel for NOTIFY to this db-client
            await conn.add_listener(channel_id, self.psql_message)

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
                await conn.execute("SELECT forwarder_stop($1);",
                                   self.cfg['websocket']['id'])

    def psql_message(self, connection, pid, channel, payload):
        """
        this is called by psql to handle a notify.
        """

        # TODO notify relay to correct client

        raise NotImplementedError()

    async def handle_ws_connection(self, request):
        """
        how to talk over a websocket connection.
        """
        ws = aiohttp.web.WebSocketResponse()
        await ws.prepare(request)

        pool = request.app['pool']

        async with pool.acquire() as connection:
            # register the client at the db
            client_id = await connection.fetchval(
                "SELECT client_connected($1);",
                self.cfg['websocket']['id']
            )

            self.open_connections[client_id] = ws

            try:
                async for msg in ws:
                    try:
                        print(msg.data)
                        response = await self.ws_message(connection, client_id,
                                                         msg.data)
                        await ws.send_str("".join((response, "\n")))

                    except Exception as exc:
                        import traceback
                        traceback.print_exc()
                        await ws.send_str(f"error in ws_message: {exc}\n")

            finally:
                # deregister the websocket for notifications
                del self.open_connections[client_id]
                await connection.execute("SELECT client_disconnect($1);",
                                         client_id)

        return ws

    async def ws_message(self, connection, client_id, msg_raw):
        """
        the websocket client sent a message. handle it.
        """
        msg = json.loads(msg_raw)
        msg_type = msg.get('type')

        if msg_type == 'call':
            # call a sql function

            call_id = msg.get('id')
            func = msg.get('func')
            args = msg.get('args')

            # check if func is allowed:
            if func not in self.function_whitelist:
                return json.dumps({
                    "type": "call-permission-error",
                    "id": call_id,
                    "error": "permission denied",
                })

            # construct the sql query
            # SELECT $function($arg0, $arg1, ...);
            qry_parts = [f"SELECT {func}("]

            # arguments for psql
            qry_args = []

            # argument variables for the function
            func_args = []

            arg_id = 1
            for name, value in args.items():
                # we can't pass function argument names
                # as $%d-parameter.
                if not re.match(r"[a-zA-Z0-9_]+", name):
                    return json.dumps({
                        "type": "call-argument-error",
                        "id": call_id,
                        "error": "argument name invalid",
                    })

                func_args.append('%s := $%d' % (name, arg_id))

                # perform value injections
                if name == 'client_id':
                    value = client_id

                qry_args.append(str(value))
                arg_id += 1

            qry_parts.append(", ".join(func_args))
            qry_parts.append(');')

            try:
                # perform the call!
                qry = "".join(qry_parts)
                print(f"RUN: {qry}")
                recs = await connection.fetch(qry, *qry_args, timeout=10)

                columns = tuple(dict(recs[0]).keys())
                ret_recs = list()
                for record in recs:
                    ret_recs.append(tuple(record))

                return json.dumps({
                    "type": "call-result",
                    "id": call_id,
                    "columns": columns,
                    "data": ret_recs,
                })

            except asyncpg.PostgresError as exc:
                return json.dumps({
                    "type": "call-error",
                    "id": call_id,
                    "error": str(exc),
                    "error-cls": type(exc).__name__,
                })

        elif msg_type == 'trigger':
            # set up redirect for notification to a function call

            call_id = msg.get('id')
            # TODO notification -> func call setup
            raise NotImplementedError()

        else:
            raise Exception(f"unknown message type {msg_type!r}")

        raise Exception("reached unreachable place")
