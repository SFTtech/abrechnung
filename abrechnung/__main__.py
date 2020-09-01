import argparse
import asyncio

import yaml


def main():
    """
    main CLI entry point

    parses commands and jumps into the subprogram's entry point
    """
    cli = argparse.ArgumentParser()

    cli.add_argument('--config-path', default='/etc/abrechnung/abrechnung.yaml')

    subparsers = cli.add_subparsers()
    def add_subcommand(name, subcommand_class):
        subparser = subparsers.add_parser(name)
        subparser.set_defaults(subcommand_class=subcommand_class)
        subcommand_class.argparse_register(subparser)

    # add all the subcommands here
    from . import mailer
    add_subcommand('mailer', mailer.Mailer)

    args = vars(cli.parse_args())
    config_path = args.pop('config_path')
    with open(config_path) as config_file:
        config = yaml.load(config_file, Loader=yaml.BaseLoader)

    try:
        subcommand_class = args.pop('subcommand_class')
    except KeyError:
        cli.error('no subcommand was given')
    subcommand_class.argparse_validate(args, cli.error)
    subcommand_object = subcommand_class(config=config, **args)
    asyncio.get_event_loop().run_until_complete(subcommand_object.run())


if __name__ == '__main__':
    main()
