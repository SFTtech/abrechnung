import asyncio
import email.message
import email.utils
import itertools
import logging
import smtplib
from typing import Optional

import asyncpg

from . import subcommand
from .config import Config


class Mailer(subcommand.SubCommand):
    def __init__(self, config: Config, **args):  # pylint: disable=super-init-not-called
        del args  # unused

        self.config = config
        self.events: Optional[asyncio.Queue] = None
        self.psql = None
        self.mailer = None
        self.logger = logging.getLogger(__name__)

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

    async def run(self):
        # just try to connect to the mailing server once
        _ = self.get_mailer_instance()
        # only initialize the event queue once we are in a proper async context otherwise weird errors happen
        self.events = asyncio.Queue()

        if self.events is None:
            raise RuntimeError("something unexpected happened, self.events is None")

        self.psql = await asyncpg.connect(
            user=self.config["database"]["user"],
            password=self.config["database"]["password"],
            host=self.config["database"]["host"],
            database=self.config["database"]["dbname"],
            port=self.config["database"].get("port", 5432),
        )
        self.psql.add_termination_listener(self.terminate_callback)
        self.psql.add_log_listener(self.log_callback)
        await self.psql.add_listener("mailer", self.notification_callback)

        # run all of the events manually once
        for handler in self.event_handlers.values():
            await handler()

        # handle events
        while True:
            event = await self.events.get()
            if event is StopIteration:
                break
            handler = self.event_handlers.get(event)
            if handler is None:
                self.logger.info(f"unhandled event {event!r}")
            else:
                await handler()

        await self.psql.remove_listener("mailer", self.notification_callback)
        await self.psql.close()

    def get_mailer_instance(self):
        mode = self.config["email"].get("mode")

        if mode == "local":
            mail_sender_class = smtplib.LMTP
        elif mode == "smtp-ssl":
            mail_sender_class = smtplib.SMTP_SSL
        else:
            mail_sender_class = smtplib.SMTP

        mailer = mail_sender_class(
            host=self.config["email"]["host"],
            port=self.config["email"]["port"],
        )
        if mode == "smtp-starttls":
            mailer.starttls()

        if "auth" in self.config["email"]:
            mailer.login(
                user=self.config["email"]["auth"]["username"],
                password=self.config["email"]["auth"]["password"],
            )
        return mailer

    def notification_callback(
        self, connection: asyncpg.Connection, pid: int, channel: str, payload: str
    ):
        """runs whenever we get a psql notification"""
        assert connection is self.psql
        del pid  # unused
        if self.events is None:
            raise RuntimeError("something unexpected happened, self.events is None")
        self.events.put_nowait((channel, payload))

    def terminate_callback(self, connection: asyncpg.Connection):
        """runs when the psql connection is closed"""
        assert connection is self.psql
        self.logger.info("psql connection closed")
        # proper way of clearing asyncio queue
        if self.events is None:
            raise RuntimeError("something unexpected happened, self.events is None")
        for _ in range(self.events.qsize()):
            self.events.get_nowait()
            self.events.task_done()
        self.events.put_nowait(StopIteration)

    async def log_callback(self, connection: asyncpg.Connection, message: str):
        """runs when psql sends a log message"""
        assert connection is self.psql
        self.logger.info(f"psql log message: {message}")

    def send_email(
        self, *text_lines: str, subject: str, dest_address: str, dest_name: str
    ):
        self.logger.info(f"sending email to {dest_address}, subject: {subject}")

        # we do this to not have one long hanging open connection with the mail server
        mailer = self.get_mailer_instance()

        from_addr = self.config["email"]["address"]
        msg = email.message.EmailMessage()
        msg.set_content(
            "\n".join(
                itertools.chain(
                    self.greeting_lines(dest_name),
                    text_lines,
                    self.closing_lines(),
                )
            )
        )
        msg["Subject"] = f"[{self.config['service']['name']}] {subject}"
        msg["To"] = dest_address
        msg["From"] = from_addr
        msg["Date"] = email.utils.localtime()
        msg["Message-ID"] = email.utils.make_msgid(domain=from_addr.split("@")[-1])
        mailer.send_message(msg)  # type: ignore

    def greeting_lines(self, name: str):
        return f"Beloved {name},", ""

    def closing_lines(self):
        return "", "Thoughtfully yours", "", f"    {self.config['service']['name']}"

    async def on_pending_registration_notification(self):
        unsent_mails = await self.psql.fetch(
            "select usr.id, usr.email, usr.username, pr.token, pr.valid_until "
            "from pending_registration pr join usr on usr.id = pr.user_id "
            "where pr.mail_next_attempt is not null and pr.mail_next_attempt < NOW() and pr.valid_until > NOW()"
        )

        if not unsent_mails:
            self.logger.info("no pending_registration mails are pending")

        for row in unsent_mails:
            try:
                self.send_email(
                    "it looks like you are attempting to create a user account.",
                    "",
                    "To complete your registration, visit",
                    "",
                    f"{self.config['service']['url']}/confirm-registration/{row['token']}",
                    "",
                    f"Your request will time out {row['valid_until']}.",
                    "If you do not want to create a user account, just ignore this email.",
                    subject="Confirm user account",
                    dest_address=row["email"],
                    dest_name=row["username"],
                )

                await self.psql.execute(
                    "update pending_registration "
                    "set mail_next_attempt = null "
                    "where token = $1",
                    row["token"],
                )
            except smtplib.SMTPException as e:
                self.logger.warning(
                    f"Failed to send email to user {row['username']} with email {row['email']}: {e}"
                )

    async def on_user_password_recovery_notification(self):
        unsent_mails = await self.psql.fetch(
            "select usr.id, usr.username, usr.email, ppr.token, ppr.valid_until "
            "from pending_password_recovery ppr join usr on usr.id = ppr.user_id "
            "where ppr.mail_next_attempt is not null and ppr.mail_next_attempt < NOW() and ppr.valid_until > NOW()"
        )

        if not unsent_mails:
            self.logger.info("no user_password_recovery mails are pending")

        for row in unsent_mails:
            try:
                self.send_email(
                    "it looks like you forgot your password; how embarrasing.",
                    "",
                    "To set a new one, visit",
                    "",
                    f"{self.config['service']['url']}/confirm-password-recovery/{row['token']}",
                    "",
                    f"Your request will time out {row['valid_until']}.",
                    "If you do not want to reset your password, just ignore this email.",
                    subject="Reset password",
                    dest_address=row["email"],
                    dest_name=row["username"],
                )

                await self.psql.execute(
                    "update pending_password_recovery "
                    "set mail_next_attempt = null "
                    "where token = $1",
                    row["token"],
                )
            except smtplib.SMTPException as e:
                self.logger.warning(
                    f"Failed to send email to user {row['username']} with email {row['email']}: {e}"
                )

    async def on_user_email_update_notification(self):
        unsent_mails = await self.psql.fetch(
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
                    "you want to change your email address",
                    "",
                    f"Your current email is: {row['old_email']}",
                    f"You want to change it to: {row['new_email']}",
                    "",
                    "To confirm, see the mail that was sent to the new address.",
                    "",
                    f"Your request will time out {row['valid_until']}.",
                    "If you do not want to change your email, just ignore this email.",
                    subject="Change email",
                    dest_address=row["old_email"],
                    dest_name=row["username"],
                )

                self.send_email(
                    "you want to change your email address",
                    "",
                    f"Your current email is: {row['old_email']}",
                    f"You want to change it to: {row['new_email']}",
                    "",
                    "To confirm, visit",
                    "",
                    f"{self.config['service']['url']}/confirm-email-change/{row['token']}",
                    "",
                    f"Your request will time out {row['valid_until']}.",
                    "If you do not want to change your email, just ignore this email.",
                    subject="Change email",
                    dest_address=row["new_email"],
                    dest_name=row["username"],
                )

                await self.psql.execute(
                    "update pending_email_change "
                    "set mail_next_attempt = null "
                    "where token = $1",
                    row["token"],
                )
            except smtplib.SMTPException as e:
                self.logger.warning(
                    f"Failed to send email to user {row['username']} with email {row['email']}: {e}"
                )
