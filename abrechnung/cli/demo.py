import asyncio

import typer

from abrechnung.demo import cleanup as cleanup_

demo_cli = typer.Typer()


@demo_cli.command()
def cleanup(ctx: typer.Context):
    asyncio.run(cleanup_(config=ctx.obj.config))
