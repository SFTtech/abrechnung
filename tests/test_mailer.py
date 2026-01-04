# pylint: disable=attribute-defined-outside-init,missing-kwoa
import asyncio
from dataclasses import dataclass
from typing import AsyncGenerator, Optional

import pytest
from aiosmtpd import smtp
from aiosmtpd.controller import Controller
from asyncpg import Pool

from abrechnung.application.users import UserService
from abrechnung.config import Config
from abrechnung.mailer import Mailer

from .conftest import TEST_CONFIG, CreateTestUser


@dataclass
class Mail:
    peer: str
    from_email: str
    rcpttos: str
    data: str
    mail_options: Optional[str]
    rcpt_options: Optional[str]


def decode(val: str | bytes | None) -> str:
    assert val is not None
    if isinstance(val, bytes):
        return val.decode("utf-8")
    return val


class DummySMTPHandler:
    def __init__(self):
        self.mail_queue: asyncio.Queue[smtp.Envelope] = asyncio.Queue()

    async def handle_RCPT(self, server, session, envelope: smtp.Envelope, address: str, rcpt_options):
        del server, session, rcpt_options  # unused
        envelope.rcpt_tos.append(address)
        return "250 OK"

    async def handle_DATA(self, server, session, envelope: smtp.Envelope):
        del server, session  # unused
        await self.mail_queue.put(envelope)
        return "250 Message accepted for delivery"


@dataclass
class TestFixtures:
    config: Config
    smtp: DummySMTPHandler
    user_service: UserService


@pytest.fixture
async def test_fixture(db_pool: Pool) -> AsyncGenerator[TestFixtures, None]:
    smtp_handler = DummySMTPHandler()
    smtp = Controller(smtp_handler)
    smtp.start()
    config = TEST_CONFIG.model_copy(deep=True)
    config.email.host = smtp.hostname
    config.email.port = smtp.port
    config.email.address = "abrechnung@stusta.de"
    mailer = Mailer(config=config)
    mailer_task = asyncio.create_task(mailer.run())
    user_service = UserService(db_pool=db_pool, config=config)
    yield TestFixtures(smtp=smtp_handler, config=config, user_service=user_service)
    mailer_task.cancel()
    smtp.stop()


async def test_registration_mail_delivery(test_fixture: TestFixtures):
    user_email = "user@email.com"
    await test_fixture.user_service.register_user(username="user1", email=user_email, password="password")
    await asyncio.sleep(0.5)

    mail = test_fixture.smtp.mail_queue.get_nowait()
    assert mail is not None
    assert user_email in mail.rcpt_tos
    assert "[Test Abrechnung] Confirm user account" in decode(mail.content)


async def test_email_change_mail_delivery(test_fixture: TestFixtures, create_test_user: CreateTestUser):
    new_email = "new_email@email.com"
    user, password = await create_test_user()
    await test_fixture.user_service.request_email_change(user=user, password=password, email=new_email)

    await asyncio.sleep(0.5)
    mail1: smtp.Envelope = test_fixture.smtp.mail_queue.get_nowait()
    assert mail1 is not None
    mail2: smtp.Envelope = test_fixture.smtp.mail_queue.get_nowait()
    assert mail2 is not None
    assert user.email in mail1.rcpt_tos or mail2.rcpt_tos
    assert new_email in mail1.rcpt_tos or mail2.rcpt_tos
    assert "[Test Abrechnung] Change email" in decode(mail1.content)
    assert "[Test Abrechnung] Change email" in decode(mail2.content)


async def test_password_reset_mail_delivery(test_fixture: TestFixtures, create_test_user: CreateTestUser):
    user, _ = await create_test_user()
    await test_fixture.user_service.request_password_recovery(email=user.email)

    await asyncio.sleep(0.5)
    mail: smtp.Envelope | None = test_fixture.smtp.mail_queue.get_nowait()
    assert mail is not None
    assert user.email in mail.rcpt_tos
    assert "[Test Abrechnung] Reset password" in decode(mail.content)
