import logging
from getpass import getpass

from abrechnung.application.users import UserService
from abrechnung.config import Config
from abrechnung.framework.database import create_db_pool

logger = logging.getLogger(__name__)


async def create_user(config: Config, name: str, email: str, skip_email_check: bool):
    logger.info(f"Creating user with email: {email} and username: {name}")
    password = getpass(prompt="Input initial password for user:")
    repeat_password = getpass(prompt="Repeat password:")
    if password != repeat_password:
        print("Passwords do not match!")
        return

    db_pool = await create_db_pool(config.database)
    user_service = UserService(db_pool, config)
    user_service.enable_registration = True
    if skip_email_check:
        user_service.valid_email_domains = None
    await user_service.register_user(  # pylint: disable=missing-kwoa
        username=name,
        email=email,
        password=password,
    )
