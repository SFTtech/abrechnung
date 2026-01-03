from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel

from abrechnung.application.groups import GroupService
from abrechnung.application.users import UserService
from abrechnung.domain.groups import (
    Group,
    GroupInvite,
    GroupLog,
    GroupMember,
    GroupPreview,
)
from abrechnung.domain.users import User
from abrechnung.http.auth import get_current_user
from abrechnung.http.dependencies import get_group_service, get_user_service

router = APIRouter(
    prefix="/api",
    responses={
        status.HTTP_401_UNAUTHORIZED: {"description": "unauthorized"},
        status.HTTP_403_FORBIDDEN: {"description": "forbidden"},
        status.HTTP_404_NOT_FOUND: {"description": "Not found"},
    },
)


class PreviewGroupPayload(BaseModel):
    invite_token: str
    logged_in_user_token: str | None = None


@router.post(
    r"/v1/groups/preview",
    summary="preview a group before joining using an invite token",
    response_model=GroupPreview,
    operation_id="preview_group",
    tags=["groups"],
)
async def preview_group(
    payload: PreviewGroupPayload,
    group_service: GroupService = Depends(get_group_service),
    user_service: UserService = Depends(get_user_service),
):
    user = None
    if payload.logged_in_user_token:
        user = await user_service.get_user_from_token(token=payload.logged_in_user_token)
    return await group_service.preview_group(
        user=user,
        invite_token=payload.invite_token,
    )


@router.post(
    r"/v1/groups/join",
    summary="join a group using an invite token",
    response_model=Group,
    operation_id="join_group",
    tags=["groups"],
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
    "/v1/groups",
    summary="list the current users groups",
    response_model=List[Group],
    operation_id="list_groups",
    tags=["groups"],
)
async def list_groups(
    user: User = Depends(get_current_user),
    group_service: GroupService = Depends(get_group_service),
):
    return await group_service.list_groups(user=user)


class GroupUpdatePayload(BaseModel):
    name: str
    description: str = ""
    add_user_account_on_join: bool = False
    terms: str = ""


class GroupCreatePayload(GroupUpdatePayload):
    currency_identifier: str


@router.post("/v1/groups", summary="create a group", response_model=Group, operation_id="create_group", tags=["groups"])
async def create_group(
    payload: GroupCreatePayload,
    user: User = Depends(get_current_user),
    group_service: GroupService = Depends(get_group_service),
):
    group_id = await group_service.create_group(
        user=user,
        name=payload.name,
        description=payload.description,
        currency_identifier=payload.currency_identifier,
        add_user_account_on_join=payload.add_user_account_on_join,
        terms=payload.terms,
    )

    return await group_service.get_group(user=user, group_id=group_id)


@router.get(
    r"/v1/groups/{group_id}",
    summary="fetch group details",
    response_model=Group,
    operation_id="get_group",
    tags=["groups"],
)
async def get_group(
    group_id: int,
    user: User = Depends(get_current_user),
    group_service: GroupService = Depends(get_group_service),
):
    return await group_service.get_group(user=user, group_id=group_id)


@router.post(
    r"/v1/groups/{group_id}",
    summary="update group details",
    response_model=Group,
    operation_id="update_group",
    tags=["groups"],
)
async def update_group(
    group_id: int,
    payload: GroupUpdatePayload,
    user: User = Depends(get_current_user),
    group_service: GroupService = Depends(get_group_service),
):
    await group_service.update_group(
        user=user,
        group_id=group_id,
        name=payload.name,
        description=payload.description,
        add_user_account_on_join=payload.add_user_account_on_join,
        terms=payload.terms,
    )

    return await group_service.get_group(user=user, group_id=group_id)


