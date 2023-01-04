from datetime import date
from typing import List, Optional, Dict

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel

from abrechnung.application.accounts import AccountService
from abrechnung.domain.accounts import Account, ClearingShares
from abrechnung.domain.users import User
from abrechnung.http.auth import get_current_user
from abrechnung.http.dependencies import get_account_service

router = APIRouter(
    prefix="/api",
    tags=["accounts"],
    responses={
        status.HTTP_401_UNAUTHORIZED: {"description": "unauthorized"},
        status.HTTP_403_FORBIDDEN: {"description": "forbidden"},
        status.HTTP_404_NOT_FOUND: {"description": "Not found"},
    },
)


@router.get(
    r"/v1/groups/{group_id}/accounts",
    summary="list all accounts in a group",
    response_model=List[Account],
)
async def list_accounts(
    group_id: int,
    user: User = Depends(get_current_user),
    account_service: AccountService = Depends(get_account_service),
):
    return await account_service.list_accounts(user=user, group_id=group_id)


class BaseAccountPayload(BaseModel):
    name: str
    description: str
    date_info: Optional[date] = None
    tags: Optional[List[str]] = None
    owning_user_id: Optional[int] = None
    clearing_shares: ClearingShares


class CreateAccountPayload(BaseAccountPayload):
    type: str


class UpdateAccountPayload(BaseAccountPayload):
    deleted: bool = False


class AccountPayloadWithId(UpdateAccountPayload):
    id: int


@router.post(
    r"/v1/groups/{group_id}/accounts/sync",
    summary="update a collection of accounts",
    response_model=Dict[int, int],
)
async def sync_accounts(
    group_id: int,
    payload: List[AccountPayloadWithId],
    user: User = Depends(get_current_user),
    account_service: AccountService = Depends(get_account_service),
):
    return await account_service.sync_accounts(
        user=user,
        group_id=group_id,
        accounts=payload,
    )


@router.post(
    r"/v1/groups/{group_id}/accounts",
    summary="create a new group account",
    response_model=Account,
)
async def create_account(
    group_id: int,
    payload: CreateAccountPayload,
    user: User = Depends(get_current_user),
    account_service: AccountService = Depends(get_account_service),
):
    account_id = await account_service.create_account(
        user=user,
        group_id=group_id,
        name=payload.name,
        description=payload.description,
        type=payload.type,
        date_info=payload.date_info,
        tags=payload.tags,
        owning_user_id=payload.owning_user_id,
        clearing_shares=payload.clearing_shares,
    )

    return await account_service.get_account(user=user, account_id=account_id)


@router.get(r"/v1/accounts/{account_id}", summary="fetch a group account")
async def get_account(
    account_id: int,
    user: User = Depends(get_current_user),
    account_service: AccountService = Depends(get_account_service),
):
    return await account_service.get_account(user=user, account_id=account_id)


@router.post(r"/v1/accounts/{account_id}", summary="update an account")
async def update_account(
    account_id: int,
    payload: UpdateAccountPayload,
    user: User = Depends(get_current_user),
    account_service: AccountService = Depends(get_account_service),
):
    await account_service.update_account(
        user=user,
        account_id=account_id,
        name=payload.name,
        description=payload.description,
        date_info=payload.date_info,
        tags=payload.tags,
        owning_user_id=payload.owning_user_id,
        clearing_shares=payload.clearing_shares,
    )

    return await account_service.get_account(user=user, account_id=account_id)


@router.delete(
    r"/v1/accounts/{account_id}", summary="delete an account", response_model=Account
)
async def delete_account(
    account_id: int,
    user: User = Depends(get_current_user),
    account_service: AccountService = Depends(get_account_service),
):
    await account_service.delete_account(
        user=user,
        account_id=account_id,
    )
    return await account_service.get_account(user=user, account_id=account_id)
