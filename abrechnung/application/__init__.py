from typing import Optional

import asyncpg
from asyncpg.pool import Pool

from abrechnung.config import Config
from abrechnung.domain.users import User
