from dataclasses import dataclass
from datetime import datetime
from enum import Enum


class AccountType(Enum):
    personal = "personal"


@dataclass
class Account:
    id: int
    group_id: int
    type: str
    name: str
    description: str
    priority: int
    version: int
    last_changed: datetime
    # created_by: int
    deleted: bool
