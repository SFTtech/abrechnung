import asyncio
import logging
import os
import re
import signal
import sys
import termios

# the vt100 CONTROL SEQUENCE INTRODUCER
from datetime import datetime, timedelta, timezone

CSI = "\N{ESCAPE}["


def SGR(code=""):
    """
    Returns a SELECT GRAPHIC RENDITION code sequence
    for the given code.
    See https://en.wikipedia.org/wiki/ANSI_escape_code
    """
    return f"{CSI}{code}m"


BOLD = SGR(1)
RED = SGR(31)
NORMAL = SGR()

postgres_timestamp_format = re.compile(
    r"(?P<year>\d{4})-(?P<month>\d{2})-(?P<day>\d{2})T(?P<hour>\d{2}):(?P<minute>\d{2}):(?P<second>\d{2})"
    r"(\.(?P<subseconds>\d+))?(?P<tzsign>[-+])(?P<tzhours>\d{2}):(?P<tzminutes>\d{2})"
)


def parse_postgres_datetime(dt: str) -> datetime:
    if m := postgres_timestamp_format.match(dt):
        subseconds = m.group("subseconds")
        micros = 0
        if len(subseconds) > 3:
            millis = int(subseconds[:3])
            micros = int(subseconds[3:].ljust(3, "0"))
        else:
            millis = int(subseconds.ljust(3, "0"))

        tzsign = -1 if m.group("tzsign") == "-" else 1
        tzdelta = timedelta(
            hours=int(m.group("tzhours")), minutes=int(m.group("tzminutes"))
        )
        tz = timezone(tzsign * tzdelta)

        return datetime(
            year=int(m.group("year")),
            month=int(m.group("month")),
            day=int(m.group("day")),
            hour=int(m.group("hour")),
            minute=int(m.group("minute")),
            second=int(m.group("second")),
            microsecond=millis * 1000 + micros,
            tzinfo=tz,
        )

    raise ValueError("invalid format")


def format_error(text):
    """
    Formats an error text for printing in a terminal
    """
    return f"\N{PILE OF POO} {RED}{BOLD}{text}{NORMAL}"


def log_setup(setting, default=1):
    """
    Perform setup for the logger.
    Run before any logging.log thingy is called.

    if setting is 0: the default is used, which is WARNING.
    else: setting + default is used.
    """

    levels = (
        logging.ERROR,
        logging.WARNING,
        logging.INFO,
        logging.DEBUG,
        logging.NOTSET,
    )

    factor = clamp(default + setting, 0, len(levels) - 1)
    level = levels[factor]

    logging.basicConfig(level=level, format="[%(asctime)s] %(message)s")
    logging.captureWarnings(True)


def clamp(number, smallest, largest):
    """return number but limit it to the inclusive given value range"""
    return max(smallest, min(number, largest))


async def run_as_fg_process(args, **kwargs):
    """
    the "correct" way of spawning a new subprocess:
    signals like C-c must only go
    to the child process, and not to this python.

    the args are the same as subprocess.Popen

    returns Popen().wait() value

    Some side-info about "how ctrl-c works":
    https://unix.stackexchange.com/a/149756/1321

    fun fact: this function took a whole night
              to be figured out.
    """

    old_pgrp = os.tcgetpgrp(sys.stdin.fileno())
    old_attr = termios.tcgetattr(sys.stdin.fileno())

    user_preexec_fn = kwargs.pop("preexec_fn", None)

    def new_pgid():
        if user_preexec_fn:
            user_preexec_fn()

        # set a new process group id
        os.setpgid(os.getpid(), os.getpid())

        # generally, the child process should stop itself
        # before exec so the parent can set its new pgid.
        # (setting pgid has to be done before the child execs).
        # however, Python 'guarantee' that `preexec_fn`
        # is run before `Popen` returns.
        # this is because `Popen` waits for the closure of
        # the error relay pipe '`errpipe_write`',
        # which happens at child's exec.
        # this is also the reason the child can't stop itself
        # in Python's `Popen`, since the `Popen` call would never
        # terminate then.
        # `os.kill(os.getpid(), signal.SIGSTOP)`

    try:
        # fork the child
        child = await asyncio.create_subprocess_exec(
            *args, preexec_fn=new_pgid, **kwargs
        )

        # we can't set the process group id from the parent since the child
        # will already have exec'd. and we can't SIGSTOP it before exec,
        # see above.
        # `os.setpgid(child.pid, child.pid)`

        # set the child's process group as new foreground
        os.tcsetpgrp(sys.stdin.fileno(), child.pid)
        # revive the child,
        # because it may have been stopped due to SIGTTOU or
        # SIGTTIN when it tried using stdout/stdin
        # after setpgid was called, and before we made it
        # forward process by tcsetpgrp.
        os.kill(child.pid, signal.SIGCONT)

        # wait for the child to terminate
        ret = await child.wait()

    finally:
        # we have to mask SIGTTOU because tcsetpgrp
        # raises SIGTTOU to all current background
        # process group members (i.e. us) when switching tty's pgrp
        # it we didn't do that, we'd get SIGSTOP'd
        hdlr = signal.signal(signal.SIGTTOU, signal.SIG_IGN)
        # make us tty's foreground again
        os.tcsetpgrp(sys.stdin.fileno(), old_pgrp)
        # now restore the handler
        signal.signal(signal.SIGTTOU, hdlr)
        # restore terminal attributes
        termios.tcsetattr(sys.stdin.fileno(), termios.TCSADRAIN, old_attr)

    return ret
