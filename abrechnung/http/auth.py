import logging
import re
from datetime import timedelta, datetime
from uuid import UUID

from jose import jwt
from aiohttp import web, hdrs
from schema import Schema

from abrechnung.application import NotFoundError, CommandError
from abrechnung.application.users import (
    InvalidPassword,
    LoginFailed,
)
from abrechnung.http.serializers import UserSerializer
from abrechnung.http.utils import validate, json_response

logger = logging.getLogger(__name__)

routes = web.RouteTableDef()


REQUEST_AUTH_KEY = "user"
ACCESS_TOKEN_VALIDITY = timedelta(hours=24)


def check_request(request, entries):
    for pattern in entries:
        if re.match(pattern, request.path):
            return True

    return False


def access_token_expiry() -> datetime:
    return datetime.now() + ACCESS_TOKEN_VALIDITY


def token_for_user(user_id: int, secret_key: str) -> str:
    return jwt.encode({"exp": access_token_expiry(), "user_id": user_id}, secret_key)


def decode_jwt_token(token: str, secret: str) -> dict:
    return jwt.decode(token, secret, algorithms="HS256")


def jwt_middleware(
    secret,
    whitelist=tuple(),
    auth_scheme="Bearer",
):
    """Mostly taken from https://github.com/hzlmn/aiohttp-jwt"""
    if not (secret and isinstance(secret, str)):
        raise RuntimeError(
            "secret or public key should be provided for correct work",
        )

    @web.middleware
    async def _jwt_middleware(request, handler):
        if request.method == hdrs.METH_OPTIONS:
            return await handler(request)

        if check_request(request, whitelist):
            return await handler(request)

        token = None

        if "Authorization" in request.headers:
            try:
                scheme, token = request.headers.get("Authorization").strip().split(" ")
            except ValueError:
                raise web.HTTPForbidden(reason="Invalid authorization header")

            if not re.match(auth_scheme, scheme):
                raise web.HTTPForbidden(reason="Invalid token scheme")

        if token is None:
            raise web.HTTPUnauthorized(
                reason="Missing authorization token",
            )

        if not isinstance(token, bytes):
            token = token.encode()

        try:
            decoded = decode_jwt_token(token, secret)
        except jwt.JWTError as exc:
            logger.info(f"Received invalid authorization token: {exc}")
            msg = "Invalid authorization token, " + str(exc)
            raise web.HTTPUnauthorized(reason=msg)

        # TODO: improve this to make it more sane
        decoded["user_id"] = decoded["user_id"]

        request[REQUEST_AUTH_KEY] = decoded

        return await handler(request)

    return _jwt_middleware


@routes.post("/auth/login")
@validate(Schema({"username": str, "password": str}))
async def login(request, data):
    try:
        user_id, session_token = await request.app["user_service"].login_user(
            username=data["username"], password=data["password"]
        )
    except (NotFoundError, InvalidPassword) as e:
        raise web.HTTPBadRequest(reason=str(e))
    except LoginFailed as e:
        raise web.HTTPUnauthorized(reason=str(e))

    token = token_for_user(user_id, request.app["secret_key"])

    return json_response(
        data={
            "user_id": str(user_id),
            "access_token": token,
            "session_token": session_token,
        }
    )


@routes.post("/auth/register")
@validate(Schema({"username": str, "password": str, "email": str}))
async def register(request, data):
    try:
        user_id = await request.app["user_service"].register_user(
            username=data["username"],
            password=data["password"],
            email=data["email"],
        )
    except CommandError as e:
        raise web.HTTPBadRequest(reason=str(e))

    return json_response(data={"user_id": str(user_id)})


@routes.post("/auth/confirm_registration")
@validate(Schema({"token": str}))
async def confirm_registration(request, data):
    try:
        await request.app["user_service"].confirm_registration(token=data["token"])
    except (PermissionError, CommandError) as e:
        raise web.HTTPBadRequest(reason=str(e))

    return json_response(status=web.HTTPNoContent.status_code)


@routes.get("/profile")
async def profile(request):
    user = await request.app["user_service"].get_user(
        user_id=request["user"]["user_id"]
    )

    serializer = UserSerializer(user)

    return json_response(data=serializer.to_repr())


@routes.post("/profile/change_password")
@validate(Schema({"new_password": str, "old_password": str}))
async def change_password(request, data):
    try:
        await request.app["user_service"].change_password(
            user_id=request["user"]["user_id"],
            new_password=data["new_password"],
            old_password=data["old_password"],
        )
    except InvalidPassword as e:
        raise web.HTTPBadRequest(reason=str(e))

    return json_response(status=web.HTTPNoContent.status_code)


@routes.post("/profile/change_email")
@validate(Schema({"email": str, "password": str}))
async def change_email(request, data):
    try:
        await request.app["user_service"].request_email_change(
            user_id=request["user"]["user_id"],
            email=data["email"],
            password=data["password"],
        )
    except InvalidPassword as e:
        raise web.HTTPBadRequest(reason=str(e))

    return json_response(status=web.HTTPNoContent.status_code)


@routes.post("/auth/confirm_email_change")
@validate(Schema({"token": str}))
async def confirm_email_change(request, data):
    try:
        await request.app["user_service"].confirm_email_change(token=data["token"])
    except CommandError as e:
        raise web.HTTPBadRequest(reason=str(e))

    return json_response(status=web.HTTPNoContent.status_code)


@routes.post("/auth/confirm_password_reset")
@validate(Schema({"token": str}))
async def confirm_email_change(request, data):
    try:
        await request.app["user_service"].confirm_password_reset(token=data["token"])
    except CommandError as e:
        raise web.HTTPBadRequest(reason=str(e))

    return json_response(status=web.HTTPNoContent.status_code)
