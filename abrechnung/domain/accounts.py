from datetime import date, datetime
from enum import Enum
from typing import Literal

from pydantic import BaseModel


class AccountType(Enum):
    personal = "personal"
    clearing = "clearing"


ClearingShares = dict[int, float]


class NewAccount(BaseModel):
    type: AccountType
    name: str
    description: str = ""
    date_info: date | None = None
    deleted: bool = False

    tags: list[str] = []
    clearing_shares: ClearingShares = {}


class ClearingAccount(BaseModel):
    id: int
    group_id: int
    type: Literal["clearing"]
    name: str
    description: str
    date_info: date

    tags: list[str]
    clearing_shares: ClearingShares
    last_changed: datetime

    deleted: bool


class PersonalAccount(BaseModel):
    id: int
    group_id: int
    type: Literal["personal"]
    name: str
    description: str
    deleted: bool

    last_changed: datetime


Account = ClearingAccount | PersonalAccount
