from dataclasses import dataclass, field
from datetime import datetime, date
from enum import Enum
from typing import Optional

from pydantic import BaseModel


class AccountType(Enum):
    personal = "personal"
    clearing = "clearing"


ClearingShares = dict[int, float] | None


class AccountDetails(BaseModel):
    name: str
    description: str
    owning_user_id: Optional[int]
    date_info: Optional[date]
    deleted: bool

    tags: list[str]
    clearing_shares: ClearingShares = None


class Account(BaseModel):
    id: int
    group_id: int
    type: str
    is_wip: bool
    last_changed: datetime
    committed_details: Optional[AccountDetails]
    pending_details: Optional[AccountDetails]
