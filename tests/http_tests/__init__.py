import asyncio
import logging

from aiohttp import web
from aiohttp.test_utils import (
    TestServer,
    TestClient,
)

from abrechnung.application.accounts import AccountService
from abrechnung.application.groups import GroupService
from abrechnung.application.transactions import TransactionService
from abrechnung.application.users import UserService
from abrechnung.config import Config
from abrechnung.http import HTTPService
from abrechnung.http.auth import token_for_user
from tests import AsyncTestCase


class AsyncHTTPTestCase(AsyncTestCase):
    async def get_application(self) -> web.Application:
        """
        This method should be overridden
        to return the aiohttp.web.Application
        object to test.

        """
        return self.get_app()

    def get_app(self) -> web.Application:
        """Obsolete method used to constructing web application.

        Use .get_application() coroutine instead

        """
        raise RuntimeError("Did you forget to define get_application()?")

    def setUp(self) -> None:
        try:
            self.loop = asyncio.get_running_loop()
        except (AttributeError, RuntimeError):  # AttributeError->py36
            self.loop = asyncio.get_event_loop_policy().get_event_loop()

        self.loop.run_until_complete(self._setup_db())
        self.loop.run_until_complete(self.setUpAsync())

    async def setUpAsync(self) -> None:
        self.app = await self.get_application()
        self.server = await self.get_server(self.app)
        self.client = await self.get_client(self.server)

        await self.client.start_server()

    def tearDown(self) -> None:
        self.loop.run_until_complete(self.tearDownAsync())
        self.loop.run_until_complete(self._teardown_db())

    async def tearDownAsync(self) -> None:
        await self.client.close()

    async def get_server(self, app: web.Application) -> TestServer:
        """Return a TestServer instance."""
        return TestServer(app, loop=self.loop)

    async def get_client(self, server: TestServer) -> TestClient:
        """Return a TestClient instance."""
        return TestClient(server, loop=self.loop)


class BaseHTTPAPITest(AsyncHTTPTestCase):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        logging.basicConfig(level=logging.DEBUG)

    async def tearDownAsync(self) -> None:
        await super().tearDownAsync()
        await self.http_service._unregister_forwarder(
            self.db_conn, forwarder_id="test_forwarder"
        )

    async def get_application(self) -> web.Application:
        self.secret_key = "asdf1234"
        self.test_config = Config.from_dict(
            {
                "api": {"secret_key": self.secret_key, "enable_registration": True},
                "service": {"api_url": "http://localhost/api"},
            }
        )
        self.http_service = HTTPService(config=self.test_config)

        await self.http_service._register_forwarder(
            self.db_conn, forwarder_id="test_forwarder"
        )

        self.group_service = GroupService(self.db_pool, config=self.test_config)
        self.account_service = AccountService(self.db_pool, config=self.test_config)
        self.user_service = UserService(self.db_pool, config=self.test_config)
        self.transaction_service = TransactionService(
            self.db_pool, config=self.test_config
        )

        app = self.http_service.create_app(db_pool=self.db_pool)

        return app


class HTTPAPITest(BaseHTTPAPITest):
    async def setUpAsync(self) -> None:
        await super().setUpAsync()

        self.test_user_id, password = await self._create_test_user(
            "user1", "user1@email.stuff"
        )
        _, session_id, _ = await self.user_service.login_user(
            "user1", password=password, session_name="session1"
        )
        self.jwt_token = token_for_user(self.test_user_id, session_id, self.secret_key)

    async def _post(self, *args, **kwargs):
        headers = kwargs.pop("headers", {})
        headers.update({"Authorization": f"Bearer {self.jwt_token}"})
        kwargs["headers"] = headers
        return await self.client.post(*args, **kwargs)

    async def _delete(self, *args, **kwargs):
        headers = kwargs.pop("headers", {})
        headers.update({"Authorization": f"Bearer {self.jwt_token}"})
        kwargs["headers"] = headers
        return await self.client.delete(*args, **kwargs)

    async def _get(self, *args, **kwargs):
        headers = kwargs.pop("headers", {})
        headers.update({"Authorization": f"Bearer {self.jwt_token}"})
        kwargs["headers"] = headers
        return await self.client.get(*args, **kwargs)
