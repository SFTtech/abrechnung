from datetime import date, datetime
from typing import List, Optional

from fastapi import APIRouter, status, Depends, HTTPException, UploadFile, Response
from pydantic import BaseModel

from abrechnung.application.transactions import TransactionService, RawTransaction
from abrechnung.domain.transactions import (
    TransactionShares,
    TransactionPosition,
    Transaction,
)
from abrechnung.domain.users import User
from abrechnung.http.auth import get_current_user
from abrechnung.http.dependencies import get_transaction_service

router = APIRouter(
    prefix="/api",
    tags=["transactions"],
    responses={
        status.HTTP_401_UNAUTHORIZED: {"description": "unauthorized"},
        status.HTTP_403_FORBIDDEN: {"description": "forbidden"},
        status.HTTP_404_NOT_FOUND: {"description": "Not found"},
    },
)


class TransactionPayload(BaseModel):
    name: str
    description: Optional[str]
    value: float
    currency_symbol: str
    currency_conversion_rate: float
    billed_at: date
    tags: List[str]
    creditor_shares: TransactionShares
    debitor_shares: TransactionShares
    positions: Optional[List[TransactionPosition]] = None


class UpdateTransactionPayload(TransactionPayload):
    deleted: bool = False


@router.get(
    "/v1/groups/{group_id}/transactions",
    summary="list all transactions in a group",
    response_model=list[Transaction],
)
async def list_transactions(
    group_id: int,
    min_last_changed: Optional[datetime] = None,
    transaction_ids: Optional[str] = None,
    user: User = Depends(get_current_user),
    transaction_service: TransactionService = Depends(get_transaction_service),
):
    forced_transaction_ids = None
    if transaction_ids:
        try:
            forced_transaction_ids = [int(x) for x in transaction_ids.split(",")]
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Invalid query param 'transaction_ids', must be a comma separated list of integers",
            )

    return await transaction_service.list_transactions(
        user=user,
        group_id=group_id,
        min_last_changed=min_last_changed,
        additional_transactions=forced_transaction_ids,
    )


@router.post(
    "/v1/groups/{group_id}/transactions/sync",
    summary="sync a batch of transactions",
    response_model=dict[int, int],
)
async def sync_transactions(
    group_id: int,
    payload: list[RawTransaction],
    user: User = Depends(get_current_user),
    transaction_service: TransactionService = Depends(get_transaction_service),
):
    return await transaction_service.sync_transactions(
        user=user, group_id=group_id, transactions=payload
    )


class TransactionCreatePayload(TransactionPayload):
    type: str
    perform_commit: bool = False


@router.post(
    "/v1/groups/{group_id}/transactions",
    summary="create a new transaction",
    response_model=Transaction,
)
async def create_transaction(
    group_id: int,
    payload: TransactionCreatePayload,
    user: User = Depends(get_current_user),
    transaction_service: TransactionService = Depends(get_transaction_service),
):
    transaction_id = await transaction_service.create_transaction(
        user=user,
        group_id=group_id,
        name=payload.name,
        description=payload.description,
        type=payload.type,
        currency_symbol=payload.currency_symbol,
        currency_conversion_rate=payload.currency_conversion_rate,
        billed_at=payload.billed_at,
        tags=payload.tags,
        value=payload.value,
        creditor_shares=payload.creditor_shares,
        debitor_shares=payload.debitor_shares,
        positions=payload.positions,
        perform_commit=payload.perform_commit,
    )

    return await transaction_service.get_transaction(
        user=user, transaction_id=transaction_id
    )


@router.get(
    "/v1/transactions/{transaction_id}",
    summary="get transaction details",
    response_model=Transaction,
)
async def get_transaction(
    transaction_id: int,
    user: User = Depends(get_current_user),
    transaction_service: TransactionService = Depends(get_transaction_service),
):
    return await transaction_service.get_transaction(
        user=user, transaction_id=transaction_id
    )


class TransactionUpdatePayload(UpdateTransactionPayload):
    perform_commit: bool = False


@router.post(
    "/v1/transactions/{transaction_id}",
    summary="update transaction details",
    response_model=Transaction,
)
async def update_transaction(
    transaction_id: int,
    payload: TransactionUpdatePayload,
    user: User = Depends(get_current_user),
    transaction_service: TransactionService = Depends(get_transaction_service),
):
    await transaction_service.update_transaction(
        user=user,
        transaction_id=transaction_id,
        value=payload.value,
        name=payload.name,
        description=payload.description,
        currency_symbol=payload.currency_symbol,
        currency_conversion_rate=payload.currency_conversion_rate,
        billed_at=payload.billed_at,
        tags=payload.tags,
        creditor_shares=payload.creditor_shares,
        debitor_shares=payload.debitor_shares,
        positions=payload.positions,
        perform_commit=payload.perform_commit,
    )
    return await transaction_service.get_transaction(
        user=user, transaction_id=transaction_id
    )


