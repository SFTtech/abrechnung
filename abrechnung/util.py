import logging


# the vt100 CONTROL SEQUENCE INTRODUCER
CSI = '\N{ESCAPE}['


def SGR(code=""):
    """
    Returns a SELECT GRAPHIC RENDITION code sequence
    for the given code.
    See https://en.wikipedia.org/wiki/ANSI_escape_code
    """
    return f'{CSI}{code}m'

BOLD = SGR(1)
RED = SGR(31)
NORMAL = SGR()


def format_error(text):
    """
    Formats an error text for printing in a terminal
    """
    return f'\N{PILE OF POO} {RED}{BOLD}{text}{NORMAL}'


def log_setup(setting, default=1):
    """
    Perform setup for the logger.
    Run before any logging.log thingy is called.

    if setting is 0: the default is used, which is WARNING.
    else: setting + default is used.
    """

    levels = (logging.ERROR, logging.WARNING, logging.INFO,
              logging.DEBUG, logging.NOTSET)

    factor = clamp(default + setting, 0, len(levels) - 1)
    level = levels[factor]

    logging.basicConfig(level=level, format="[%(asctime)s] %(message)s")
    logging.captureWarnings(True)


def clamp(number, smallest, largest):
    """ return number but limit it to the inclusive given value range """
    return max(smallest, min(number, largest))
