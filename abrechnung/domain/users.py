from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class Session(BaseModel):
    id: int
    name: str
    valid_until: Optional[datetime]
    last_seen: datetime


class User(BaseModel):
    id: int
    username: str
    email: str
    registered_at: datetime
    deleted: bool
    pending: bool
    sessions: list[Session]
    is_guest_user: bool
