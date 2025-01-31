import json
import logging

from prometheus_fastapi_instrumentator import Instrumentator
from sftkit.http import Server

from abrechnung import __version__
from abrechnung.application.accounts import AccountService
from abrechnung.application.groups import GroupService
from abrechnung.application.transactions import TransactionService
from abrechnung.application.users import UserService
from abrechnung.config import Config
from abrechnung.database.migrations import check_revision_version, get_database

from . import metrics
from .context import Context
from .routers import accounts, auth, common, groups, transactions


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
        self.context = Context(
            config=self.cfg,
            user_service=self.user_service,
            transaction_service=self.transaction_service,
            account_service=self.account_service,
            group_service=self.group_service,
        )

    async def _teardown(self):
        await self.db_pool.close()

    def _instrument_api(self):
        if not self.cfg.metrics.enabled:
            return
        instrumentor = Instrumentator()
        instrumentor.add(metrics.abrechnung_number_of_groups_total(self.group_service))
        instrumentor.add(metrics.abrechnung_number_of_transactions_total(self.transaction_service))
        if self.cfg.metrics.expose_money_amounts:
            instrumentor.add(metrics.abrechnung_total_amount_of_money(self.transaction_service))
        instrumentor.instrument(self.server.api).expose(self.server.api, endpoint="/api/metrics")

    async def run(self):
        await self._setup()
        try:
            self._instrument_api()
            await self.server.run(self.context)
        finally:
            await self._teardown()
