import logging
import re
from datetime import timedelta, datetime
from uuid import UUID

from jose import jwt
from aiohttp import web, hdrs
from schema import Schema

from abrechnung.application.users import (
    RegistrationError,
    InvalidPassword,
    UserNotFound,
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


def token_for_user(user_id: UUID, secret_key: str) -> str:
    return jwt.encode(
        {"exp": access_token_expiry(), "user_id": str(user_id)}, secret_key
    )


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

        if not token:
            raise web.HTTPUnauthorized(
                reason="Missing authorization token",
            )

        if token is not None:
            if not isinstance(token, bytes):
                token = token.encode()

            try:
                decoded = jwt.decode(token, secret, algorithms="HS256")
            except jwt.JWTError as exc:
                logger.info(f"Received invalid authorization token: {exc}")
                msg = "Invalid authorization token, " + str(exc)
                raise web.HTTPUnauthorized(reason=msg)

            # TODO: improve this to make it more sane
            decoded["user_id"] = UUID(decoded["user_id"])

            request[REQUEST_AUTH_KEY] = decoded

        return await handler(request)

    return _jwt_middleware


@routes.post("/auth/login")
@validate(Schema({"username": str, "password": str}))
async def login(request, data):
    try:
        user_id = request.app["user_service"].login_user(**data)
    except (UserNotFound, InvalidPassword):
        raise web.HTTPBadRequest()

    token = token_for_user(user_id, request.app["secret_key"])

    return json_response(data={"user_id": str(user_id), "access_token": token})


@routes.post("/auth/register")
@validate(Schema({"username": str, "password": str, "email": str}))
async def register(request, data):
    try:
        user_id = request.app["user_service"].register_user(**data)
    except RegistrationError as e:
        raise web.HTTPBadRequest(reason=str(e))

    return json_response(data={"user_id": str(user_id)})


@routes.get("/profile")
async def profile(request):
    user = request.app["user_service"].get_user(user_id=request["user"]["user_id"])

    serializer = UserSerializer(user)

    return json_response(data=serializer.to_repr())


@routes.post("/profile/change_password")
@validate(Schema({"new_password": str, "old_password": str}))
async def register(request, data):
    try:
        request.app["user_service"].change_password(
            user_id=request["user"]["user_id"],
            new_password=data["new_password"],
            old_password=data["old_password"],
        )
    except PermissionError as e:
        raise web.HTTPBadRequest(reason=str(e))

    return json_response(status=web.HTTPNoContent.status_code)


@routes.post("/profile/change_email")
@validate(Schema({"email": str, "password": str}))
async def register(request, data):
    request.app["user_service"].change_email(
        user_id=request["user"]["user_id"],
        email=data["email"],
        password=data["password"],
    )

    return json_response(status=web.HTTPNoContent.status_code)
