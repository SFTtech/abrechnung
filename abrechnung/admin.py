import argparse
import logging

from abrechnung import subcommand
from abrechnung.config import Config


class Admin(subcommand.SubCommand):
    def __init__(self, config: Config, **args):  # pylint: disable=super-init-not-called
        self.config = config
        self.logger = logging.getLogger(__name__)

        self.command = args.pop("command")
        self.args = args

    @staticmethod
    def argparse_register(subparser: argparse.ArgumentParser):
        subparsers = subparser.add_subparsers(required=True)

        create_user_parser = subparsers.add_parser("create-user")
        create_user_parser.set_defaults(command="create_user")
        create_user_parser.add_argument("-n", "--name", type=str, required=True)
        create_user_parser.add_argument("-e", "--email", type=str, required=True)

        disable_user_parser = subparsers.add_parser("disable-user")
        create_user_parser.set_defaults(command="disable_user")
        disable_user_parser.add_argument("-n", "--name", type=str, required=True)

    async def handle_create_user_command(self):
        self.logger.info(
            f"Creating user with email: {self.args['email']} and username: {self.args['name']}"
        )

    async def handle_disable_user_command(self):
        self.logger.info(f"Disabling user {self.args['name']}")

    async def run(self):
        if self.command == "create_user":
            return await self.handle_create_user_command()

        if self.command == "disable_user":
            return await self.handle_create_user_command()
