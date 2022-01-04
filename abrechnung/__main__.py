import argparse
import asyncio
from pathlib import Path

from abrechnung.config import Config
from abrechnung.util import log_setup


def main():
    """
    main CLI entry point

    parses commands and jumps into the subprogram's entry point
    """
    cli = argparse.ArgumentParser()

    cli.add_argument(
        "-c",
        "--config-path",
        default="/etc/abrechnung/abrechnung.yaml",
        help="config file, default: %(default)s",
    )

    cli.add_argument(
        "-d", "--debug", action="store_true", help="enable asyncio debugging"
    )
    cli.add_argument(
        "-v", "--verbose", action="count", default=0, help="increase program verbosity"
    )
    cli.add_argument(
        "-q", "--quiet", action="count", default=0, help="decrease program verbosity"
    )

    subparsers = cli.add_subparsers()

    def add_subcommand(name, subcommand_class):
        subparser = subparsers.add_parser(name)
        subparser.set_defaults(subcommand_class=subcommand_class)
        subcommand_class.argparse_register(subparser)

    # add all the subcommands here
    from . import mailer

    add_subcommand("mailer", mailer.Mailer)

    from . import http

    add_subcommand("api", http.HTTPService)

    from . import database

    add_subcommand("db", database.CLI)

    from . import admin

    add_subcommand("admin", admin.Admin)

    args = vars(cli.parse_args())

    # set up log level
    log_setup(args["verbose"] - args["quiet"])

    # enable asyncio debugging
    # loop = asyncio.get_event_loop()
    # loop.set_debug(args["debug"])

    config_path = args.pop("config_path")
    config = Config.from_file(Path(config_path))

    try:
        subcommand_class = args.pop("subcommand_class")
    except KeyError:
        cli.error("no subcommand was given")
    subcommand_class.argparse_validate(args, cli.error)
    subcommand_object = subcommand_class(config=config, **args)
    asyncio.run(subcommand_object.run())


if __name__ == "__main__":
    main()
