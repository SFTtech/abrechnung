"""
DBTest command
"""

import asyncio
import json
import re
import subprocess
import sys
import time
import traceback

import asyncpg

from .. import subcommand
from .. import psql as psql_command


class DBTest(subcommand.SubCommand):
    def __init__(self, config, **args):
        self.config = config
        self.psql = None
        self.done = False
        self.prepare_action = args['prepare_action']

        self.notifications = asyncio.Queue()

    @staticmethod
    def argparse_register(subparser):
        subparser.add_argument('--confirm-destructive-test', action='store_true')
        subparser.add_argument('--prepare-action',
                               help='run the given psql action before running the tests')

    @staticmethod
    def argparse_validate(args, error_cb):
        if not args.pop('confirm_destructive_test'):
            error_cb('dbtest will drop all data from your database. '
                     'invoke it with --confirm-destructive-test '
                     'if you understand this')

    async def run(self):
        """
        CLI entry point
        """
        if self.prepare_action:
            print(f'prepare action: \x1b[1mpsql {self.prepare_action}\x1b[m')
            try:
                await psql_command.PSQL(self.config, action=self.prepare_action).run()
            except SystemExit as exc:
                if exc.args[0] != 0:
                    print(f'action failed; aborting tests')
                    raise

        self.psql = await asyncpg.connect(
            user=self.config['database']['user'],
            password=self.config['database']['password'],
            host=self.config['database']['host'],
            database=self.config['database']['dbname']
        )

        self.psql.add_termination_listener(self.terminate_callback)
        self.psql.add_log_listener(self.log_callback)

        from . import websocket_connections
        print(f'\x1b[1mwebsocket_connections.test\x1b[m')
        await websocket_connections.test(self)
        from . import user_accounts
        print(f'\x1b[1muser_accounts.test\x1b[m')
        await user_accounts.test(self)
        from . import groups
        print(f'\x1b[1mgroups.test\x1b[m')
        await groups.test(self)

        print(f'\x1b[1mtests done\x1b[m')
        self.done = True

    async def fetch(self, query, *args, columns=None, rowcount=None):
        """
        runs the given query, with the given args.
        if columns is [None], ensures that the result has exactly one column.
        if columns is a list of strings, ensures that the result has exactly these columns.
        if rowcount is not None, ensures that the result has exactly this many rows.
        """
        try:
            result = await self.psql.fetch(query, *args, timeout=10)
        except Exception as exc:
            self.error(f"query failed:\n{query!r}\n{exc!r}")
            raise

        if result and columns is not None:
            keys = list(result[0].keys())
            if columns == [None]:
                if len(result[0]) != 1:
                    self.error(f"expected a single column, but got {keys!r}")
            elif columns != keys:
                self.error(f"expected column(s) {columns!r}, but got {keys!r}")

        if rowcount not in (None, len(result)):
            self.error(f"expected a single row, but got {len(result)} rows")

        return result

    async def fetch_expect_error(self, query, *args, error=Exception, error_re=None):
        """
        runs the given query, with the given args.
        expects that the query will fail with a certain error.
        """
        try:
            result = await self.psql.fetch(query, *args, timeout=10)
        except error as exc:
            if error_re is not None:
                if re.search(error_re, str(exc)) is None:
                    self.error(
                        f'expected {query=!r}\n'
                        f'to fail with {error!r} matching {error_re!r}\n'
                        f'but it failed with {type(exc)!s}\n'
                        f'{exc!s}'
                    )
        except BaseException as exc:
            self.error(
                f'expected {query=!r}\n'
                f'to fail with {error!r}\n'
                f'but it failed with {type(exc)!s}\n'
                f'{exc!s}'
            )
        else:
            self.error(f"expected {query=!r}\nto fail, but it returned\n{result!r}")

    async def fetch_expect_raise(self, query, *args, error_id=None):
        """
        runs the given query, with the given args.
        expects that the query will raise an exception with
        an error description that matches the given error id (up to the first ':')
        """
        await self.fetch_expect_error(
            query,
            *args,
            error=asyncpg.exceptions.RaiseError,
            error_re=f'^{error_id}:'
        )

    async def fetchrow(self, query, *args, columns=None):
        """
        runs fetch and extracts the single row,
        checking columns.
        """
        rows = await self.fetch(query, *args, columns=columns, rowcount=1)
        return rows[0]

    async def fetchvals(self, query, *args, column=None, rowcount=None):
        """
        runs fetch and extracts the values of a single column as a list,
        checking the column name.
        """
        rows = await self.fetch(query, *args, columns=[column], rowcount=rowcount)
        return [row[0] for row in rows]

    async def fetchval(self, query, *args, column=None, **kwargs):
        """
        runs fetchrow and extracts the single value

        kwargs can be used to add expect_eq, expect_neq and expect_gt checks.
        """
        val = (await self.fetchrow(query, *args, columns=[column]))[0]

        if 'expect_eq' in kwargs:
            self.expect_eq(val, kwargs['expect_eq'], tolerance=kwargs.get('tolerance', None))
        elif 'expect_neq' in kwargs:
            self.expect_neq(val, kwargs['expect_neq'])
        elif 'expect_gt' in kwargs:
            self.expect_gt(val, kwargs['expect_gt'])

        return val

    async def listen(self, channel_name):
        """
        subscribes to a notification channel;
        the notifications will be put into self.notifications
        """
        await self.psql.add_listener(channel_name, self.notification_callback)

    async def unlisten(self, channel_name):
        """
        unsubscribes form a notification channel
        """
        await self.psql.remove_listener(channel_name, self.notification_callback)

    def notification_callback(self, connection, pid, channel, payload):
        """ runs whenever we get a psql notification """
        self.expect_is(connection, self.psql)
        del pid  # unused
        payload_json = json.loads(payload)
        print(f'notification on {channel!r}: {payload_json!r}')
        self.notifications.put_nowait((channel, json.loads(payload), time.time()))

    async def get_notification(self, ensure_single=True):
        """
        returns the current next notification

        if ensure_single, ensures that there are no further notifications
        in the queue.
        """
        try:
            notification = await asyncio.wait_for(self.notifications.get(), timeout=0.1)
        except asyncio.exceptions.TimeoutError:
            self.error('expected a notification but did not receive it')
        if ensure_single:
            await asyncio.sleep(0.05)
            extra_notifications = []
            while self.notifications.qsize() > 0:
                extra_notifications.append(self.notifications.get_nowait())
            if extra_notifications:
                self.error(
                    f'expected only one notification, but got:\n{notification!r}\n' +
                    '\n'.join(repr(x) for x in extra_notifications)
                )
        return notification

    def terminate_callback(self, connection):
        """ runs when the psql connection is closed """
        self.expect_is(connection, self.psql)
        if not self.done:
            self.error('psql connection closed unexpectedly')

    async def log_callback(self, connection, message):
        """ runs when psql sends a log message """
        self.expect_is(connection, self.psql)
        print(f'psql log message: {message}')

    def error(self, error_message):
        """
        Call this to indicate an error during testing.
        """
        print(f'\x1b[31;1mtest error\x1b[m {error_message}')
        raise RuntimeError(error_message) from None

    def expect_is(self, actual, expected):
        """
        Tests that actual is expected, calls self.error if not, and returns actual.
        """
        if not (actual is expected):
            self.error(f"expected {expected!r}, but got {actual!r}")
        return actual

    def expect_eq(self, actual, expected, tolerance=None):
        """
        Tests that actual == expected, calls self.error if not, and returns actual.

        if tolerance is not None, values of actual within the given tolerance
        of expected are accepted as well.
        """
        if tolerance is not None:
            return self.expect_in_interval(actual, expected - tolerance, expected + tolerance)

        if not (actual == expected):
            self.error(f"expected {expected!r}, but got {actual!r}")
        return actual

    def expect_neq(self, actual, expected):
        """
        Tests that actual != expected, calls self.error if not, and returns actual.
        """
        if not (actual != expected):
            self.error(f"expected something different from {expected!r}, but got the same")
        return actual

    def expect_in_interval(self, actual, interval_start, interval_end):
        """
        Tests that interval_start <= actual <= interval_end,
        calls self.error if not, and returns actual.
        """
        if not (interval_start <= actual <= interval_end):
            self.error(f"expected value with {interval_start!r} <= value <= {interval_end!r}, but got {actual!r}")
        return actual

    def expect_gt(self, actual, expected):
        """
        Tests that actual > expected,
        calls self.error if not, and returns actual.
        """
        if not (actual > expected):
            self.error(f"expected value greater than {expected!r}, but got {actual!r}")
        return actual
