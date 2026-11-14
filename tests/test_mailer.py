# pylint: disable=attribute-defined-outside-init,missing-kwoa
import asyncio
import email
import email.policy
import re
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, AsyncGenerator, Optional

import pytest
from aiosmtpd import smtp
from aiosmtpd.controller import Controller
from asyncpg import Pool
from sftkit.error import AccessDenied

from abrechnung.application.users import UserService
from abrechnung.config import Config
from abrechnung.mail_templates import MailTemplates, format_expiry
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


def mail_body(mail: smtp.Envelope) -> str:
    message = email.message_from_string(decode(mail.content), policy=email.policy.default)  # decodes transfer encodings
    return message.get_content().replace("\r\n", "\n")


def extract_link(mail: smtp.Envelope, path: str) -> str:
    match = re.search(rf"^(\S+/{path}/\S+)$", mail_body(mail), flags=re.MULTILINE)
    assert match is not None, f"no {path} link found in mail"
    return match.group(1)


def extract_expiry_line(mail: smtp.Envelope) -> str:
    match = re.search(r"^Your request will time out at (.+)\.$", mail_body(mail), flags=re.MULTILINE)
    assert match is not None, "no expiry line found in mail"
    return match.group(1)


async def test_registration_mail_link_confirms_registration(test_fixture: TestFixtures, db_pool: Pool):
    user_id = await test_fixture.user_service.register_user(
        username="link-user", email="link-user@email.com", password="password"
    )
    await asyncio.sleep(0.5)

    mail = test_fixture.smtp.mail_queue.get_nowait()
    link = extract_link(mail, "confirm-registration")
    token = await db_pool.fetchval("select token from pending_registration where user_id = $1", user_id)
    assert link == f"{test_fixture.config.api.base_url}/confirm-registration/{token}"

    assert await test_fixture.user_service.confirm_registration(token=link.rsplit("/", 1)[1]) == user_id
    assert await db_pool.fetchval("select pending from usr where id = $1", user_id) is False


async def test_registration_mail_expiry_is_in_the_future_and_in_utc(test_fixture: TestFixtures):
    await test_fixture.user_service.register_user(username="expiry-user", email="expiry-user@email.com", password="pw")
    await asyncio.sleep(0.5)

    expiry = extract_expiry_line(test_fixture.smtp.mail_queue.get_nowait())
    match = re.fullmatch(r"(\d{4}-\d{2}-\d{2} \d{2}:\d{2}) UTC \(in .+\)", expiry)
    assert match is not None, expiry
    valid_until = datetime.strptime(match.group(1), "%Y-%m-%d %H:%M").replace(tzinfo=timezone.utc)
    now = datetime.now(tz=timezone.utc)
    assert now < valid_until <= now + timedelta(hours=1, minutes=1)


def test_base_url_trailing_slash_is_stripped():
    config = TEST_CONFIG.model_copy(deep=True)
    config.api.base_url = "https://abrechnung.example.lol/"
    assert Mailer(config=config).base_url == "https://abrechnung.example.lol"


async def test_expired_registration_is_not_mailed(test_fixture: TestFixtures, db_pool: Pool):
    user_id = await test_fixture.user_service.register_user(
        username="expired-user", email="expired-user@email.com", password="password"
    )
    # drain the mail that was already sent, then expire the registration and request another mailing
    await asyncio.sleep(0.5)
    test_fixture.smtp.mail_queue.get_nowait()
    token = await db_pool.fetchval(
        "update pending_registration set valid_until = now() - interval '1 minute', mail_next_attempt = now() "
        "where user_id = $1 returning token",
        user_id,
    )
    await asyncio.sleep(0.5)
    assert test_fixture.smtp.mail_queue.empty()

    with pytest.raises(AccessDenied):
        await test_fixture.user_service.confirm_registration(token=str(token))


async def test_password_recovery_mail_link(test_fixture: TestFixtures, create_test_user: CreateTestUser, db_pool: Pool):
    user, _ = await create_test_user()
    await test_fixture.user_service.request_password_recovery(email=user.email)
    await asyncio.sleep(0.5)

    mail = test_fixture.smtp.mail_queue.get_nowait()
    link = extract_link(mail, "confirm-password-recovery")
    token = await db_pool.fetchval("select token from pending_password_recovery where user_id = $1", user.id)
    assert link == f"{test_fixture.config.api.base_url}/confirm-password-recovery/{token}"
    assert extract_expiry_line(mail).endswith(")")


