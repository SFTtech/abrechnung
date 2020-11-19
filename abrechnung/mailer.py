#!/usr/bin/env python3
import asyncio
import email.message
import itertools
import json
import logging
import smtplib

import asyncpg

from . import subcommand


class Mailer(subcommand.SubCommand):
    def __init__(self, config, **args):
        self.config = config
        self.events = asyncio.Queue()
        self.psql = None
        self.mailer = None
        self.logger = logging.getLogger(__name__)

        self.event_handlers = {
            ('email', 'user_registration'): self.on_user_registration_notification,
            ('email', 'user_password_recovery'): self.on_user_password_recovery_notification,
            ('email', 'update_notification'): self.on_user_email_update_notification,
        }

    async def run(self):
        if self.config['email']['mode'] == 'local':
            mail_sender_class = smtplib.LMTP
        elif self.config['email']['mode'] == 'smtp-ssl':
            mail_sender_class = smtplib.SMTP_SSL
        else:
            mail_sender_class = smtplib.SMTP

        self.mailer = mail_sender_class(
            host=self.config['email']['host'],
            port=self.config['email']['port'],
        )
        if self.config['email']['mode'] == 'smtp-starttls':
            self.mailer.starttls()
        if self.config['email']['auth'] is not None:
            self.mailer.login(
                user=self.config['email']['auth']['user'],
                password=self.config['email']['auth']['pass']
            )
        self.psql = await asyncpg.connect(
            user=self.config['database']['user'],
            password=self.config['database']['password'],
            host=self.config['database']['host'],
            database=self.config['database']['database']
        )
        self.psql.add_termination_listener(self.terminate_callback)
        self.psql.add_log_listener(self.log_callback)
        await self.psql.add_listener('email', self.notification_callback)

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
                self.logger.info(f'unhandled event {event!r}')
            else:
                await handler()

        await self.psql.remove_listener('email', self.notification_callback)
        await self.psql.close()

    def notification_callback(self, connection, pid, channel, payload):
        """ runs whenever we get a psql notification """
        assert connection is self.psql
        del pid  # unused
        self.events.put_nowait((channel, payload))

    def terminate_callback(self, connection):
        """ runs when the psql connection is closed """
        assert connection is self.psql
        self.logger.info('psql connection closed')
        self.events.clear()
        self.events.put_nowait(StopIteration)

    async def log_callback(self, connection, message):
        """ runs when psql sends a log message """
        assert connection is self.psql
        self.logger.info(f'psql log message: {message}')

    def send_email(self, *text_lines, subject, language, dest_address, dest_name):
        self.logger.info(f"sending email to {dest_address}, subject: {subject}")

        msg = email.message.EmailMessage()

        msg.set_content("\n".join(itertools.chain(
            self.greeting_lines(language, dest_name),
            text_lines,
            self.closing_lines(language)
        )))
        msg['Subject'] = f"{self.config['service']['name']}: {subject}"
        msg['To'] = dest_address
        msg['From'] = self.config['email']['address']
        self.mailer.send_message(msg)

    def greeting_lines(self, language, name):
        del language  # unused
        return f"Beloved {name},", ""

    def closing_lines(self, language):
        del language  # unused
        return (
            "",
            "Thoughtfully yours",
            "",
            f"    {self.config['service']['name']}"
        )

    async def on_user_registration_notification(self):
        unsent_mails = await self.psql.fetch("""
            SELECT
                email, username, language, token, valid_until
            FROM
                user_registration
            WHERE
                mail_sent is NULL;
        """)

        if not unsent_mails:
            self.logger.info("no user_registration mails are pending")

        for row in unsent_mails:
            self.send_email(
                "it looks like you are attempting to create a user account.",
                "",
                "To complete your registration, visit",
                "",
                f"{self.config['service']['url']}/complete_registration.html?token={row['token']}",
                "",
                f"Your request will time out {row['valid_until']}.",
                "If you do not want to create a user account, just ignore this email.",
                subject="Confirm user account",
                language=row['language'],
                dest_address=row['email'],
                dest_name=row['username'],
            )

            statement = await self.psql.prepare("""
                UPDATE
                    user_registration
                SET
                    mail_sent = NOW()
                WHERE
                    token = $1
            """)
            await statement.fetchval(row['token'])

    async def on_user_password_recovery_notification(self):
        unsent_mails = await self.psql.fetch("""
            SELECT
                user_password_recovery.token as token,
                user_password_recovery.valid_until as valid_until,
                user_account.username as username,
                user_account.email as email,
                user_account.language as language
            FROM
                user_password_recovery,
                user_account
            WHERE
                    user_password_recovery.mail_sent is NULL
                AND
                    user_password_recovery.valid_until > NOW()
                AND
                    user_account.id = user_password_recovery.user_id;
        """)

        if not unsent_mails:
            self.logger.info("no user_password_recovery mails are pending")

        for row in unsent_mails:
            self.send_email(
                "it looks like you forgot your password; how embarrasing.",
                "",
                "To set a new one, visit",
                "",
                f"{self.config['service']['url']}/password_reset.html?token={row['token']}",
                "",
                f"Your request will time out {row['valid_until']}.",
                "If you do not want to reset your password, just ignore this email.",
                subject="Reset password",
                language=row['language'],
                dest_address=row['email'],
                dest_name=row['username'],
            )

            statement = await self.psql.prepare("""
                UPDATE
                    user_password_recovery
                SET
                    mail_sent = NOW()
                WHERE
                    token = $1
            """)
            await statement.fetchval(row['token'])

    async def on_user_email_update_notification(self):
        unsent_mails = await self.psql.fetch("""
            SELECT
                user_email_update.token as token,
                user_email_update.valid_until as valid_until,
                user_email_update.new_email as new_email,
                user_account.username as username,
                user_account.email as old_email,
                user_account.language as language
            FROM
                user_email_update,
                user_account
            WHERE
                    user_email_update.mail_sent is NULL
                AND
                    user_email_update.valid_until > NOW()
                AND
                    user_account.id = user_email_update.user_id;
        """)

        if not unsent_mails:
            self.logger.info("no user_email_update mails are pending")

        for row in unsent_mails:
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
                language=row['language'],
                dest_address=row['new_email'],
                dest_name=row['username'],
            )

            self.send_email(
                "you want to change your email address",
                "",
                f"Your current email is: {row['old_email']}",
                f"You want to change it to: {row['new_email']}",
                "",
                "To confirm, visit",
                "",
                f"{self.config['service']['url']}/email_update.html?token={row['token']}",
                "",
                f"Your request will time out {row['valid_until']}.",
                "If you do not want to change your email, just ignore this email.",
                subject="Change email",
                language=row['language'],
                dest_address=row['new_email'],
                dest_name=row['username'],
            )

            statement = await self.psql.prepare("""
                UPDATE
                    user_email_update
                SET
                    mail_sent = NOW()
                WHERE
                    token = $1
            """)
            await statement.fetchval(row['token'])
