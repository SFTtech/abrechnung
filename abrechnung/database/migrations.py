from pathlib import Path

import asyncpg
from sftkit.database import Database, DatabaseConfig

MIGRATION_PATH = Path(__file__).parent / "revisions"
DB_CODE_PATH = Path(__file__).parent / "code"
CURRENT_REVISION = "b16c7901"


def get_database(config: DatabaseConfig) -> Database:
    return Database(
        config=config,
        migrations_dir=MIGRATION_PATH,
        code_dir=DB_CODE_PATH,
    )


def list_revisions(db: Database):
    revisions = db.list_migrations()
    for revision in revisions:
        print(f"Revision: {revision.version}, requires revision: {revision.requires}, filename: {revision.file_name}")


async def check_revision_version(db: Database):
    revision = await db.get_current_migration_version()
    if revision != CURRENT_REVISION:
        raise RuntimeError(
            f"Invalid database revision, expected {CURRENT_REVISION}, database is at revision {revision}"
        )


async def reset_schema(db_pool: asyncpg.Pool):
    async with db_pool.acquire() as conn:
        async with conn.transaction(isolation="serializable"):
            await conn.execute("drop schema public cascade")
            await conn.execute("create schema public")
