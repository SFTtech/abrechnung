from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass
class GroupMember:
    user_id: int
    username: str
    is_owner: bool
    can_write: bool
    description: str
    joined_at: datetime
    invited_by: Optional[int]


@dataclass
class GroupInvite:
    id: int
    created_by: int
    token: str
    single_use: bool
    join_as_editor: bool
    description: str
    valid_until: datetime


@dataclass
class Group:
    id: int
    name: str
    description: str
    currency_symbol: str
    terms: str
    created_at: datetime
    created_by: int


@dataclass
class GroupLog:
    id: int
    user_id: int
    logged_at: datetime
    type: str
    message: str
    affected: Optional[int]


@dataclass
class GroupPreview:
    id: int
    name: str
    description: str
    currency_symbol: str
    terms: str
    created_at: datetime
    invite_single_use: bool
    invite_valid_until: datetime
    invite_description: str
