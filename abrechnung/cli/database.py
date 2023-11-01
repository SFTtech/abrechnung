import asyncio
from typing import Annotated, Optional

import typer

from abrechnung.config import Config
from abrechnung.database.migrations import apply_revisions, list_revisions as list_revisions_, reset_schema
from abrechnung.framework.database import create_db_pool, psql_attach

database_cli = typer.Typer()


@database_cli.command()
def attach(ctx: typer.Context):
    """Get a psql shell to the currently configured database."""
    asyncio.run(psql_attach(ctx.obj.config.database))


async def _migrate(cfg: Config, until_revision: Optional[str]):
    db_pool = await create_db_pool(cfg.database)
    try:
        await apply_revisions(db_pool=db_pool, until_revision=until_revision)
    finally:
        await db_pool.close()


@database_cli.command()
def migrate(
    ctx: typer.Context,
    until_revision: Annotated[Optional[str], typer.Option(help="Only apply revisions until this version")] = None,
):
    """Apply all database migrations."""
    asyncio.run(_migrate(cfg=ctx.obj.config, until_revision=until_revision))


async def _rebuild(cfg: Config):
    db_pool = await create_db_pool(cfg.database)
    try:
        await reset_schema(db_pool=db_pool)
        await apply_revisions(db_pool=db_pool)
    finally:
        await db_pool.close()


@database_cli.command()
def rebuild(ctx: typer.Context):
    """Wipe the database and apply all revisions."""
    asyncio.run(_rebuild(ctx.obj.config))


async def _reset(cfg: Config):
    db_pool = await create_db_pool(cfg.database)
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
def list_revisions():
    """List all available database revisions."""
    list_revisions_()
