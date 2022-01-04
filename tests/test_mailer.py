import asyncio
from dataclasses import dataclass
from typing import Optional

from aiosmtpd import smtp
from aiosmtpd.controller import Controller

from abrechnung.application.users import UserService
from abrechnung.config import Config
from abrechnung.mailer import Mailer
from tests import AsyncTestCase, get_test_db_config


@dataclass
class Mail:
    peer: str
    from_email: str
    rcpttos: str
    data: str
    mail_options: Optional[str]
    rcpt_options: Optional[str]


class DummySMTPHandler:
    def __init__(self):
        self.mail_queue = asyncio.Queue()

    async def handle_RCPT(
        self, server, session, envelope: smtp.Envelope, address: str, rcpt_options
    ):
        del server, session, rcpt_options  # unused
        envelope.rcpt_tos.append(address)
        return "250 OK"

    async def handle_DATA(self, server, session, envelope: smtp.Envelope):
        del server, session  # unused
        await self.mail_queue.put(envelope)
        return "250 Message accepted for delivery"


class MailerTest(AsyncTestCase):
    async def setUpAsync(self) -> None:
        await super().setUpAsync()
        self.smtp_handler = DummySMTPHandler()
        self.smtp = Controller(self.smtp_handler)
        self.smtp.start()

        self.mailer_config = Config.from_dict(
            {
                "api": {"enable_registration": True},
                "email": {
                    "host": self.smtp.hostname,
                    "port": self.smtp.port,
                    "address": "abrechnung@stusta.de",
                },
                "database": get_test_db_config(),
                "service": {
                    "url": "https://abrechnung.example.lol",
                    "name": "Test Abrechnung",
                },
            }
        )
        self.mailer = Mailer(config=self.mailer_config)

        self.mailer_task = asyncio.create_task(self.mailer.run())

        self.user_service = UserService(db_pool=self.db_pool, config=self.mailer_config)

    async def tearDownAsync(self) -> None:
        await super().tearDownAsync()
        self.mailer_task.cancel()
        self.smtp.stop()

    async def test_registration_mail_delivery(self):
        user_email = "user@email.com"
        await self.user_service.register_user("user1", user_email, "password")
        await asyncio.sleep(0.5)

        mail: smtp.Envelope = self.smtp_handler.mail_queue.get_nowait()
        self.assertIsNotNone(mail)
        self.assertIn(user_email, mail.rcpt_tos)
        self.assertIn(
            "[Test Abrechnung] Confirm user account", mail.content.decode("utf-8")
        )

    async def test_email_change_mail_delivery(self):
        user_email = "user@email.com"
        new_email = "new_email@email.com"
        user_id, password = await self._create_test_user(
            username="user", email=user_email
        )
        await self.user_service.request_email_change(
            user_id=user_id, password=password, email=new_email
        )

        await asyncio.sleep(0.5)
        mail1: smtp.Envelope = self.smtp_handler.mail_queue.get_nowait()
        self.assertIsNotNone(mail1)
        mail2: smtp.Envelope = self.smtp_handler.mail_queue.get_nowait()
        self.assertIsNotNone(mail2)
        self.assertTrue(user_email in mail1.rcpt_tos or mail2.rcpt_tos)
        self.assertTrue(new_email in mail1.rcpt_tos or mail2.rcpt_tos)
        self.assertIn("[Test Abrechnung] Change email", mail1.content.decode("utf-8"))
        self.assertIn("[Test Abrechnung] Change email", mail2.content.decode("utf-8"))

    async def test_password_reset_mail_delivery(self):
        user_email = "user@email.com"
        await self._create_test_user(username="user", email=user_email)
        await self.user_service.request_password_recovery(email=user_email)

        await asyncio.sleep(0.5)
        mail: smtp.Envelope = self.smtp_handler.mail_queue.get_nowait()
        self.assertIsNotNone(mail)
        self.assertIn(user_email, mail.rcpt_tos)
        self.assertIn("[Test Abrechnung] Reset password", mail.content.decode("utf-8"))
