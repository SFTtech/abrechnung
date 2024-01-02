import logging

import asyncpg
import uvicorn
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from abrechnung import __version__
from abrechnung.application.accounts import AccountService
from abrechnung.application.groups import GroupService
from abrechnung.application.transactions import TransactionService
from abrechnung.application.users import UserService
from abrechnung.config import Config
from abrechnung.core.errors import InvalidCommand, NotFoundError
from abrechnung.framework.database import create_db_pool
from .middleware import ContextMiddleware
from .routers import accounts, auth, common, groups, transactions, websocket
from .routers.websocket import NotificationManager


class Api:
    def __init__(self, config: Config):
        self.cfg = config

        self.logger = logging.getLogger(__name__)

        self.api = FastAPI(
            title="Abrechnung REST-ish API",
            version=__version__,
            license_info={"identifier": "AGPL-3.0", "name": "AGPL-3.0"},
            docs_url="/api/docs",
            redoc_url=None,
        )

        self.api.include_router(transactions.router)
        self.api.include_router(groups.router)
        self.api.include_router(auth.router)
        self.api.include_router(accounts.router)
        self.api.include_router(common.router)
        self.api.include_router(websocket.router)
        self.api.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

        bad_request_handler = self.make_generic_exception_handler(status.HTTP_400_BAD_REQUEST)

        self.api.add_exception_handler(NotFoundError, self.make_generic_exception_handler(status.HTTP_404_NOT_FOUND))
        self.api.add_exception_handler(PermissionError, self.make_generic_exception_handler(status.HTTP_403_FORBIDDEN))
        self.api.add_exception_handler(asyncpg.DataError, bad_request_handler)
        self.api.add_exception_handler(asyncpg.RaiseError, bad_request_handler)
        self.api.add_exception_handler(
            asyncpg.IntegrityConstraintViolationError,
            bad_request_handler,
        )
        self.api.add_exception_handler(InvalidCommand, bad_request_handler)
        self.api.add_exception_handler(StarletteHTTPException, self._http_exception_handler)

        self.uvicorn_config = uvicorn.Config(
            self.api,
            host=config.api.host,
            port=config.api.port,
            log_level=logging.root.level,
        )

    @staticmethod
    def _format_error_message(code: int, message: str):
        return JSONResponse(
            status_code=code,
            content={
                "code": code,
                "msg": message,
            },
        )

    def make_generic_exception_handler(self, status_code: int):
        async def handler(request: Request, exc: Exception):
            return self._format_error_message(status_code, str(exc))

        return handler

    async def _http_exception_handler(self, request: Request, exc: Exception):
        if isinstance(exc, StarletteHTTPException):
            return self._format_error_message(exc.status_code, exc.detail)

    async def _setup(self):
        self.db_pool = await create_db_pool(self.cfg.database)
        self.user_service = UserService(db_pool=self.db_pool, config=self.cfg)
        self.transaction_service = TransactionService(db_pool=self.db_pool, config=self.cfg)
        self.account_service = AccountService(db_pool=self.db_pool, config=self.cfg)
        self.group_service = GroupService(db_pool=self.db_pool, config=self.cfg)
        self.notification_manager = NotificationManager(config=self.cfg)

        await self.notification_manager.initialize(db_pool=self.db_pool)

        self.api.add_middleware(
            ContextMiddleware,
            config=self.cfg,
            db_pool=self.db_pool,
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
            webserver = uvicorn.Server(self.uvicorn_config)
            await webserver.serve()
        finally:
            await self._teardown()
