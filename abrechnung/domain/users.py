from dataclasses import dataclass
from datetime import datetime


@dataclass
class User:
    id: int
    username: str
    email: str
    registered_at: datetime
    deleted: bool
    pending: bool
