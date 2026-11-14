"""
Reset the e2e database to a clean state, apply all migrations and create the users used by the e2e tests.

Usage: python prepare_db.py <path to config.yaml>
"""

import asyncio
import sys
from pathlib import Path

import email_validator

from abrechnung.application.users import UserService
from abrechnung.config import read_config
from abrechnung.database.migrations import get_database, reset_schema

# do not require the email domains of the test users to resolve via dns
email_validator.TEST_ENVIRONMENT = True  # ty: ignore[invalid-assignment]

E2E_USERS = [
    ("e2e-user", "e2e-user@example.lol", "e2e-password-1"),
]


async def main(config_path: Path) -> None:
    config = read_config(config_path)
    database = get_database(config.database)
    pool = await database.create_pool()
    await reset_schema(pool)
    await database.apply_migrations()

    user_service = UserService(pool, config)
    user_service.enable_registration = True
    user_service.valid_email_domains = None
    for username, email, password in E2E_USERS:
        await user_service.register_user(  # pylint: disable=missing-kwoa
            username=username,
            email=email,
            password=password,
            requires_email_confirmation=False,
        )
    await pool.close()


if __name__ == "__main__":
    asyncio.run(main(Path(sys.argv[1])))
