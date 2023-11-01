# pylint: disable=attribute-defined-outside-init
from httpx import AsyncClient

from abrechnung.http.api import Api
from tests.common import BaseTestCase, TEST_CONFIG


class HTTPTestCase(BaseTestCase):
    async def asyncSetUp(self) -> None:
        await super().asyncSetUp()
        self.test_config = TEST_CONFIG
        self.http_service = Api(config=self.test_config)
        await self.http_service._setup()

        self.client = AsyncClient(
            app=self.http_service.api, base_url="https://abrechnung.sft.lol"
        )
        self.transaction_service = self.http_service.transaction_service
        self.account_service = self.http_service.account_service
        self.group_service = self.http_service.group_service

    async def asyncTearDown(self) -> None:
        await self.http_service._teardown()
        await super().asyncTearDown()


class HTTPAPITest(HTTPTestCase):
    async def asyncSetUp(self) -> None:
        await super().asyncSetUp()

        self.test_user, password = await self._create_test_user(
            "user1", "user1@email.stuff"
        )
        _, session_id, _ = await self.user_service.login_user(
            username="user1", password=password, session_name="session1"
        )
        _, _, self.session_token = await self.user_service.login_user(
            username=self.test_user.username, password=password, session_name="foobar"
        )
        self.jwt_token = await self.user_service.get_access_token_from_session_token(
            self.session_token
        )

    async def _post(self, *args, **kwargs):
        headers = {"Authorization": f"Bearer {self.jwt_token}"}
        headers.update(kwargs.pop("headers", {}))
        kwargs["headers"] = headers
        return await self.client.post(*args, **kwargs)

    async def _delete(self, *args, **kwargs):
        headers = {"Authorization": f"Bearer {self.jwt_token}"}
        headers.update(kwargs.pop("headers", {}))
        kwargs["headers"] = headers
        return await self.client.delete(*args, **kwargs)

    async def _get(self, *args, **kwargs):
        headers = {"Authorization": f"Bearer {self.jwt_token}"}
        headers.update(kwargs.pop("headers", {}))
        kwargs["headers"] = headers
        return await self.client.get(*args, **kwargs)
