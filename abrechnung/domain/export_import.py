from datetime import date
from typing import Literal

from pydantic import BaseModel

from abrechnung.domain.accounts import ClearingShares
from abrechnung.domain.transactions import SplitMode, TransactionShares, TransactionType


class PersonalAccountJsonExportV1(BaseModel):
    id: int
    name: str
    description: str


class ClearingAccountJsonExportV1(BaseModel):
    id: int
    name: str
    description: str
    date_info: date

    tags: list[str]
    clearing_shares: ClearingShares


class FileAttachmentJsonExportV1(BaseModel):
    filename: str
    mime_type: str
    # base64 encoded file content
    content: str


class TransactionPositionJsonExportV1(BaseModel):
    id: int
    name: str
    price: float
    communist_shares: float
    usages: TransactionShares


class TransactionJsonExportV1(BaseModel):
    id: int
    type: TransactionType
    name: str
    description: str
    value: float
    currency_identifier: str
    currency_conversion_rate: float
    billed_at: date
    tags: list[str]

    split_mode: SplitMode = SplitMode.shares

    creditor_shares: TransactionShares
    debitor_shares: TransactionShares

    positions: list[TransactionPositionJsonExportV1]
    files: list[FileAttachmentJsonExportV1]


class GroupMetadataExportV1(BaseModel):
    name: str
    description: str
    currency_identifier: str
    terms: str
    add_user_account_on_join: bool


class GroupJsonExportV1(BaseModel):
    version: Literal[1] = 1

    metadata: GroupMetadataExportV1

    personal_accounts: list[PersonalAccountJsonExportV1]
    events: list[ClearingAccountJsonExportV1]
    transactions: list[TransactionJsonExportV1]
