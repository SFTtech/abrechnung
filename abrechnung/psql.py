"""
PSQL command.

Runs the 'psql' tool with the appropriate parameters.
"""

import contextlib
import os
import shlex
import shutil
import signal
import sys
import tempfile
import termios

from . import subcommand
from . import util


class PSQL(subcommand.SubCommand):
    def __init__(self, config, **args):
        self.config = config
        self.action = args['action']

    @staticmethod
    def argparse_register(subparser):
        subparser.add_argument(
            'action',
            choices=['rebuild', 'load-funcs', 'attach'],
            nargs='?'
        )

    async def run(self):
        """
        CLI entry point
        """
        project_folder = os.path.dirname(os.path.dirname(__file__))
        db_folder = os.path.join(project_folder, 'db')

        with contextlib.ExitStack() as exitstack:
            env = dict(os.environ)
            env['PGDATABASE'] = self.config['database']['dbname']

            if self.config['database']['user'] is None:
                if self.config['database']['host'] is not None:
                    raise ValueError("database user is None, but host is set")
                if self.config['database']['password'] is not None:
                    raise ValueError("database user is None, "
                                     "but password is set")
            else:
                def escape_colon(str):
                    return str.replace('\\', '\\\\').replace(':', '\\:')

                passfile = exitstack.enter_context(tempfile.NamedTemporaryFile('w'))
                os.chmod(passfile.name, 0o600)

                passfile.write(':'.join([
                    escape_colon(self.config['database']['host']),
                    '*',
                    escape_colon(self.config['database']['dbname']),
                    escape_colon(self.config['database']['user']),
                    escape_colon(self.config['database']['password'])
                ]))
                passfile.write('\n')
                passfile.flush()

                env['PGHOST'] = self.config['database']['host']
                env['PGUSER'] = self.config['database']['user']
                env['PGPASSFILE'] = passfile.name

            command = ['psql', '--variable', 'ON_ERROR_STOP=1']
            if self.action == 'rebuild':
                command.extend(['--file', 'rebuild.sql'])
            elif self.action == 'load-funcs':
                command.extend(['--file', 'funcs.sql'])
            elif self.action == 'attach':
                if shutil.which('pgcli') is not None:
                    # if pgcli is installed, use that instead!
                    command = ['pgcli']
            else:
                raise Exception(f'unknown action {self.action}')

            ret = await util.run_as_fg_process(command, env=env, cwd=db_folder)

            if ret != 0:
                print(util.format_error('psql failed'))
            return ret
