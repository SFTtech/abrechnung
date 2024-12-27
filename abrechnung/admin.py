import logging
from getpass import getpass

from abrechnung.application.users import UserService
from abrechnung.config import Config
from abrechnung.database.migrations import get_database

logger = logging.getLogger(__name__)


async def create_user(config: Config, name: str, email: str, skip_email_check: bool, no_email_confirmation: bool):
    logger.info(f"Creating user with email: {email} and username: {name}")
    password = getpass(prompt="Input initial password for user:")
    repeat_password = getpass(prompt="Repeat password:")
    if password != repeat_password:
        print("Passwords do not match!")
        return

    database = get_database(config.database)
    db_pool = await database.create_pool()
    user_service = UserService(db_pool, config)
    user_service.enable_registration = True
    if skip_email_check:
        user_service.valid_email_domains = None
    await user_service.register_user(  # pylint: disable=missing-kwoa
        username=name, email=email, password=password, requires_email_confirmation=not no_email_confirmation
    )
