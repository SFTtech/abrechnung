from dataclasses import dataclass, field
from datetime import datetime, date
from enum import Enum
from typing import Optional


class AccountType(Enum):
    personal = "personal"
    clearing = "clearing"


ClearingShares = Optional[dict[int, float]]


@dataclass
class AccountDetails:
    name: str
    description: str
    owning_user_id: Optional[int]
    date_info: Optional[date]
    deleted: bool

    tags: list[str]
    clearing_shares: ClearingShares = field(default=None)


@dataclass
class Account:
    id: int
    group_id: int
    type: str
    is_wip: bool
    last_changed: datetime
    committed_details: Optional[AccountDetails]
    pending_details: Optional[AccountDetails]
