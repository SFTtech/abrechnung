import logging
import os
from typing import Union

import asyncpg
from asyncpg import Connection
from asyncpg.pool import Pool

from abrechnung.config import Config

logger = logging.getLogger(__name__)


def _make_connection_args(config: Config) -> dict:
    args: dict[str, Union[int, str, None]] = dict()
    args["user"] = config.database.user
    args["password"] = config.database.password
    args["host"] = config.database.host
    args["port"] = config.database.port
    args["database"] = config.database.dbname

    # since marshmallow can't model a "one arg implies all"-relation, we need to warn here
    if not config.database.host or os.path.isdir(config.database.host):
        if config.database.user or config.database.password:
            logger.warning(
                "Username and/or password specified but no remote host therefore using socket "
                "authentication. I am ignoring these settings since we don't need them."
            )
            del args["user"]
            del args["password"]
        if os.getenv("PGHOST") or os.getenv("PGPORT"):
            # asyncpg can read the PGHOST env variable. We don't want that.
            logger.warning(
                "We do not support setting the PGHOST or PGPORT environment variable and therefore will "
                "ignore it. Consider specifying the hostname in the config file."
            )

        if os.environ.get("PGHOST"):
            del os.environ["PGHOST"]
        if os.environ.get("PGPORT"):
            del os.environ["PGPORT"]
    return args


async def create_db_pool(config: Config) -> Pool:
    # username: str, password: str, database: str, host: str, port: int = 5432
    """
    get a connection pool to the database
    """
    pool_args = _make_connection_args(config)
    pool_args["max_size"] = 100
    return await asyncpg.create_pool(**pool_args)


async def create_db_connection(config: Config) -> Connection:
    connection_args = _make_connection_args(config)
    return await asyncpg.connect(**connection_args)
