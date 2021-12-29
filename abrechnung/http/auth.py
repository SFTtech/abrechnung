import logging
import re
from datetime import timedelta, datetime, timezone

from aiohttp import web, hdrs
import jwt
from schema import Schema

from abrechnung.application import InvalidCommand
from abrechnung.application.users import (
    InvalidPassword,
)
from abrechnung.http.serializers import UserSerializer
from abrechnung.http.utils import validate, json_response

logger = logging.getLogger(__name__)

routes = web.RouteTableDef()

REQUEST_AUTH_KEY = "user"
ACCESS_TOKEN_VALIDITY = timedelta(hours=1)


def check_request(request, entries):
    for pattern in entries:
        if re.match(pattern, request.path):
            return True

    return False


def access_token_expiry() -> datetime:
    return datetime.now(tz=timezone.utc) + ACCESS_TOKEN_VALIDITY


def token_for_user(user_id: int, session_id: int, secret_key: str) -> str:
    return jwt.encode(
        {"exp": access_token_expiry(), "user_id": user_id, "session_id": session_id},
        secret_key,
        algorithm="HS256",
    )


def decode_jwt_token(token: str, secret: str) -> dict:
    return jwt.decode(token, secret, algorithms=["HS256"])


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
        except jwt.PyJWTError as exc:
            logger.info(f"Received invalid authorization token: {exc}")
            msg = "Invalid authorization token, " + str(exc)
            raise web.HTTPUnauthorized(reason=msg)

        if "user_id" not in decoded or "session_id" not in decoded:
            raise web.HTTPUnauthorized(reason="Invalid token claims")

        async with request.app["db_pool"].acquire() as conn:
            session_id = await conn.fetchval(
                "select id from session where id = $1 and user_id = $2 and valid_until is null or valid_until > now()",
                decoded["session_id"],
                decoded["user_id"],
            )
            if not session_id:
                raise web.HTTPUnauthorized(
                    reason="provided access token for expired or logged out session"
                )

        request[REQUEST_AUTH_KEY] = {
            "user_id": decoded["user_id"],
            "session_id": decoded["session_id"],
        }

        return await handler(request)

    return _jwt_middleware


@routes.post("/auth/login")
@validate(Schema({"username": str, "password": str, "session_name": str}))
async def login(request, data):
    user_id, session_id, session_token = await request.app["user_service"].login_user(
        username=data["username"],
        password=data["password"],
        session_name=data["session_name"],
    )

    token = token_for_user(
        user_id=user_id, session_id=session_id, secret_key=request.app["secret_key"]
    )

    return json_response(
        data={
            "user_id": user_id,
            "access_token": token,
            "session_token": session_token,
        }
    )


@routes.post("/auth/logout")
async def logout(request):
    await request.app["user_service"].logout_user(
        session_id=request["user"]["session_id"], user_id=request["user"]["user_id"]
    )
    return web.Response(status=web.HTTPNoContent.status_code)


@routes.post("/auth/fetch_access_token")
@validate(Schema({"token": str}))
async def fetch_access_token(request, data):
    row = await request.app["user_service"].is_session_token_valid(token=data["token"])
    if row is None:
        raise web.HTTPBadRequest(reason="invalid session token")

    user_id, session_id = row

    token = token_for_user(
        user_id=user_id, session_id=session_id, secret_key=request.app["secret_key"]
    )

    return json_response(
        data={
            "user_id": user_id,
            "access_token": token,
        }
    )


@routes.post("/auth/register")
@validate(Schema({"username": str, "password": str, "email": str}))
async def register(request, data):
    user_id = await request.app["user_service"].register_user(
        username=data["username"],
        password=data["password"],
        email=data["email"],
    )

    return json_response(data={"user_id": str(user_id)})


@routes.post("/auth/confirm_registration")
@validate(Schema({"token": str}))
async def confirm_registration(request, data):
    try:
        await request.app["user_service"].confirm_registration(token=data["token"])
    except (PermissionError, InvalidCommand) as e:
        raise web.HTTPBadRequest(reason=str(e))

    return json_response(status=web.HTTPNoContent.status_code)


@routes.get("/profile")
async def profile(request):
    user = await request.app["user_service"].get_user(
        user_id=request["user"]["user_id"]
    )

    serializer = UserSerializer(user, config=request.app["config"])

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
    await request.app["user_service"].confirm_email_change(token=data["token"])

    return json_response(status=web.HTTPNoContent.status_code)


@routes.post("/auth/recover_password")
@validate(Schema({"email": str}))
async def recover_password(request, data):
    try:
        await request.app["user_service"].request_password_recovery(
            email=data["email"],
        )
    except InvalidPassword as e:
        raise web.HTTPBadRequest(reason=str(e))

    return json_response(status=web.HTTPNoContent.status_code)


@routes.post("/auth/confirm_password_recovery")
@validate(Schema({"token": str, "new_password": str}))
async def confirm_password_recovery(request, data):
    try:
        await request.app["user_service"].confirm_password_recovery(
            token=data["token"], new_password=data["new_password"]
        )
    except PermissionError as e:
        raise web.HTTPBadRequest(reason=str(e))

    return json_response(status=web.HTTPNoContent.status_code)


@routes.post("/auth/delete_session")
@validate(Schema({"session_id": int}))
async def delete_session(request, data):
    await request.app["user_service"].delete_session(
        user_id=request["user"]["user_id"], session_id=data["session_id"]
    )

    return json_response(status=web.HTTPNoContent.status_code)


@routes.post("/auth/rename_session")
@validate(Schema({"session_id": int, "name": str}))
async def rename_session(request, data):
    await request.app["user_service"].rename_session(
        user_id=request["user"]["user_id"],
        session_id=data["session_id"],
        name=data["name"],
    )

    return json_response(status=web.HTTPNoContent.status_code)
