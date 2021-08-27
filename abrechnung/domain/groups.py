from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass
class GroupMember:
    user_id: int
    username: str
    is_owner: bool
    can_write: bool
    joined_at: datetime
    invited_by: Optional[int]


@dataclass
class GroupInvite:
    id: int
    created_by: int
    token: str
    single_use: bool
    description: str
    valid_until: datetime


@dataclass
class Group:
    name: str
    description: str
    currency_symbol: str
    terms: str
    created_at: datetime