async def test_email_change_only_new_address_gets_the_link(
    test_fixture: TestFixtures, create_test_user: CreateTestUser, db_pool: Pool
):
    new_email = "changed@email.com"
    user, password = await create_test_user()
    await test_fixture.user_service.request_email_change(user=user, password=password, email=new_email)
    await asyncio.sleep(0.5)

    mails = [test_fixture.smtp.mail_queue.get_nowait(), test_fixture.smtp.mail_queue.get_nowait()]
    to_new = next(m for m in mails if new_email in m.rcpt_tos)
    to_old = next(m for m in mails if user.email in m.rcpt_tos)
    token = await db_pool.fetchval("select token from pending_email_change where user_id = $1", user.id)
    assert extract_link(to_new, "confirm-email-change") == (
        f"{test_fixture.config.api.base_url}/confirm-email-change/{token}"
    )
    assert "confirm-email-change" not in decode(to_old.content)


def test_format_expiry_states_utc_and_remaining_time():
    now = datetime(2026, 1, 1, 12, 0, tzinfo=timezone.utc)
    cest = timezone(timedelta(hours=2))

    assert format_expiry(now + timedelta(hours=1), now) == "2026-01-01 13:00 UTC (in 1 hour)"
    assert format_expiry(now + timedelta(hours=2, minutes=30), now) == "2026-01-01 14:30 UTC (in 2 hours 30 minutes)"
    assert format_expiry(now + timedelta(minutes=1), now) == "2026-01-01 12:01 UTC (in 1 minute)"
    # non-UTC timestamps are converted so that the stated timezone is always correct
    assert format_expiry((now + timedelta(hours=1)).astimezone(cest), now) == "2026-01-01 13:00 UTC (in 1 hour)"
    # already expired links never show negative durations
    assert format_expiry(now - timedelta(minutes=5), now) == "2026-01-01 11:55 UTC (in 0 minutes)"


TEMPLATE_CONTEXT: dict[str, Any] = {
    "username": "bob",
    "service_name": "Test Abrechnung",
    "base_url": "https://abrechnung.example.lol",
    "token": "some-token",
    "old_email": "old@email.com",
    "new_email": "new@email.com",
    "valid_until": datetime(2026, 1, 1, 13, 0, tzinfo=timezone.utc),
}


@pytest.mark.parametrize(
    ("template", "subject", "link"),
    [
        ("confirm_registration", "Confirm user account", "/confirm-registration/some-token"),
        ("password_recovery", "Reset password", "/confirm-password-recovery/some-token"),
        ("email_change_confirm", "Change email", "/confirm-email-change/some-token"),
        ("email_change_notice", "Change email", None),
    ],
)
def test_mail_templates_render(template: str, subject: str, link: str | None):
    mail = MailTemplates().render(template, **TEMPLATE_CONTEXT)

    assert mail.subject == subject
    assert mail.body.startswith("Beloved bob,\n\n")
    assert mail.body.endswith("\n\nThoughtfully yours\n\n    Test Abrechnung\n")
    assert "2026-01-01 13:00 UTC" in mail.body
    if link is None:
        assert "https://" not in mail.body
    else:
        assert f"\n\nhttps://abrechnung.example.lol{link}\n\n" in mail.body


def test_mail_templates_fall_back_to_english_for_unknown_locales():
    templates = MailTemplates()
    english = templates.render("password_recovery", **TEMPLATE_CONTEXT)

    assert templates.render("password_recovery", locale="xx", **TEMPLATE_CONTEXT) == english
    # locales can not be abused for path traversal
    assert templates.render("password_recovery", locale="../../..", **TEMPLATE_CONTEXT) == english


def test_mail_templates_fail_on_missing_variables():
    with pytest.raises(NameError):
        MailTemplates().render("confirm_registration", username="bob")


def test_mail_templates_use_translated_template_if_present(tmp_path):
    (tmp_path / "en").mkdir()
    (tmp_path / "de").mkdir()
    (tmp_path / "en" / "base.txt.mako").write_text("EN ${capture(next.body) | trim}")
    (tmp_path / "de" / "base.txt.mako").write_text("DE ${capture(next.body) | trim}")
    for locale in ("en", "de"):
        (tmp_path / locale / "hello.txt.mako").write_text(
            '<%inherit file="base.txt.mako"/><%def name="subject()">Hi</%def>x'
        )
    (tmp_path / "en" / "only_english.txt.mako").write_text(
        '<%inherit file="base.txt.mako"/><%def name="subject()">S</%def>y'
    )
    templates = MailTemplates(template_dir=tmp_path)

    assert templates.render("hello", locale="de").body == "DE x"
    assert templates.render("hello").body == "EN x"
    # missing translations fall back to the english template, which is rendered with the english base
    assert templates.render("only_english", locale="de").body == "DE y"
