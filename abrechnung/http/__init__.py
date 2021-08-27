import logging
from typing import Optional

import aiohttp_cors as aiohttp_cors
from aiohttp import web
from asyncpg.pool import Pool

from abrechnung.application.accounts import AccountService
from abrechnung.application.groups import GroupService
from abrechnung.application.transactions import TransactionService
from abrechnung.application.users import UserService
from abrechnung.database import db_connect
from abrechnung.http import groups, transactions, websocket
from abrechnung.http.auth import jwt_middleware
from abrechnung.http.utils import error_middleware
from abrechnung.subcommand import SubCommand


def create_app(
    db_pool: Pool, secret_key: str, middlewares: Optional[list] = None
) -> web.Application:
    app = web.Application()
    cors = aiohttp_cors.setup(
        app,
        defaults={
            "*": aiohttp_cors.ResourceOptions(
                allow_credentials=True, expose_headers="*", allow_headers="*"
            )
        },
    )
    app["secret_key"] = secret_key
    app["db_pool"] = db_pool

    if middlewares is None:
        auth_middleware = jwt_middleware(
            secret=secret_key,
            whitelist=[
                "/api/v1/auth/login",
                "/api/v1/auth/register",
                "/api/v1/auth/confirm_registration",
                "/api/v1/auth/confirm_email_change",
                "/api/v1/ws",
            ],
        )
        middlewares = [auth_middleware]

    middlewares += [error_middleware]

    api_app = web.Application(middlewares=middlewares)
    api_app["secret_key"] = secret_key
    api_app["db_pool"] = db_pool

    api_app["user_service"] = UserService(db_pool=db_pool)
    api_app["group_service"] = GroupService(db_pool=db_pool)
    api_app["account_service"] = AccountService(db_pool=db_pool)
    api_app["transaction_service"] = TransactionService(db_pool=db_pool)

    api_app.add_routes(groups.routes)
    api_app.add_routes(transactions.routes)
    api_app.add_routes(auth.routes)
    api_app.add_routes(websocket.routes)

    app.add_subapp("/api/v1/", api_app)

    # add all routes to cors expemtions
    for route in list(app.router.routes()):
        cors.add(route)

    return app


class HTTPService(SubCommand):
    """
    sft psql websocket gateway
    """

    def __init__(self, config, **args):
        self.cfg = config

        self.logger = logging.getLogger(__name__)

    async def run(self):
        """
        run the websocket server
        """

        db_pool = await db_connect(
            username=self.cfg["database"]["user"],
            password=self.cfg["database"]["password"],
            database=self.cfg["database"]["dbname"],
            host=self.cfg["database"]["host"],
        )

        app = create_app(db_pool=db_pool, secret_key=self.cfg["api"]["secret_key"])

        await web._run_app(
            app, host=self.cfg["api"]["host"], port=self.cfg["api"]["port"]
        )
