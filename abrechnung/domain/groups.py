from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class GroupMember(BaseModel):
    user_id: int
    username: str
    is_owner: bool
    can_write: bool
    description: str
    joined_at: datetime
    invited_by: Optional[int]


class GroupInvite(BaseModel):
    id: int
    created_by: int
    token: Optional[str]
    single_use: bool
    join_as_editor: bool
    description: str
    valid_until: datetime


class Group(BaseModel):
    id: int
    name: str
    description: str
    currency_symbol: str
    terms: str
    add_user_account_on_join: bool
    created_at: datetime
    created_by: int
    last_changed: datetime
    archived: bool
    is_owner: bool
    can_write: bool


class GroupLog(BaseModel):
    id: int
    user_id: int
    logged_at: datetime
    type: str
    message: str
    affected: Optional[int]


class GroupPreview(BaseModel):
    id: int
    name: str
    description: str
    currency_symbol: str
    terms: str
    created_at: datetime
    invite_single_use: bool
    invite_valid_until: datetime
    invite_description: str
