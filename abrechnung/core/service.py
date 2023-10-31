import asyncpg

from abrechnung.config import Config


class Service:
    def __init__(self, db_pool: asyncpg.Pool, config: Config):
        self.db_pool = db_pool
        self.cfg = config
