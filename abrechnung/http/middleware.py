import asyncpg
from starlette.requests import Request
from starlette.types import ASGIApp, Scope, Receive, Send
from starlette.websockets import WebSocket

from abrechnung.application.accounts import AccountService
from abrechnung.application.groups import GroupService
from abrechnung.application.transactions import TransactionService
from abrechnung.application.users import UserService
from abrechnung.config import Config
from abrechnung.http.routers.websocket import NotificationManager


class ContextMiddleware:
    def __init__(
        self,
        app: ASGIApp,
        config: Config,
        db_pool: asyncpg.Pool,
        user_service: UserService,
        transaction_service: TransactionService,
        account_service: AccountService,
        group_service: GroupService,
        notification_manager: NotificationManager,
    ) -> None:
        self.app = app

        self.config = config
        self.db_pool = db_pool
        self.user_service = user_service
        self.transaction_service = transaction_service
        self.account_service = account_service
        self.group_service = group_service
        self.notification_manager = notification_manager

    async def __call__(self, scope: Scope, receive: Receive, send: Send):
        if scope["type"] == "http":
            req = Request(scope, receive, send)
        elif scope["type"] == "websocket":
            req = WebSocket(scope, receive, send)
        else:
            return await self.app(scope, receive, send)

        req.state.config = self.config
        req.state.db_pool = self.db_pool
        req.state.user_service = self.user_service
        req.state.transaction_service = self.transaction_service
        req.state.account_service = self.account_service
        req.state.group_service = self.group_service
        req.state.notification_manager = self.notification_manager

        await self.app(scope, receive, send)
