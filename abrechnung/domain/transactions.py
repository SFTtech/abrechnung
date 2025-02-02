from datetime import date, datetime
from enum import Enum

from pydantic import BaseModel, field_validator, model_validator

ALLOWED_FILETYPES = ["image/jpeg", "image/png", "image/bmp", "image/webp"]


class TransactionType(Enum):
    mimo = "mimo"
    purchase = "purchase"
    transfer = "transfer"


TransactionShares = dict[int, float]


class NewTransactionPosition(BaseModel):
    name: str
    price: float
    communist_shares: float
    # usages map account IDs to portions of the item share pool
    usages: TransactionShares


class TransactionPosition(NewTransactionPosition):
    id: int
    deleted: bool


class FileAttachment(BaseModel):
    id: int
    filename: str
    blob_id: int | None
    mime_type: str | None
    host_url: str | None = None
    deleted: bool


class NewFile(BaseModel):
    filename: str
    mime_type: str
    # base64 encoded file content
    content: str

    @field_validator("mime_type")
    @classmethod
    def check_mime_type_is_allowed(cls, v: str) -> str:
        if v not in ALLOWED_FILETYPES:
            raise ValueError(f"File type {v} is not an accepted file type")
        return v


class UpdateFile(BaseModel):
    id: int
    filename: str
    deleted: bool


class NewTransaction(BaseModel):
    type: TransactionType
    name: str
    description: str
    value: float
    currency_symbol: str
    currency_conversion_rate: float
    billed_at: date
    tags: list[str] = []

    creditor_shares: TransactionShares
    debitor_shares: TransactionShares

    new_files: list[NewFile] = []
    new_positions: list[NewTransactionPosition] = []

    @model_validator(mode="after")
    def check_purchase_has_new_positions(self):
        if self.type != TransactionType.purchase and len(self.new_positions) > 0:
            raise ValueError("only purchases can have positions")
        return self


class UpdateTransaction(NewTransaction):
    changed_files: list[UpdateFile] = []
    changed_positions: list[TransactionPosition] = []

    @model_validator(mode="after")
    def check_purchase_has_changed_positions(self):
        if self.type != TransactionType.purchase and len(self.changed_positions) > 0:
            raise ValueError("only purchases can have positions")
        return self


class Transaction(BaseModel):
    id: int
    group_id: int
    type: TransactionType
    name: str
    description: str
    value: float
    currency_symbol: str
    currency_conversion_rate: float
    billed_at: date
    tags: list[str]
    deleted: bool

    # creditor and debitor shares map account IDs to portions of the communist share pool
    creditor_shares: TransactionShares
    debitor_shares: TransactionShares
    last_changed: datetime

    positions: list[TransactionPosition]
    files: list[FileAttachment]


class TransactionHistory(BaseModel):
    revision_id: int
    changed_by: int  # user id of changing user
    changed_at: datetime
