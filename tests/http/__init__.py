import logging
import os
import secrets
from uuid import uuid4

from aiohttp import web
from aiohttp.abc import Application
from aiohttp.test_utils import AioHTTPTestCase

from abrechnung.application.groups import Groups, GroupsReader
from abrechnung.application.users import Users
from abrechnung.http import create_app
from abrechnung.http.auth import token_for_user
from abrechnung.system import create_runner


class BaseHTTPAPITest(AioHTTPTestCase):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        logging.basicConfig(level=logging.DEBUG)

    async def setUpAsync(self) -> None:
        os.environ["INFRASTRUCTURE_FACTORY"] = "eventsourcing.sqlite:Factory"

        # use a different in memory sqlite database for every test so that we do not run into collisions
        os.environ[
            "SQLITE_DBNAME"
        ] = f"file::{secrets.token_hex(10)}?mode=memory&cache=shared"
        os.environ["SQLITE_LOCK_TIMEOUT"] = "1"

    async def get_application(self) -> Application:
        raise NotImplementedError


class HTTPAPITest(BaseHTTPAPITest):
    # @web.middleware
    # async def mock_auth_middleware(self, request, handler):
    #     request["user"] = {"user_id": self.test_user_id}
    #     return await handler(request)

    async def get_application(self) -> web.Application:
        runner = create_runner()
        runner.start()

        self.group_service = runner.get(Groups)
        self.group_read_service = runner.get(GroupsReader)
        self.user_service = runner.get(Users)

        self.test_user_id = self.user_service.register_user(
            "dummy_user", email="dummy_user@stuff.stuff", password="asdf1234"
        )

        self.secret_key = "asdf1234"
        self.jwt_token = token_for_user(self.test_user_id, self.secret_key)

        app = create_app(runner=runner, secret_key=self.secret_key)

        return app

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
