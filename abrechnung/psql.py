"""
PSQL command.

Runs the 'psql' tool with the appropriate parameters.
"""

import os
import shlex
import signal
import subprocess
import tempfile
import termios

from . import subcommand


class PSQL(subcommand.SubCommand):
    def __init__(self, config, **args):
        self.config = config
        self.action = args['action']

    @staticmethod
    def argparse_register(subparser):
        subparser.add_argument('action', choices=['rebuild', 'load-funcs', 'attach'], nargs='?')

    async def run(self):
        """
        CLI entry point
        """
        project_folder = os.path.dirname(os.path.dirname(__file__))
        db_folder = os.path.join(project_folder, 'db')

        def escape_colon(str):
            return str.replace('\\', '\\\\').replace(':', '\\:')

        with tempfile.NamedTemporaryFile('w') as passfile:
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

            env = dict(os.environ)
            env['PGHOST'] = self.config['database']['host']
            env['PGDATABASE'] = self.config['database']['dbname']
            env['PGUSER'] = self.config['database']['user']
            env['PGPASSFILE'] = passfile.name

            command = ['psql']
            sqlfile = {'rebuild': 'rebuild.sql', 'load-funcs': 'funcs.sql'}.get(self.action)
            if sqlfile is not None:
                command.append('-f')
                command.append(sqlfile)

            child = subprocess.Popen(command, env=env, cwd=db_folder)
            while True:
                try:
                    raise SystemExit(child.wait())
                except KeyboardInterrupt:
                    continue
