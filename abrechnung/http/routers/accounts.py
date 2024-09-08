from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel

from abrechnung.application.accounts import AccountService
from abrechnung.domain.accounts import Account, ClearingShares, NewAccount
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
    operation_id="list_accounts",
)
async def list_accounts(
    group_id: int,
    user: User = Depends(get_current_user),
    account_service: AccountService = Depends(get_account_service),
):
    return await account_service.list_accounts(user=user, group_id=group_id)


@router.post(
    r"/v1/groups/{group_id}/accounts",
    summary="create a new group account",
    response_model=Account,
    operation_id="create_account",
)
async def create_account(
    group_id: int,
    payload: NewAccount,
    user: User = Depends(get_current_user),
    account_service: AccountService = Depends(get_account_service),
):
    account_id = await account_service.create_account(
        user=user,
        group_id=group_id,
        account=payload,
    )

    return await account_service.get_account(user=user, account_id=account_id)


@router.get(
    r"/v1/groups/{group_id}/accounts/{account_id}",
    summary="fetch a group account",
    response_model=Account,
    operation_id="get_account",
)
async def get_account(
    group_id: int,
    account_id: int,
    user: User = Depends(get_current_user),
    account_service: AccountService = Depends(get_account_service),
):
    return await account_service.get_account(user=user, account_id=account_id)


@router.post(
    r"/v1/groups/{group_id}/accounts/{account_id}",
    summary="update an account",
    response_model=Account,
    operation_id="update_account",
)
async def update_account(
    group_id: int,
    account_id: int,
    payload: NewAccount,
    user: User = Depends(get_current_user),
    account_service: AccountService = Depends(get_account_service),
):
    await account_service.update_account(
        group_id=group_id,
        user=user,
        account_id=account_id,
        account=payload,
    )

    return await account_service.get_account(user=user, account_id=account_id)


@router.delete(
    r"/v1/groups/{group_id}/accounts/{account_id}",
    summary="delete an account",
    response_model=Account,
    operation_id="delete_account",
)
async def delete_account(
    group_id: int,
    account_id: int,
    user: User = Depends(get_current_user),
    account_service: AccountService = Depends(get_account_service),
):
    await account_service.delete_account(
        group_id=group_id,
        user=user,
        account_id=account_id,
    )
    return await account_service.get_account(user=user, account_id=account_id)
