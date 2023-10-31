import logging

from asyncpg.pool import Pool

from abrechnung import subcommand
from abrechnung.config import Config
from abrechnung.framework.database import create_db_pool, psql_attach
from .migrations import reset_schema, apply_revisions

logger = logging.getLogger(__name__)


class DatabaseCli(subcommand.SubCommand):
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

    async def run(self):
        """
        CLI entry point
        """
        if self.action == "attach":
            return await psql_attach(self.config.database)

        db_pool = await create_db_pool(self.config.database)
        if self.action == "migrate":
            await apply_revisions(db_pool=db_pool)
        elif self.action == "rebuild":
            await reset_schema(db_pool=db_pool)
            await apply_revisions(db_pool=db_pool)
        elif self.action == "clean":
            await self._clean(db_pool=db_pool)

        await db_pool.close()
