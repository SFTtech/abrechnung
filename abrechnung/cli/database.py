import asyncio
from typing import Annotated, Optional

import typer

from abrechnung.config import Config
from abrechnung.database.migrations import get_database, reset_schema
from abrechnung.database.migrations import list_revisions as list_revisions_

database_cli = typer.Typer()


@database_cli.command()
def attach(ctx: typer.Context):
    """Get a psql shell to the currently configured database."""
    db = get_database(config=ctx.obj.config.database)
    asyncio.run(db.attach())


# Functions created by PostgreSQL extensions that should not be dropped during migrations
EXTENSION_FUNCTION_SKIPLIST = [
    "set_user",
    "reset_user",
]


@database_cli.command()
def migrate(
    ctx: typer.Context,
    until_revision: Annotated[Optional[str], typer.Option(help="Only apply revisions until this version")] = None,
):
    """Apply all database migrations."""
    db = get_database(config=ctx.obj.config.database)
    asyncio.run(
        db.apply_migrations(
            until_migration=until_revision,
            function_blacklist=EXTENSION_FUNCTION_SKIPLIST,
        )
    )


async def _rebuild(cfg: Config):
    db = get_database(cfg.database)
    db_pool = await db.create_pool(n_connections=2)
    try:
        await reset_schema(db_pool=db_pool)
        await db.apply_migrations(function_blacklist=EXTENSION_FUNCTION_SKIPLIST)
    finally:
        await db_pool.close()


@database_cli.command()
def rebuild(ctx: typer.Context):
    """Wipe the database and apply all revisions."""
    asyncio.run(_rebuild(ctx.obj.config))


async def _reset(cfg: Config):
    db = get_database(cfg.database)
    db_pool = await db.create_pool()
    try:
        await reset_schema(db_pool=db_pool)
    finally:
        await db_pool.close()


@database_cli.command()
def reset(
    ctx: typer.Context,
):
    """Wipe the database."""
    asyncio.run(_reset(ctx.obj.config))


@database_cli.command()
def list_revisions(
    ctx: typer.Context,
):
    """List all available database revisions."""
    db = get_database(ctx.obj.config.database)
    list_revisions_(db)


@database_cli.command()
def reload_code(ctx: typer.Context):
    """Reload all database code (functions, views, triggers)."""
    db = get_database(ctx.obj.config.database)
    asyncio.run(db.reload_code(function_blacklist=EXTENSION_FUNCTION_SKIPLIST))
