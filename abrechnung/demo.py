import argparse
import logging
from datetime import datetime

from abrechnung import subcommand
from abrechnung.config import Config
from abrechnung.database import db_connect


class Demo(subcommand.SubCommand):
    def __init__(self, config: Config, **args):  # pylint: disable=super-init-not-called
        self.config = config
        self.logger = logging.getLogger(__name__)

        self.command = args.pop("command")
        self.args = args

    @staticmethod
    def argparse_register(subparser: argparse.ArgumentParser):
        subparsers = subparser.add_subparsers(required=True)

        create_user_parser = subparsers.add_parser("cleanup")
        create_user_parser.set_defaults(command="cleanup")

    async def handle_cleanup_command(self):
        if not self.config["demo"]["enabled"]:
            self.logger.error("This instance is not running in demo mode, exiting")
            return

        deletion_threshold = datetime.now() - self.config["demo"]["wipe_interval"]

        db_pool = await db_connect(self.config["database"])
        async with db_pool.acquire() as conn:
            async with conn.transaction():
                n_rows_groups = await conn.fetchval(
                    "delete from grp where id in ( "
                    "   select g.id from grp g "
                    "   join group_membership gm on gm.group_id = grp.id "
                    "   join usr on usr.id = gm.user_id "
                    "   where registered_at <= $1"
                    ") returning *",
                    deletion_threshold,
                )

                n_rows_users = await conn.fetchval(
                    "delete from usr where registered_at <= $1 returning *",
                    deletion_threshold,
                )

                n_deleted = (n_rows_groups or 0) + (n_rows_users or 0)
                self.logger.info(
                    f"Deleted demo users and groups, a total of {n_deleted} database rows"
                )

    async def run(self):
        if self.command == "cleanup":
            return await self.handle_cleanup_command()
