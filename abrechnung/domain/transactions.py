from dataclasses import dataclass
from datetime import datetime, date
from enum import Enum
from typing import Optional


class TransactionType(Enum):
    mimo = "mimo"
    purchase = "purchase"
    transfer = "transfer"


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
    current_state: Optional[TransactionDetails]
    pending_changes: Optional[dict[int, TransactionDetails]]
    # created_by: int


@dataclass
class PurchaseItemDetails:
    name: str
    price: float
    communist_shares: float
    deleted: bool

    # usages map account IDs to portions of the item share pool
    usages: dict[int, float]


@dataclass
class PurchaseItem:
    id: int

    current_state: Optional[PurchaseItemDetails]
    pending_changes: Optional[dict[int, PurchaseItemDetails]]
