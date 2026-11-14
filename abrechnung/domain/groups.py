from datetime import datetime
from typing import Any

from pydantic import BaseModel


class GroupMember(BaseModel):
    user_id: int
    username: str
    is_owner: bool
    can_write: bool
    description: str
    joined_at: datetime
    invited_by: int | None
    owned_account_id: int | None


class GroupInvite(BaseModel):
    id: int
    created_by: int
    token: str | None
    single_use: bool
    join_as_editor: bool
    description: str
    valid_until: datetime | None


class Group(BaseModel):
    id: int
    name: str
    description: str
    currency_identifier: str
    terms: str
    add_user_account_on_join: bool
    created_at: datetime
    created_by: int
    last_changed: datetime
    archived: bool
    is_owner: bool
    can_write: bool
    owned_account_id: int | None


class GroupLog(BaseModel):
    id: int
    user_id: int
    username: str
    logged_at: datetime
    type: str
    # only used as a fallback for entries created before log entries became structured
    message: str
    affected: int | None
    affected_username: str | None
    transaction_id: int | None
    account_id: int | None
    # whether the referenced transaction / account is currently deleted (false if there is no reference)
    transaction_deleted: bool
    account_deleted: bool
    # snapshot of relevant data of the logged item (e.g. name, value, currency_identifier)
    data: dict[str, Any]


class GroupPreview(BaseModel):
    id: int
    is_already_member: bool
    name: str
    description: str
    currency_identifier: str
    terms: str
    created_at: datetime
    invite_single_use: bool
    invite_valid_until: datetime | None
    invite_description: str
