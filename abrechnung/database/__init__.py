import contextlib
import os
import shutil
import tempfile
import logging

import asyncpg
from asyncpg.pool import Pool

from abrechnung import subcommand
from abrechnung import util
from abrechnung.config import Config
from . import revisions

logger = logging.getLogger(__name__)


async def db_connect(db: dict) -> Pool:

    # username: str, password: str, database: str, host: str, port: int = 5432
    """
    get a connection pool to the database
    """

    pool_args = dict()
    pool_args["user"] = db["user"]
    pool_args["password"] = db["password"]
    pool_args["host"] = db["host"]
    pool_args["port"] = db["port"]
    pool_args["database"] = db["dbname"]
    pool_args["max_size"] = 100

    # since marshmallow can't model a "one arg implies all"-relation, we need to warn here
    if not db["host"] or os.path.isdir(db["host"]):
        if db["user"] or db["password"]:
            logger.warning(
                "Username and/or password specified but no remote host therefore using socket "
                "authentication. I am ignoring these settings since we don't need them."
            )
            del pool_args["user"]
            del pool_args["password"]
        if os.getenv("PGHOST") or os.getenv("PGPORT"):
            # asyncpg can read the PGHOST env variable. We don't want that.
            logger.warning(
                "We do not support setting the PGHOST or PGPORT environment variable and therefore will "
                "ignore it. Consider specifying the hostname in the config file."
            )

        if os.environ.get("PGHOST"):
            del os.environ["PGHOST"]
        if os.environ.get("PGPORT"):
            del os.environ["PGPORT"]

    return await asyncpg.create_pool(**pool_args)


class CLI(subcommand.SubCommand):
    """
    PSQL command.

    Runs the 'psql' tool with the appropriate parameters.
    """

    def __init__(self, config: Config, **args):
        self.config = config
        self.action = args["action"]

    @staticmethod
    def argparse_register(subparser):
        subparser.add_argument(
            "action", choices=["migrate", "attach", "rebuild", "clean"], nargs="?"
        )

    async def _clean(self, db_pool: Pool):
        """Do some garbage collection in the database"""
        async with db_pool.acquire() as conn:
            async with conn.transaction():
                # delete all dangling file contents
                # TODO: make this more future proof by using some kind of introspection to find all non-referenced
                # entries in the table and delete them
                await conn.execute(
                    "delete from blob where id not in ("
                    "   select fh.blob_id from file_history fh where fh.blob_id is not null"
                    ")"
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

            cwd = os.path.join(os.path.dirname(__file__), "revisions")
            ret = await util.run_as_fg_process(command, env=env, cwd=cwd)

            if ret != 0:
                print(util.format_error("psql failed"))
            return ret

    async def run(self):
        """
        CLI entry point
        """
        if self.action == "attach":
            return await self._attach()

        db_pool = await db_connect(self.config["database"])
        if self.action == "migrate":
            await revisions.apply_revisions(db_pool=db_pool)
        elif self.action == "rebuild":
            await revisions.reset_schema(db_pool=db_pool)
            await revisions.apply_revisions(db_pool=db_pool)
        elif self.action == "clean":
            await self._clean(db_pool=db_pool)

        await db_pool.close()
