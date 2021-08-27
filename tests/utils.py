import os

import asyncpg
from asyncpg.pool import Pool

from abrechnung.database import revisions


async def get_test_db() -> Pool:
    """
    get a connection pool to the test database
    """
    pool = await asyncpg.create_pool(
        user=os.environ.get("TEST_DB_USER", "abrechnung-test"),
        password=os.environ.get("TEST_DB_PASSWORD", "asdf1234"),
        database=os.environ.get("TEST_DB_DATABASE", "abrechnung-test"),
        host=os.environ.get("TEST_DB_HOST", "localhost"),
        port=int(os.environ.get("TEST_DB_PORT", 5432)),
    )

    await revisions.reset_schema(pool)
    await revisions.apply_revisions(pool)

    return pool
