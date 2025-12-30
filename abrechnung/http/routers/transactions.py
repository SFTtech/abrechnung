from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel

from abrechnung.application.transactions import TransactionService
from abrechnung.domain.transactions import (
    CurrencyConversionRate,
    NewTransaction,
    Transaction,
    TransactionHistory,
    TransactionPosition,
    UpdateTransaction,
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


@router.get(
    "/v1/groups/{group_id}/transactions",
    summary="list all transactions in a group",
    response_model=list[Transaction],
    operation_id="list_transactions",
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
    "/v1/groups/{group_id}/transactions",
    summary="create a new transaction",
    response_model=Transaction,
    operation_id="create_transaction",
)
async def create_transaction(
    group_id: int,
    payload: NewTransaction,
    user: User = Depends(get_current_user),
    transaction_service: TransactionService = Depends(get_transaction_service),
):
    transaction_id = await transaction_service.create_transaction(
        user=user,
        group_id=group_id,
        transaction=payload,
    )

    return await transaction_service.get_transaction(user=user, transaction_id=transaction_id)


@router.get(
    "/v1/groups/{group_id}/transactions/{transaction_id}",
    summary="get transaction details",
    response_model=Transaction,
    operation_id="get_transaction",
)
async def get_transaction(
    group_id: int,
    transaction_id: int,
    user: User = Depends(get_current_user),
    transaction_service: TransactionService = Depends(get_transaction_service),
):
    return await transaction_service.get_transaction(user=user, transaction_id=transaction_id)


@router.get(
    "/v1/groups/{group_id}/transactions/{transaction_id}/history",
    summary="get transaction history",
    response_model=list[TransactionHistory],
    operation_id="get_transaction_history",
)
async def get_transaction_history(
    group_id: int,
    transaction_id: int,
    user: User = Depends(get_current_user),
    transaction_service: TransactionService = Depends(get_transaction_service),
):
    return await transaction_service.get_transaction_history(user=user, transaction_id=transaction_id)


@router.post(
    "/v1/groups/{group_id}/transactions/{transaction_id}",
    summary="update transaction details",
    response_model=Transaction,
    operation_id="update_transaction",
)
async def update_transaction(
    group_id: int,
    transaction_id: int,
    payload: UpdateTransaction,
    user: User = Depends(get_current_user),
    transaction_service: TransactionService = Depends(get_transaction_service),
):
    await transaction_service.update_transaction(
        user=user, transaction_id=transaction_id, transaction=payload, group_id=group_id
    )
    return await transaction_service.get_transaction(user=user, transaction_id=transaction_id)


class UpdatePositionsPayload(BaseModel):
    positions: list[TransactionPosition]


@router.post(
    "/v1/groups/{group_id}/transactions/{transaction_id}/positions",
    summary="update transaction positions",
    response_model=Transaction,
    operation_id="update_transaction_positions",
)
async def update_transaction_positions(
    group_id: int,
    transaction_id: int,
    payload: UpdatePositionsPayload,
    user: User = Depends(get_current_user),
    transaction_service: TransactionService = Depends(get_transaction_service),
):
    await transaction_service.update_transaction_positions(
        group_id=group_id,
        user=user,
        transaction_id=transaction_id,
        positions=payload.positions,
    )
    return await transaction_service.get_transaction(user=user, transaction_id=transaction_id)


@router.delete(
    "/v1/groups/{group_id}/transactions/{transaction_id}",
    summary="delete a transaction",
    response_model=Transaction,
    operation_id="delete_transaction",
)
async def delete_transaction(
    group_id: int,
    transaction_id: int,
    user: User = Depends(get_current_user),
    transaction_service: TransactionService = Depends(get_transaction_service),
):
    await transaction_service.delete_transaction(
        group_id=group_id,
        user=user,
        transaction_id=transaction_id,
    )
    return await transaction_service.get_transaction(user=user, transaction_id=transaction_id)


@router.get(
    "/v1/files/{file_id}/{blob_id}",
    summary="fetch the (binary) contents of a transaction attachment",
    operation_id="get_file_contents",
    response_class=Response,
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


@router.get(
    "/v1/{group_id}/currency-conversion-rates/{base_currency}",
    summary="get the currency conversion rate",
    response_model=CurrencyConversionRate,
    operation_id="get_currency_conversion_rates",
)
async def get_currency_conversion_rates(
    group_id: int,
    base_currency: str,
    user: User = Depends(get_current_user),
    transaction_service: TransactionService = Depends(get_transaction_service),
):
    return await transaction_service.currency_api.get_currency_conversion_rate(base_currency=base_currency)
