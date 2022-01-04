import argparse
import logging
from getpass import getpass

from abrechnung import subcommand
from abrechnung.application.users import UserService
from abrechnung.config import Config
from abrechnung.database import db_connect


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
        create_user_parser.add_argument("--skip-email-check", action="store_true")

    async def handle_create_user_command(self):
        self.logger.info(
            f"Creating user with email: {self.args['email']} and username: {self.args['name']}"
        )
        password = getpass(prompt="Input initial password for user:")
        repeat_password = getpass(prompt="Repeat password:")
        if password != repeat_password:
            print("Passwords do not match!")
            return

        db_pool = await db_connect(
            username=self.config["database"]["user"],
            database=self.config["database"]["dbname"],
            host=self.config["database"]["host"],
            password=self.config["database"]["password"],
        )
        user_service = UserService(db_pool, self.config)
        user_service.enable_registration = True
        if self.args["skip_email_check"]:
            user_service.valid_email_domains = None
        await user_service.register_user(
            username=self.args["name"], email=self.args["email"], password=password
        )

    async def run(self):
        if self.command == "create_user":
            return await self.handle_create_user_command()