class UpdatePositionsPayload(BaseModel):
    positions: list[TransactionPosition]
    perform_commit: bool = False


@router.post(
    "/v1/transactions/{transaction_id}/positions",
    summary="update transaction positions",
    response_model=Transaction,
)
async def update_transaction_positions(
    transaction_id: int,
    payload: UpdatePositionsPayload,
    user: User = Depends(get_current_user),
    transaction_service: TransactionService = Depends(get_transaction_service),
):
    await transaction_service.update_transaction_positions(
        user=user,
        transaction_id=transaction_id,
        positions=payload.positions,
        perform_commit=payload.perform_commit,
    )
    return await transaction_service.get_transaction(
        user=user, transaction_id=transaction_id
    )


@router.post(
    "/v1/transactions/{transaction_id}/commit",
    summary="commit currently pending transaction changes",
    response_model=Transaction,
)
async def commit_transaction(
    transaction_id: int,
    user: User = Depends(get_current_user),
    transaction_service: TransactionService = Depends(get_transaction_service),
):
    await transaction_service.commit_transaction(
        user=user,
        transaction_id=transaction_id,
    )
    return await transaction_service.get_transaction(
        user=user, transaction_id=transaction_id
    )


@router.delete(
    "/v1/transactions/{transaction_id}",
    summary="delete a transaction",
    response_model=Transaction,
)
async def delete_transaction(
    transaction_id: int,
    user: User = Depends(get_current_user),
    transaction_service: TransactionService = Depends(get_transaction_service),
):
    await transaction_service.delete_transaction(
        user=user,
        transaction_id=transaction_id,
    )
    return await transaction_service.get_transaction(
        user=user, transaction_id=transaction_id
    )


@router.post(
    "/v1/transactions/{transaction_id}/new_change",
    summary="create a new pending transaction revision",
    response_model=Transaction,
)
async def create_transaction_change(
    transaction_id: int,
    user: User = Depends(get_current_user),
    transaction_service: TransactionService = Depends(get_transaction_service),
):
    await transaction_service.create_transaction_change(
        user=user,
        transaction_id=transaction_id,
    )
    return await transaction_service.get_transaction(
        user=user, transaction_id=transaction_id
    )


@router.post(
    "/v1/transactions/{transaction_id}/discard",
    summary="discard currently pending transaction changes",
    response_model=Transaction,
)
async def discard_transaction_change(
    transaction_id: int,
    user: User = Depends(get_current_user),
    transaction_service: TransactionService = Depends(get_transaction_service),
):
    await transaction_service.discard_transaction_changes(
        user=user,
        transaction_id=transaction_id,
    )
    return await transaction_service.get_transaction(
        user=user, transaction_id=transaction_id
    )


@router.post(
    "/v1/transactions/{transaction_id}/files",
    summary="upload a file as a transaction attachment",
    response_model=Transaction,
)
async def upload_file(
    transaction_id: int,
    file: UploadFile,
    user: User = Depends(get_current_user),
    transaction_service: TransactionService = Depends(get_transaction_service),
):
    try:
        content = await file.read()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot read uploaded file: {e}",
        )

    await transaction_service.upload_file(
        user=user,
        transaction_id=transaction_id,
        filename=file.filename,
        mime_type=file.content_type,
        content=content,
    )
    return await transaction_service.get_transaction(
        user=user, transaction_id=transaction_id
    )


@router.delete(
    r"/v1/files/{file_id}",
    summary="delete a transaction attachment",
    response_model=Transaction,
)
async def delete_file(
    file_id: int,
    user: User = Depends(get_current_user),
    transaction_service: TransactionService = Depends(get_transaction_service),
):
    transaction_id, revision_id = await transaction_service.delete_file(
        user=user,
        file_id=file_id,
    )
    return await transaction_service.get_transaction(
        user=user, transaction_id=transaction_id
    )


@router.get(
    "/v1/files/{file_id}/{blob_id}",
    summary="fetch the (binary) contents of a transaction attachment",
)
async def get_file_contents(
    file_id: int,
    blob_id: int,
    user: User = Depends(get_current_user),
    transaction_service: TransactionService = Depends(get_transaction_service),
):
    mime_type, content = await transaction_service.read_file_contents(
        user=user,
        file_id=file_id,
        blob_id=blob_id,
    )

    return Response(content=content, media_type=mime_type)
