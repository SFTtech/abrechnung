"""
Provides the SubCommand abstract base class
"""
import abc

from abrechnung.config import Config


class SubCommand(abc.ABC):
    """
    Abstract base class for subcommands.

    The constructor receives the config dictionary as an argument,
    plus all arguments that were added by argparse_register() as keyword
    arguments.
    """

    @staticmethod
    def argparse_register(subparser):
        """
        Implement this method to add your own argparse arguments
        to this subparser.

        No arguments are added by default
        """
        del subparser  # unused

    @staticmethod
    def argparse_validate(args, error_cb):
        """
        Implement this method to add your own custom validation
        of arguparse arguments.

        This will be called immediately after the arguments have been parsed;
        calling error_cb with a str argument causes argparse to exit with that
        error message.

        No checking is performed by default
        """
        del args, error_cb  # unused

    @abc.abstractmethod
    def __init__(self, config: Config, **kwargs):
        pass

    @abc.abstractmethod
    async def run(self):
        """
        This is the entry point that will be called after the program has been
        initialized.
        """
