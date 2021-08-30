import contextlib
import os
import shutil
import tempfile

import asyncpg
from asyncpg.pool import Pool

from abrechnung import subcommand
from abrechnung import util

from . import revisions


async def db_connect(
    username: str, password: str, database: str, host: str, port: int = 5432
) -> Pool:
    """
    get a connection pool to the database
    """
    return await asyncpg.create_pool(
        user=username,
        password=password,
        database=database,
        host=host,
        port=port,
        max_size=100
    )


class CLI(subcommand.SubCommand):
    """
    PSQL command.

    Runs the 'psql' tool with the appropriate parameters.
    """

    def __init__(self, config: dict, **args):
        self.config = config
        self.action = args["action"]
        self.revision_dir = os.path.join(os.path.dirname(__file__), "revisions")

    @staticmethod
    def argparse_register(subparser):
        subparser.add_argument(
            "action", choices=["migrate", "attach", "rebuild"], nargs="?"
        )

    async def _attach(self):
        with contextlib.ExitStack() as exitstack:
            env = dict(os.environ)
            env["PGDATABASE"] = self.config["database"]["dbname"]

            if self.config["database"]["user"] is None:
                if self.config["database"]["host"] is not None:
                    raise ValueError("database user is None, but host is set")
                if self.config["database"]["password"] is not None:
                    raise ValueError("database user is None, " "but password is set")
            else:

                def escape_colon(str):
                    return str.replace("\\", "\\\\").replace(":", "\\:")

                passfile = exitstack.enter_context(tempfile.NamedTemporaryFile("w"))
                os.chmod(passfile.name, 0o600)

                passfile.write(
                    ":".join(
                        [
                            escape_colon(self.config["database"]["host"]),
                            "*",
                            escape_colon(self.config["database"]["dbname"]),
                            escape_colon(self.config["database"]["user"]),
                            escape_colon(self.config["database"]["password"]),
                        ]
                    )
                )
                passfile.write("\n")
                passfile.flush()

                env["PGHOST"] = self.config["database"]["host"]
                env["PGUSER"] = self.config["database"]["user"]
                env["PGPASSFILE"] = passfile.name

            command = ["psql", "--variable", "ON_ERROR_STOP=1"]
            if shutil.which("pgcli") is not None:
                # if pgcli is installed, use that instead!
                command = ["pgcli"]

            ret = await util.run_as_fg_process(command, env=env, cwd=self.revision_dir)

            if ret != 0:
                print(util.format_error("psql failed"))
            return ret

    async def run(self):
        """
        CLI entry point
        """
        if self.action == "migrate":
            db_pool = await db_connect(
                username=self.config["database"]["user"],
                database=self.config["database"]["dbname"],
                host=self.config["database"]["host"],
                password=self.config["database"]["password"],
            )
            await revisions.apply_revisions(db_pool=db_pool)
        elif self.action == "rebuild":
            db_pool = await db_connect(
                username=self.config["database"]["user"],
                database=self.config["database"]["dbname"],
                host=self.config["database"]["host"],
                password=self.config["database"]["password"],
            )
            await revisions.reset_schema(db_pool=db_pool)
            await revisions.apply_revisions(db_pool=db_pool)
        elif self.action == "attach":
            await self._attach()
