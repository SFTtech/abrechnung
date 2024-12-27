import logging
from datetime import datetime

from abrechnung.config import Config
from abrechnung.database.migrations import get_database

logger = logging.getLogger(__name__)


async def cleanup(config: Config):
    if not config.demo.enabled:
        logger.error("This instance is not running in demo mode, exiting")
        return

    deletion_threshold = datetime.now() - config.demo.wipe_interval

    database = get_database(config.database)
    db_pool = await database.create_pool()
    async with db_pool.acquire() as conn:
        async with conn.transaction():
            n_rows_groups = await conn.fetchval(
                "delete from grp where id in ( "
                "   select g.id from grp g "
                "   join group_membership gm on gm.group_id = grp.id "
                "   join usr on usr.id = gm.user_id "
                "   where registered_at <= $1"
                ") returning *",
                deletion_threshold,
            )

            n_rows_users = await conn.fetchval(
                "delete from usr where registered_at <= $1 returning *",
                deletion_threshold,
            )

            n_deleted = (n_rows_groups or 0) + (n_rows_users or 0)
            logger.info(f"Deleted demo users and groups, a total of {n_deleted} database rows")
