from pathlib import Path

import asyncpg

from abrechnung.framework.database import (
    SchemaRevision,
    apply_revisions as framework_apply_revisions,
)

REVISION_TABLE = "schema_revision"
REVISION_PATH = Path(__file__).parent / "revisions"
DB_CODE_PATH = Path(__file__).parent / "code"
CURRENT_REVISION = ""


def list_revisions():
    revisions = SchemaRevision.revisions_from_dir(REVISION_PATH)
    for revision in revisions:
        print(
            f"Revision: {revision.version}, requires revision: {revision.requires}, filename: {revision.file_name}"
        )


async def check_revision_version(db_pool: asyncpg.Pool):
    curr_revision = await db_pool.fetchval(
        f"select version from {REVISION_TABLE} limit 1"
    )
    if curr_revision != CURRENT_REVISION:
        raise RuntimeError(
            f"Invalid database revision, expected {CURRENT_REVISION}, database is at revision {curr_revision}"
        )


async def reset_schema(db_pool: asyncpg.Pool):
    async with db_pool.acquire() as conn:
        async with conn.transaction():
            await conn.execute("drop schema public cascade")
            await conn.execute("create schema public")


async def apply_revisions(db_pool: asyncpg.Pool, until_revision: str | None = None):
    await framework_apply_revisions(
        db_pool=db_pool,
        revision_path=REVISION_PATH,
        code_path=DB_CODE_PATH,
        until_revision=until_revision,
    )
