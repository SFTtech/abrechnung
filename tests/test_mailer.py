# pylint: disable=attribute-defined-outside-init,missing-kwoa
import asyncio
from dataclasses import dataclass
from typing import Optional

from aiosmtpd import smtp
from aiosmtpd.controller import Controller

from abrechnung.application.users import UserService
from abrechnung.mailer import Mailer

from .common import TEST_CONFIG, BaseTestCase


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


class MailerTest(BaseTestCase):
    async def asyncSetUp(self) -> None:
        await super().asyncSetUp()
        self.smtp_handler = DummySMTPHandler()
        self.smtp = Controller(self.smtp_handler)
        self.smtp.start()

        config = TEST_CONFIG.model_copy(deep=True)
        config.email.host = self.smtp.hostname
        config.email.port = self.smtp.port
        config.email.address = "abrechnung@stusta.de"
        self.mailer = Mailer(config=config)

        self.mailer_task = asyncio.create_task(self.mailer.run())

        self.user_service = UserService(db_pool=self.db_pool, config=config)

    async def asyncTearDown(self) -> None:
        await super().asyncTearDown()
        self.mailer_task.cancel()
        self.smtp.stop()

    async def test_registration_mail_delivery(self):
        user_email = "user@email.com"
        await self.user_service.register_user(username="user1", email=user_email, password="password")
        await asyncio.sleep(0.5)

        mail: smtp.Envelope = self.smtp_handler.mail_queue.get_nowait()
        self.assertIsNotNone(mail)
        self.assertIn(user_email, mail.rcpt_tos)
        self.assertIn("[Test Abrechnung] Confirm user account", decode(mail.content))

    async def test_email_change_mail_delivery(self):
        user_email = "user@email.com"
        new_email = "new_email@email.com"
        user, password = await self._create_test_user(username="user", email=user_email)
        await self.user_service.request_email_change(user=user, password=password, email=new_email)

        await asyncio.sleep(0.5)
        mail1: smtp.Envelope = self.smtp_handler.mail_queue.get_nowait()
        self.assertIsNotNone(mail1)
        mail2: smtp.Envelope = self.smtp_handler.mail_queue.get_nowait()
        self.assertIsNotNone(mail2)
        self.assertTrue(user_email in mail1.rcpt_tos or mail2.rcpt_tos)
        self.assertTrue(new_email in mail1.rcpt_tos or mail2.rcpt_tos)
        self.assertIn("[Test Abrechnung] Change email", decode(mail1.content))
        self.assertIn("[Test Abrechnung] Change email", decode(mail2.content))

    async def test_password_reset_mail_delivery(self):
        user_email = "user@email.com"
        await self._create_test_user(username="user", email=user_email)
        await self.user_service.request_password_recovery(email=user_email)

        await asyncio.sleep(0.5)
        mail: smtp.Envelope | None = self.smtp_handler.mail_queue.get_nowait()
        assert mail is not None
        self.assertIn(user_email, mail.rcpt_tos)
        self.assertIn("[Test Abrechnung] Reset password", decode(mail.content))
