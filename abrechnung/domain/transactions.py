import dataclasses
from dataclasses import dataclass
from enum import Enum
from typing import Optional


class Transaction:
    class Type(Enum):
        mimo = 1
        purchase = 2
        transfer = 3

        @classmethod
        def is_valid_type(cls, type_name: str) -> bool:
            return hasattr(cls, type_name)

    @dataclass
    class EditableTransactionDetails:
        description: str
        value: float
        currency_symbol: str
        currency_conversion_rate: float
        deleted: bool

        # version of the transaction details
        commit_id: int

        # creditor and debitor shares map account IDs to portions of the communist share pool
        creditor_shares: dict[int, float]
        debitor_shares: dict[int, float]

    def __init__(
        self,
        originating_user_id: int,
        group_id: int,
        type: Type,
        description: str,
        currency_symbol: str,
        currency_conversion_rate: float,
        value: float,
    ):
        self.group_id = group_id
        self.type = type
        self.editable_details: Optional[Transaction.EditableTransactionDetails] = None

        # map of a user ID to his pending transaction changes
        self.pending_changes: dict[int, "Transaction.EditableTransactionDetails"] = {
            originating_user_id: self.EditableTransactionDetails(
                description=description,
                currency_symbol=currency_symbol,
                currency_conversion_rate=currency_conversion_rate,
                value=value,
                commit_id=0,
                deleted=False,
                creditor_shares={},
                debitor_shares={},
            )
        }

        self.created_by = originating_user_id
        self.deleted = False

    def has_pending_change(self, user_id: int) -> bool:
        return user_id in self.pending_changes
