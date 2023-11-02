from datetime import date, datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel


class TransactionType(Enum):
    mimo = "mimo"
    purchase = "purchase"
    transfer = "transfer"


TransactionShares = dict[int, float]


class TransactionPosition(BaseModel):
    id: int

    name: str
    price: float
    communist_shares: float
    # usages map account IDs to portions of the item share pool
    usages: TransactionShares

    deleted: bool = False


class TransactionDetails(BaseModel):
    name: str
    description: str | None
    value: float
    currency_symbol: str
    currency_conversion_rate: float
    billed_at: date
    tags: list[str]
    deleted: bool

    # creditor and debitor shares map account IDs to portions of the communist share pool
    creditor_shares: TransactionShares
    debitor_shares: TransactionShares


class FileAttachment(BaseModel):
    id: int
    filename: str
    blob_id: int | None
    mime_type: str | None
    host_url: str | None = None
    deleted: bool


class Transaction(BaseModel):
    id: int
    group_id: int
    type: str
    is_wip: bool
    last_changed: datetime
    committed_details: TransactionDetails | None
    pending_details: TransactionDetails | None

    committed_positions: list[TransactionPosition] | None = None
    pending_positions: list[TransactionPosition] | None = None

    committed_files: list[FileAttachment] | None = None
    pending_files: list[FileAttachment] | None = None
