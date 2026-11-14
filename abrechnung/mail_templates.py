"""
Rendering of the (plain text) emails sent by the mailer.

Templates live in ``abrechnung/templates/mail/<locale>/<name>.txt.mako``. Every template defines a ``subject`` block
and extends ``base.txt.mako`` for the greeting and closing. To translate the mails into another language add a new
``<locale>`` directory containing translated copies of the templates; missing templates fall back to ``en``.
"""

import re
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from mako.lookup import TemplateLookup

TEMPLATE_DIR = Path(__file__).parent / "templates" / "mail"
DEFAULT_LOCALE = "en"


def format_expiry(valid_until: datetime, now: datetime | None = None) -> str:
    """
    Human readable expiry time of a link.

    Timestamps coming from the database are timezone aware but would be shown to the recipient without any
    context, which made them look like they lie in the past if the recipient is not in UTC.
    Therefore always state the timezone explicitly and add the remaining time.
    """
    now = now or datetime.now(tz=timezone.utc)
    valid_until_utc = valid_until.astimezone(timezone.utc)
    remaining_minutes = max(int((valid_until_utc - now).total_seconds() // 60), 0)
    hours, minutes = divmod(remaining_minutes, 60)
    if hours > 0:
        remaining = f"{hours} hour{'s' if hours != 1 else ''}"
        if minutes > 0:
            remaining += f" {minutes} minute{'s' if minutes != 1 else ''}"
    else:
        remaining = f"{minutes} minute{'s' if minutes != 1 else ''}"
    return f"{valid_until_utc.strftime('%Y-%m-%d %H:%M')} UTC (in {remaining})"


@dataclass
class RenderedMail:
    subject: str
    body: str


class MailTemplates:
    def __init__(self, template_dir: Path = TEMPLATE_DIR):
        self.template_dir = template_dir
        self._lookups: dict[str, TemplateLookup] = {}

    def _get_lookup(self, locale: str) -> TemplateLookup:
        if locale not in self._lookups:
            # templates (and the base template they inherit from) which are missing in the locale fall back to english
            self._lookups[locale] = TemplateLookup(
                directories=[str(self.template_dir / locale), str(self.template_dir / DEFAULT_LOCALE)],
                input_encoding="utf-8",
                # plain text mails, nothing to escape
                default_filters=["str"],
                # fail loudly if a template uses a variable we did not provide
                strict_undefined=True,
                imports=["from abrechnung.mail_templates import format_expiry as expiry"],
            )
        return self._lookups[locale]

    def render(self, name: str, locale: str = DEFAULT_LOCALE, **context: Any) -> RenderedMail:
        # only allow plain locale identifiers so the locale can never be used to traverse directories
        if not re.fullmatch(r"[A-Za-z]{2,3}([_-][A-Za-z0-9]+)*", locale):
            locale = DEFAULT_LOCALE
        template = self._get_lookup(locale).get_template(f"{name}.txt.mako")
        subject = template.get_def("subject").render(**context).strip()
        return RenderedMail(subject=subject, body=template.render(**context))
