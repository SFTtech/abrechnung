from dataclasses import dataclass, field
from datetime import datetime, date
from enum import Enum
from typing import Optional


class TransactionType(Enum):
    mimo = "mimo"
    purchase = "purchase"
    transfer = "transfer"


@dataclass
class TransactionPosition:
    id: int

    name: str
    price: float
    communist_shares: float
    deleted: bool

    # usages map account IDs to portions of the item share pool
    usages: dict[int, float]


@dataclass
class TransactionDetails:
    description: str
    value: float
    currency_symbol: str
    currency_conversion_rate: float
    billed_at: date
    deleted: bool

    changed_by: int
    committed_at: Optional[datetime]

    # creditor and debitor shares map account IDs to portions of the communist share pool
    creditor_shares: dict[int, float]
    debitor_shares: dict[int, float]


@dataclass
class Transaction:
    id: int
    type: str
    is_wip: bool
    committed_details: Optional[TransactionDetails]
    # pending maps user ID to pending detail state
    pending_details: Optional[TransactionDetails]

    committed_positions: Optional[list[TransactionPosition]] = field(default=None)
    # pending maps user ID to list of pending positions
    pending_positions: Optional[list[TransactionPosition]] = field(default=None)
