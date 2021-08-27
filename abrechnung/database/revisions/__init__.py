import logging
from pathlib import Path

from asyncpg.pool import Pool


revision_dir = Path(__file__).parent
logger = logging.getLogger(__name__)


async def reset_schema(db_pool: Pool):
    async with db_pool.acquire() as conn:
        async with conn.transaction():
            await conn.execute("drop schema public cascade")
            await conn.execute("create schema public")


async def apply_revisions(db_pool: Pool):
    async with db_pool.acquire() as conn:
        async with conn.transaction():
            for revision in sorted(revision_dir.glob("*.sql")):
                logger.info(f"Applying revision {revision}")
                await conn.execute(revision.read_text("utf-8"))
