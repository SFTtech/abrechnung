from pathlib import Path

from asyncpg.pool import Pool


revision_dir = Path(__file__).parent


async def reset_schema(db_pool: Pool):
    async with db_pool.acquire() as conn:
        conn.execute("drop schema public cascade")
        conn.execute("create schema public")


async def apply_revisions(db_pool: Pool):
    async with db_pool.acquire() as conn:
        for revision in revision_dir.glob("*.sql"):
            conn.execute(revision.read_text("utf-8"))
