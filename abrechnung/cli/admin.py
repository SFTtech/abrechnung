import asyncio

import typer

from abrechnung.admin import create_user as create_user_

admin_cli = typer.Typer()


@admin_cli.command()
def create_user(
    ctx: typer.Context, name: str, email: str, skip_email_check: bool = False, no_email_confirmation: bool = False
):
    asyncio.run(
        create_user_(
            config=ctx.obj.config,
            name=name,
            email=email,
            skip_email_check=skip_email_check,
            no_email_confirmation=no_email_confirmation,
        )
    )
