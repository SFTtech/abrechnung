import asyncio
import email.message
import email.utils
import logging
import smtplib
from typing import Any, Optional, Type

import asyncpg
from sftkit.database import Connection

from .config import Config
from .database.migrations import get_database
from .mail_templates import MailTemplates


class Mailer:
    def __init__(self, config: Config):
        self.config = config
        self.events: Optional[asyncio.Queue] = None
        self.db_connection: Connection | None = None
        self.database = get_database(config.database)
        self.mailer = None
        self.logger = logging.getLogger(__name__)
        self.templates = MailTemplates()

        self.event_handlers = {
            (
                "mailer",
                "pending_registration",
            ): self.on_pending_registration_notification,
            (
                "mailer",
                "pending_password_recovery",
            ): self.on_user_password_recovery_notification,
            ("mailer", "pending_email_change"): self.on_user_email_update_notification,
        }

    async def _mailer_loop(self):
        assert self.events is not None
        # run all of the events manually once
        for event_handler in self.event_handlers.values():
            await event_handler()

        # handle events
        while True:
            event = await self.events.get()
            if isinstance(event, StopIteration):
                return False
            handler = self.event_handlers.get(event)
            if handler is None:
                self.logger.info(f"unhandled event {event!r}")
            else:
                await handler()

    async def run(self):
        # just try to connect to the mailing server once
        _ = self.get_mailer_instance()
        # only initialize the event queue once we are in a proper async context otherwise weird errors happen
        self.events = asyncio.Queue()

        if self.events is None:
            raise RuntimeError("something unexpected happened, self.events is None")

        stopped = False
        while not stopped:
            db_pool = await self.database.create_pool(n_connections=1)
            self.db_connection = await db_pool.acquire()
            assert self.db_connection is not None
            self.db_connection.add_termination_listener(self.terminate_callback)
            self.db_connection.add_log_listener(self.log_callback)
            await self.db_connection.add_listener("mailer", self.notification_callback)

            try:
                # if this returns it means the database connection was closed -> retry opening the db pool
                await self._mailer_loop()
            except Exception:  # pylint: disable=bare-except
                await self.db_connection.remove_listener("mailer", self.notification_callback)
                await self.db_connection.close()
                await db_pool.close()
                stopped = True

    def get_mailer_instance(self):
        mode = self.config.email.mode

        if mode == "local":
            mail_sender_class: Type[smtplib.SMTP] | Type[smtplib.LMTP] | Type[smtplib.SMTP_SSL] = smtplib.LMTP
        elif mode == "smtp-ssl":
            mail_sender_class = smtplib.SMTP_SSL
        else:
            mail_sender_class = smtplib.SMTP

        mailer = mail_sender_class(
            host=self.config.email.host,
            port=self.config.email.port,
        )
        if mode == "smtp-starttls":
            mailer.starttls()

        if self.config.email.auth:
            mailer.login(
                user=self.config.email.auth.username,
                password=self.config.email.auth.password,
            )
        return mailer

    def notification_callback(self, connection: asyncpg.Connection, pid: int, channel: str, payload: str):
        """runs whenever we get a psql notification"""
        del pid, connection  # unused
        if self.events is None:
            raise RuntimeError("something unexpected happened, self.events is None")
        self.events.put_nowait((channel, payload))

    def terminate_callback(self, connection: asyncpg.Connection):
        """runs when the psql connection is closed"""
        del connection  # unused
        self.logger.info("psql connection closed")
        # proper way of clearing asyncio queue
        if self.events is None:
            raise RuntimeError("something unexpected happened, self.events is None")
        for _ in range(self.events.qsize()):
            self.events.get_nowait()
            self.events.task_done()
        self.events.put_nowait(StopIteration())

    async def log_callback(self, connection: asyncpg.Connection, message: str):
        """runs when psql sends a log message"""
        del connection  # unused
        self.logger.info(f"psql log message: {message}")

    def send_email(self, template: str, *, dest_address: str, dest_name: str, **context: Any):
        """Render the mail template with the given name and send it to the recipient."""
        mail = self.templates.render(
            template,
            username=dest_name,
            service_name=self.config.service.name,
            base_url=self.base_url,
            **context,
        )
        self.logger.info(f"sending email to {dest_address}, subject: {mail.subject}")

        # we do this to not have one long hanging open connection with the mail server
        mailer = self.get_mailer_instance()

        from_addr = self.config.email.address
        msg = email.message.EmailMessage()
        msg.set_content(mail.body)
        msg["Subject"] = f"[{self.config.service.name}] {mail.subject}"
        msg["To"] = dest_address
        msg["From"] = from_addr
        msg["Date"] = email.utils.localtime()
        msg["Message-ID"] = email.utils.make_msgid(domain=from_addr.split("@")[-1])
        mailer.send_message(msg)

    @property
    def base_url(self) -> str:
        return self.config.api.base_url.rstrip("/")

    async def on_pending_registration_notification(self):
        assert self.db_connection is not None
        unsent_mails = await self.db_connection.fetch(
            "select usr.id, usr.email, usr.username, pr.token, pr.valid_until "
            "from pending_registration pr join usr on usr.id = pr.user_id "
            "where pr.mail_next_attempt is not null and pr.mail_next_attempt < NOW() and pr.valid_until > NOW()"
        )

        if not unsent_mails:
            self.logger.info("no pending_registration mails are pending")

        for row in unsent_mails:
            try:
                self.send_email(
                    "confirm_registration",
                    dest_address=row["email"],
                    dest_name=row["username"],
                    token=row["token"],
                    valid_until=row["valid_until"],
                )

                await self.db_connection.execute(
                    "update pending_registration set mail_next_attempt = null where token = $1",
                    row["token"],
                )
            except smtplib.SMTPException as e:
                self.logger.warning(f"Failed to send email to user {row['username']} with email {row['email']}: {e}")

    async def on_user_password_recovery_notification(self):
        assert self.db_connection is not None
        unsent_mails = await self.db_connection.fetch(
            "select usr.id, usr.username, usr.email, ppr.token, ppr.valid_until "
            "from pending_password_recovery ppr join usr on usr.id = ppr.user_id "
            "where ppr.mail_next_attempt is not null and ppr.mail_next_attempt < NOW() and ppr.valid_until > NOW()"
        )

        if not unsent_mails:
            self.logger.info("no user_password_recovery mails are pending")

        for row in unsent_mails:
            try:
                self.send_email(
                    "password_recovery",
                    dest_address=row["email"],
                    dest_name=row["username"],
                    token=row["token"],
                    valid_until=row["valid_until"],
                )

                await self.db_connection.execute(
                    "update pending_password_recovery set mail_next_attempt = null where token = $1",
                    row["token"],
                )
            except smtplib.SMTPException as e:
                self.logger.warning(f"Failed to send email to user {row['username']} with email {row['email']}: {e}")

    async def on_user_email_update_notification(self):
        assert self.db_connection is not None
        unsent_mails = await self.db_connection.fetch(
            "select usr.id, usr.username, usr.email as old_email, pec.new_email as new_email, pec.token, "
            "   pec.valid_until "
            "from pending_email_change pec join usr on usr.id = pec.user_id "
            "where pec.mail_next_attempt is not null and pec.mail_next_attempt < NOW() and pec.valid_until > NOW()"
        )

        if not unsent_mails:
            self.logger.info("no user_email_update mails are pending")

        for row in unsent_mails:
            try:
                self.send_email(
                    "email_change_notice",
                    dest_address=row["old_email"],
                    dest_name=row["username"],
                    old_email=row["old_email"],
                    new_email=row["new_email"],
                    valid_until=row["valid_until"],
                )

                self.send_email(
                    "email_change_confirm",
                    dest_address=row["new_email"],
                    dest_name=row["username"],
                    old_email=row["old_email"],
                    new_email=row["new_email"],
                    token=row["token"],
                    valid_until=row["valid_until"],
                )

                await self.db_connection.execute(
                    "update pending_email_change set mail_next_attempt = null where token = $1",
                    row["token"],
                )
            except smtplib.SMTPException as e:
                self.logger.warning(
                    f"Failed to send email to user {row['username']} with email {row['old_email']}: {e}"
                )