@router.delete(
    r"/v1/groups/{group_id}",
    summary="delete a group",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="delete_group",
    tags=["groups"],
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
    operation_id="leave_group",
    tags=["groups"],
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
    operation_id="list_members",
    tags=["groups", "group_members"],
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
    operation_id="list_log",
    tags=["groups", "group_logs"],
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
    operation_id="send_group_message",
    tags=["groups", "group_logs"],
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


class UpdateGroupMemberPermissionsPayload(BaseModel):
    can_write: bool
    is_owner: bool


@router.post(
    r"/v1/groups/{group_id}/members/{user_id}",
    summary="update the permissions of a group member",
    response_model=GroupMember,
    operation_id="update_member_permissions",
    tags=["groups", "group_members"],
)
async def update_member_permissions(
    payload: UpdateGroupMemberPermissionsPayload,
    group_id: int,
    user_id: int,
    user: User = Depends(get_current_user),
    group_service: GroupService = Depends(get_group_service),
):
    await group_service.update_member_permissions(
        user=user,
        group_id=group_id,
        member_id=user_id,
        can_write=payload.can_write,
        is_owner=payload.is_owner,
    )

    return await group_service.get_member(user=user, group_id=group_id, member_id=user_id)


class UpdateGroupMemberOwnedAccountPayload(BaseModel):
    owned_account_id: int | None


@router.post(
    r"/v1/groups/{group_id}/members/{user_id}/owned-account",
    summary="update the owned account of a group member",
    response_model=GroupMember,
    operation_id="update_member_owned_account",
    tags=["groups", "group_members"],
)
async def update_member_owned_account(
    payload: UpdateGroupMemberOwnedAccountPayload,
    group_id: int,
    user_id: int,
    user: User = Depends(get_current_user),
    group_service: GroupService = Depends(get_group_service),
):
    await group_service.update_member_owned_account(
        user=user,
        group_id=group_id,
        member_id=user_id,
        owned_account_id=payload.owned_account_id,
    )

    return await group_service.get_member(user=user, group_id=group_id, member_id=user_id)


@router.get(
    r"/v1/groups/{group_id}/invites",
    summary="list all invite links of a group",
    response_model=List[GroupInvite],
    operation_id="list_invites",
    tags=["groups", "group_invites"],
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
    valid_until: datetime | None = None


@router.post(
    r"/v1/groups/{group_id}/invites",
    summary="create a new group invite link",
    response_model=GroupInvite,
    operation_id="create_invite",
    tags=["groups", "group_invites"],
)
async def create_invite(
    group_id: int,
    payload: CreateInvitePayload,
    user: User = Depends(get_current_user),
    group_service: GroupService = Depends(get_group_service),
):
    valid_until = payload.valid_until
    if valid_until is not None and valid_until.tzinfo is None:
        valid_until = valid_until.replace(tzinfo=timezone.utc)

    invite_id = await group_service.create_invite(
        user=user,
        group_id=group_id,
        description=payload.description,
        single_use=payload.single_use,
        valid_until=valid_until,
        join_as_editor=payload.join_as_editor,
    )
    return await group_service.get_invite(user=user, group_id=group_id, invite_id=invite_id)


@router.delete(
    r"/v1/groups/{group_id}/invites/{invite_id}",
    summary="delete a group invite link",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="delete_invite",
    tags=["groups", "group_invites"],
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


@router.post(
    r"/v1/groups/{group_id}/archive",
    summary="archive a group",
    operation_id="archive_group",
    tags=["groups"],
)
async def archive_group(
    group_id: int,
    user: User = Depends(get_current_user),
    group_service: GroupService = Depends(get_group_service),
):
    await group_service.archive_group(
        user=user,
        group_id=group_id,
    )


@router.post(
    r"/v1/groups/{group_id}/un-archive",
    summary="un-archive a group",
    operation_id="unarchive_group",
    tags=["groups"],
)
async def unarchive_group(
    group_id: int,
    user: User = Depends(get_current_user),
    group_service: GroupService = Depends(get_group_service),
):
    await group_service.unarchive_group(
        user=user,
        group_id=group_id,
    )
