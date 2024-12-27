import json
import logging

from sftkit.http import Server

from abrechnung import __version__
from abrechnung.application.accounts import AccountService
from abrechnung.application.groups import GroupService
from abrechnung.application.transactions import TransactionService
from abrechnung.application.users import UserService
from abrechnung.config import Config
from abrechnung.database.migrations import check_revision_version, get_database

from .context import Context
from .routers import accounts, auth, common, groups, transactions, websocket
from .routers.websocket import NotificationManager


def get_server(config: Config):
    server = Server(
        title="Abrechnung API",
        config=config.api,
        license_name="AGPL-3.0",
        version=__version__,
        cors=True,
    )

    server.add_router(transactions.router)
    server.add_router(groups.router)
    server.add_router(auth.router)
    server.add_router(accounts.router)
    server.add_router(common.router)
    server.add_router(websocket.router)
    return server


def print_openapi(config: Config):
    server = get_server(config)
    print(json.dumps(server.get_openapi_spec()))


class Api:
    def __init__(self, config: Config):
        self.cfg = config

        self.logger = logging.getLogger(__name__)

        self.server = get_server(config)

    async def _setup(self):
        db = get_database(config=self.cfg.database)
        self.db_pool = await db.create_pool()
        await check_revision_version(db)
        self.user_service = UserService(db_pool=self.db_pool, config=self.cfg)
        self.transaction_service = TransactionService(db_pool=self.db_pool, config=self.cfg)
        self.account_service = AccountService(db_pool=self.db_pool, config=self.cfg)
        self.group_service = GroupService(db_pool=self.db_pool, config=self.cfg)
        self.notification_manager = NotificationManager(config=self.cfg, db_pool=self.db_pool)
        await self.notification_manager.initialize()
        self.context = Context(
            config=self.cfg,
            user_service=self.user_service,
            transaction_service=self.transaction_service,
            account_service=self.account_service,
            group_service=self.group_service,
            notification_manager=self.notification_manager,
        )

    async def _teardown(self):
        await self.notification_manager.teardown()
        await self.db_pool.close()

    async def run(self):
        await self._setup()
        try:
            await self.server.run(self.context)
        finally:
            await self._teardown()
