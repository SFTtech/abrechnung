from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass
class Session:
    id: int
    name: str
    valid_until: Optional[datetime]
    last_seen: datetime


@dataclass
class User:
    id: int
    username: str
    email: str
    registered_at: datetime
    deleted: bool
    pending: bool
    sessions: list[Session]
    is_guest_user: bool
