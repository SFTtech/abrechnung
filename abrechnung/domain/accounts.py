from dataclasses import dataclass
from enum import Enum


class AccountType(Enum):
    personal = "personal"


@dataclass
class Account:
    id: int
    type: str
    name: str
    description: str
    priority: int
    # created_by: int
    deleted: bool
