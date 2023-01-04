from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel

from abrechnung.application.groups import GroupService
from abrechnung.domain.groups import (
    Group,
    GroupMember,
    GroupLog,
    GroupInvite,
    GroupPreview,
)
from abrechnung.domain.users import User
from abrechnung.http.auth import get_current_user
from abrechnung.http.dependencies import get_group_service

router = APIRouter(
    prefix="/api",
    tags=["groups"],
    responses={
        status.HTTP_401_UNAUTHORIZED: {"description": "unauthorized"},
        status.HTTP_403_FORBIDDEN: {"description": "forbidden"},
        status.HTTP_404_NOT_FOUND: {"description": "Not found"},
    },
)


class PreviewGroupPayload(BaseModel):
    invite_token: str


@router.post(
    r"/v1/groups/preview",
    summary="preview a group before joining using an invite token",
    response_model=GroupPreview,
)
async def preview_group(
    payload: PreviewGroupPayload,
    # user: User = Depends(get_current_user),
    group_service: GroupService = Depends(get_group_service),
):
    return await group_service.preview_group(
        # user=user,
        invite_token=payload.invite_token,
    )


@router.post(
    r"/v1/groups/join",
    summary="join a group using an invite token",
    response_model=Group,
)
async def join_group(
    payload: PreviewGroupPayload,
    user: User = Depends(get_current_user),
    group_service: GroupService = Depends(get_group_service),
):
    group_id = await group_service.join_group(
        user=user,
        invite_token=payload.invite_token,
    )

    return await group_service.get_group(user=user, group_id=group_id)


@router.get(
    "/v1/groups", summary="list the current users groups", response_model=List[Group]
)
async def list_groups(
    user: User = Depends(get_current_user),
    group_service: GroupService = Depends(get_group_service),
):
    return await group_service.list_groups(user=user)


class GroupPayload(BaseModel):
    name: str
    description: Optional[str] = None
    currency_symbol: str
    add_user_account_on_join = False
    terms: Optional[str] = None


@router.post("/v1/groups", summary="create a group", response_model=Group)
async def create_group(
    payload: GroupPayload,
    user: User = Depends(get_current_user),
    group_service: GroupService = Depends(get_group_service),
):
    group_id = await group_service.create_group(
        user=user,
        name=payload.name,
        description=payload.description,
        currency_symbol=payload.currency_symbol,
        add_user_account_on_join=payload.add_user_account_on_join,
        terms=payload.terms,
    )

    return await group_service.get_group(user=user, group_id=group_id)


@router.get(
    r"/v1/groups/{group_id}", summary="fetch group details", response_model=Group
)
async def get_group(
    group_id: int,
    user: User = Depends(get_current_user),
    group_service: GroupService = Depends(get_group_service),
):
    return await group_service.get_group(user=user, group_id=group_id)


@router.post(
    r"/v1/groups/{group_id}", summary="update group details", response_model=Group
)
async def update_group(
    group_id: int,
    payload: GroupPayload,
    user: User = Depends(get_current_user),
    group_service: GroupService = Depends(get_group_service),
):
    await group_service.update_group(
        user=user,
        group_id=group_id,
        name=payload.name,
        description=payload.description,
        currency_symbol=payload.currency_symbol,
        add_user_account_on_join=payload.add_user_account_on_join,
        terms=payload.terms,
    )

    return await group_service.get_group(user=user, group_id=group_id)


@router.delete(
    r"/v1/groups/{group_id}",
    summary="delete a group",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_group(
    group_id: int,
    user: User = Depends(get_current_user),
    group_service: GroupService = Depends(get_group_service),
):
    await group_service.delete_group(user=user, group_id=group_id)


@router.post(
    r"/v1/groups/{group_id}/leave",
    summary="leave a group",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def leave_group(
    group_id: int,
    user: User = Depends(get_current_user),
    group_service: GroupService = Depends(get_group_service),
):
    await group_service.leave_group(user=user, group_id=group_id)


@router.get(
    r"/v1/groups/{group_id}/members",
    summary="list all members of a group",
    response_model=List[GroupMember],
)
async def list_members(
    group_id: int,
    user: User = Depends(get_current_user),
    group_service: GroupService = Depends(get_group_service),
):
    return await group_service.list_members(
        user=user,
        group_id=group_id,
    )


@router.get(
    r"/v1/groups/{group_id}/logs",
    summary="fetch the group log",
    response_model=List[GroupLog],
)
async def list_log(
    group_id: int,
    user: User = Depends(get_current_user),
    group_service: GroupService = Depends(get_group_service),
):
    return await group_service.list_log(user=user, group_id=group_id)


class GroupMessage(BaseModel):
    message: str


@router.post(
    r"/v1/groups/{group_id}/send_message",
    summary="post a message to the group log",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def send_group_message(
    group_id: int,
    payload: GroupMessage,
    user: User = Depends(get_current_user),
    group_service: GroupService = Depends(get_group_service),
):
    await group_service.send_group_message(
        user=user,
        group_id=group_id,
        message=payload.message,
    )


class UpdateGroupMemberPayload(BaseModel):
    user_id: int
    can_write: bool
    is_owner: bool


@router.post(
    r"/v1/groups/{group_id}/members",
    summary="update the permissions of a group member",
    response_model=GroupMember,
)
async def update_member_permissions(
    payload: UpdateGroupMemberPayload,
    group_id: int,
    user: User = Depends(get_current_user),
    group_service: GroupService = Depends(get_group_service),
):
    await group_service.update_member_permissions(
        user=user,
        group_id=group_id,
        member_id=payload.user_id,
        can_write=payload.can_write,
        is_owner=payload.is_owner,
    )

    return await group_service.get_member(
        user=user, group_id=group_id, member_id=payload.user_id
    )


@router.get(
    r"/v1/groups/{group_id}/invites",
    summary="list all invite links of a group",
    response_model=List[GroupInvite],
)
async def list_invites(
    group_id: int,
    user: User = Depends(get_current_user),
    group_service: GroupService = Depends(get_group_service),
):
    return await group_service.list_invites(
        user=user,
        group_id=group_id,
    )


class CreateInvitePayload(BaseModel):
    description: str
    single_use: bool
    join_as_editor: bool
    valid_until: datetime


@router.post(
    r"/v1/groups/{group_id}/invites",
    summary="create a new group invite link",
    response_model=GroupInvite,
)
async def create_invite(
    group_id: int,
    payload: CreateInvitePayload,
    user: User = Depends(get_current_user),
    group_service: GroupService = Depends(get_group_service),
):
    valid_until = payload.valid_until
    if valid_until.tzinfo is None:
        valid_until = valid_until.replace(tzinfo=timezone.utc)

    invite_id = await group_service.create_invite(
        user=user,
        group_id=group_id,
        description=payload.description,
        single_use=payload.single_use,
        valid_until=valid_until,
        join_as_editor=payload.join_as_editor,
    )
    return await group_service.get_invite(
        user=user, group_id=group_id, invite_id=invite_id
    )


@router.delete(
    r"/v1/groups/{group_id}/invites/{invite_id}",
    summary="delete a group invite link",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_invite(
    group_id: int,
    invite_id: int,
    user: User = Depends(get_current_user),
    group_service: GroupService = Depends(get_group_service),
):
    return await group_service.delete_invite(
        user=user,
        group_id=group_id,
        invite_id=invite_id,
    )
