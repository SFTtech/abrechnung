from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr

from abrechnung.application.users import InvalidPassword, UserService
from abrechnung.config import Config
from abrechnung.domain.users import User
from abrechnung.http.auth import get_current_session_id, get_current_user
from abrechnung.http.dependencies import get_config, get_user_service

router = APIRouter(
    prefix="/api",
    tags=["auth"],
)


class Token(BaseModel):
    user_id: int
    access_token: str


@router.post(
    "/v1/auth/token", summary="login with username and password", response_model=Token, operation_id="get_token"
)
async def get_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    user_service: UserService = Depends(get_user_service),
):
    user_id, session_id, access_token = await user_service.login_user(
        username=form_data.username,
        password=form_data.password,
        session_name="foobar",  # TODO: FIXME
    )

    return Token(user_id=user_id, access_token=access_token)


class LoginPayload(BaseModel):
    username: str
    password: str
    session_name: str


@router.post("/v1/auth/login", summary="login with username and password", response_model=Token, operation_id="login")
async def login(
    payload: LoginPayload,
    user_service: UserService = Depends(get_user_service),
):
    user_id, session_id, access_token = await user_service.login_user(
        username=payload.username,
        password=payload.password,
        session_name=payload.session_name,
    )

    return Token(user_id=user_id, access_token=access_token)


@router.post(
    "/v1/auth/logout",
    summary="sign out of the current session",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="logout",
)
async def logout(
    session_id: int = Depends(get_current_session_id),
    user: User = Depends(get_current_user),
    user_service: UserService = Depends(get_user_service),
):
    await user_service.logout_user(session_id=session_id, user=user)


class RegisterPayload(BaseModel):
    username: str
    password: str
    email: EmailStr
    invite_token: Optional[str] = None


class RegisterResponse(BaseModel):
    user_id: int


@router.post(
    "/v1/auth/register", summary="register a new user", response_model=RegisterResponse, operation_id="register"
)
async def register(
    payload: RegisterPayload,
    config: Config = Depends(get_config),
    user_service: UserService = Depends(get_user_service),
):
    if config.demo.enabled:
        user_id = await user_service.demo_register_user(
            username=payload.username,
            password=payload.password,
            email=payload.email,
        )
    else:
        user_id = await user_service.register_user(
            username=payload.username,
            password=payload.password,
            email=payload.email,
            invite_token=payload.invite_token,
        )

    return RegisterResponse(user_id=user_id)


class ConfirmRegistrationPayload(BaseModel):
    token: str


@router.post(
    "/v1/auth/confirm_registration",
    summary="confirm a pending registration",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="confirm_registration",
)
async def confirm_registration(
    payload: ConfirmRegistrationPayload,
    user_service: UserService = Depends(get_user_service),
):
    await user_service.confirm_registration(token=payload.token)


@router.get("/v1/profile", summary="fetch user profile information", response_model=User, operation_id="get_profile")
async def get_profile(
    user: User = Depends(get_current_user),
    user_service: UserService = Depends(get_user_service),
):
    return await user_service.get_user(user_id=user.id)


class ChangePasswordPayload(BaseModel):
    new_password: str
    old_password: str


@router.post(
    "/v1/profile/change_password",
    summary="change password",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="change_password",
)
async def change_password(
    payload: ChangePasswordPayload,
    user: User = Depends(get_current_user),
    user_service: UserService = Depends(get_user_service),
):
    try:
        await user_service.change_password(
            user=user,
            new_password=payload.new_password,
            old_password=payload.old_password,
        )
    except InvalidPassword as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


class ChangeEmailPayload(BaseModel):
    email: EmailStr
    password: str


@router.post(
    "/v1/profile/change_email",
    summary="change email",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="change_email",
)
async def change_email(
    payload: ChangeEmailPayload,
    user: User = Depends(get_current_user),
    user_service: UserService = Depends(get_user_service),
):
    try:
        await user_service.request_email_change(
            user=user,
            email=payload.email,
            password=payload.password,
        )
    except InvalidPassword as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


class ConfirmEmailChangePayload(BaseModel):
    token: str


@router.post(
    "/v1/auth/confirm_email_change",
    summary="confirm a pending email change",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="confirm_email_change",
)
async def confirm_email_change(
    payload: ConfirmEmailChangePayload,
    user_service: UserService = Depends(get_user_service),
):
    await user_service.confirm_email_change(token=payload.token)


class RecoverPasswordPayload(BaseModel):
    email: str


@router.post(
    "/v1/auth/recover_password",
    summary="recover password",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="recover_password",
)
async def recover_password(
    payload: RecoverPasswordPayload,
    user_service: UserService = Depends(get_user_service),
):
    try:
        await user_service.request_password_recovery(
            email=payload.email,
        )
    except InvalidPassword as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


class ConfirmPasswordRecoveryPayload(BaseModel):
    token: str
    new_password: str


@router.post(
    "/v1/auth/confirm_password_recovery",
    summary="confirm a pending password recovery",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="confirm_password_recovery",
)
async def confirm_password_recovery(
    payload: ConfirmPasswordRecoveryPayload,
    user_service: UserService = Depends(get_user_service),
):
    try:
        await user_service.confirm_password_recovery(token=payload.token, new_password=payload.new_password)
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


class DeleteSessionPayload(BaseModel):
    session_id: int


@router.post(
    "/v1/auth/delete_session",
    summary="delete a given user session",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="delete_session",
)
async def delete_session(
    payload: DeleteSessionPayload,
    user: User = Depends(get_current_user),
    user_service: UserService = Depends(get_user_service),
):
    await user_service.delete_session(user=user, session_id=payload.session_id)


class RenameSessionPayload(BaseModel):
    session_id: int
    name: str


@router.post(
    "/v1/auth/rename_session",
    summary="rename a given user session",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="rename_session",
)
async def rename_session(
    payload: RenameSessionPayload,
    user: User = Depends(get_current_user),
    user_service: UserService = Depends(get_user_service),
):
    await user_service.rename_session(
        user=user,
        session_id=payload.session_id,
        name=payload.name,
    )
