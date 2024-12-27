import logging
import re
import uuid
from datetime import datetime, timedelta, timezone

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
        tzdelta = timedelta(hours=int(m.group("tzhours")), minutes=int(m.group("tzminutes")))
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


def is_valid_uuid(val: str):
    try:
        uuid.UUID(val)
        return True
    except ValueError:
        return False
