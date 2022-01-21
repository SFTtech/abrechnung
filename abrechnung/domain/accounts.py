from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional


class AccountType(Enum):
    personal = "personal"
    clearing = "clearing"


@dataclass
class AccountDetails:
    name: str
    description: str
    priority: int
    deleted: bool

    changed_by: int
    committed_at: Optional[datetime]

    clearing_shares: Optional[dict[int, float]] = field(default=None)


@dataclass
class Account:
    id: int
    group_id: int
    type: str
    is_wip: bool
    last_changed: datetime
    version: int
    committed_details: Optional[AccountDetails]
    pending_details: Optional[AccountDetails]
