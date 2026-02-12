import asyncio
from pathlib import Path
from types import SimpleNamespace
from typing import Annotated

import typer

from abrechnung.config import read_config
from abrechnung.http.api import Api, print_openapi
from abrechnung.mailer import Mailer
from abrechnung.util import log_setup

from .admin import admin_cli
from .database import database_cli
from .demo import demo_cli

cli = typer.Typer()


@cli.callback()
def get_config(
    ctx: typer.Context,
    config_path: Annotated[Path, typer.Option("--config-path", "-c")] = Path("/etc/abrechnung/abrechnung.yaml"),
    quiet: Annotated[
        int,
        typer.Option("--quiet", "-q", count=True, help="decrease program verbosity"),
    ] = 0,
    verbose: Annotated[
        int,
        typer.Option("--verbose", "-v", count=True, help="increase program verbosity"),
    ] = 0,
    debug: Annotated[bool, typer.Option(help="enable asyncio debugging")] = False,
):
    log_setup(verbose - quiet)

    async def helper():
        asyncio.get_event_loop().set_debug(debug)

    asyncio.run(helper())

    if not config_path.exists():
        print(f"Config file does not exist: {config_path}")
        raise typer.Exit(1)

    config = read_config(config_path)
    ctx.obj = SimpleNamespace(config=config, config_path=config_path)


@cli.command()
def mailer(ctx: typer.Context):
    m = Mailer(config=ctx.obj.config)
    asyncio.run(m.run())


@cli.command()
def api(ctx: typer.Context):
    a = Api(config=ctx.obj.config)
    asyncio.run(a.run())


@cli.command()
def show_openapi(ctx: typer.Context):
    print_openapi(ctx.obj.config)


cli.add_typer(database_cli, name="db", help="Manage everything related to the abrechnung database")
cli.add_typer(demo_cli, name="demo", help="Manage abrechnung demo instances")
cli.add_typer(admin_cli, name="admin", help="General administrative utilities")


def main():
    cli()
