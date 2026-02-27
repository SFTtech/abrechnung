from datetime import datetime, timezone
from typing import Optional

import bcrypt
from asyncpg.pool import Pool
from email_validator import EmailNotValidError, validate_email
from jose import JWTError, jwt
from pydantic import BaseModel
from sftkit.database import Connection
from sftkit.error import AccessDenied, InvalidArgument, Unauthorized
from sftkit.service import Service, with_db_transaction

from abrechnung.config import Config
from abrechnung.domain.users import Session, User
from abrechnung.util import is_valid_uuid

ALGORITHM = "HS256"


class InvalidPassword(Exception):
    pass


class LoginFailed(Exception):
    pass


class TokenMetadata(BaseModel):
    user_id: int
    session_id: int


async def _check_user_exists(*, conn: Connection, username: str, email: str):
    user_exists = await conn.fetchrow(
        "select "
        "exists(select from usr where username = $1) as username_exists, "
        "exists(select from usr where email = $2) as email_exists",
        username,
        email,
    )
    if user_exists["username_exists"]:
        raise InvalidArgument("A user with this username already exists")
    if user_exists["email_exists"]:
        raise InvalidArgument("A user with this email already exists")


class UserService(Service[Config]):
    def __init__(
        self,
        db_pool: Pool,
        config: Config,
    ):
        super().__init__(db_pool=db_pool, config=config)

        self.enable_registration = self.config.registration.enabled
        self.require_email_confirmation = self.config.registration.require_email_confirmation
        self.allow_guest_users = self.config.registration.allow_guest_users
        self.valid_email_domains = self.config.registration.valid_email_domains

    def _hash_password(self, password: str) -> str:
        salt = bcrypt.gensalt()
        return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

    def _check_password(self, password: str, hashed_password: str) -> bool:
        return bcrypt.checkpw(password.encode("utf-8"), hashed_password.encode("utf-8"))

    def _create_access_token(self, user_id: int, session_id: int):
        data = {
            "user_id": user_id,
            "session_id": session_id,
        }
        encoded_jwt = jwt.encode(data, self.config.api.secret_key, algorithm=ALGORITHM)
        return encoded_jwt

    def decode_jwt_payload(self, token: str) -> TokenMetadata:
        try:
            payload = jwt.decode(token, self.config.api.secret_key, algorithms=[ALGORITHM])
            try:
                return TokenMetadata.model_validate(payload)
            except:
                raise Unauthorized("invalid access token")
        except JWTError:
            raise Unauthorized("invalid access token")

    @with_db_transaction
    async def get_user_from_token(self, *, conn: Connection, token: str) -> User:
        token_metadata = self.decode_jwt_payload(token)

        sess = await conn.fetchval(
            "select id from session where id = $1 and user_id = $2 and valid_until is null or valid_until > now()",
            token_metadata.session_id,
            token_metadata.user_id,
        )
        if not sess:
            raise Unauthorized("invalid access token")
        return await self._get_user(conn=conn, user_id=token_metadata.user_id)

    async def _verify_user_password(self, user_id: int, password: str) -> bool:
        async with self.db_pool.acquire() as conn:
            user = await conn.fetchrow(
                "select hashed_password, pending, deleted from usr where id = $1",
                user_id,
            )
            if user is None:
                raise InvalidArgument(f"User with id {user_id} does not exist")

            if user["deleted"] or user["pending"]:
                return False

            return self._check_password(password, user["hashed_password"])

    @with_db_transaction
    async def login_user(
        self, *, conn: Connection, username: str, password: str, session_name: str
    ) -> tuple[int, int, str]:
        """
        validate whether a given user can login

        If successful return the user id, a new session id and a session token
        """
        user = await conn.fetchrow(
            "select id, hashed_password, pending, deleted from usr where username = $1 or email = $1",
            username,
        )
        if user is None:
            raise InvalidArgument("Login failed")

        if not self._check_password(password, user["hashed_password"]):
            raise InvalidArgument("Login failed")

        if user["deleted"]:
            raise InvalidArgument("User is not permitted to login")

        if user["pending"]:
            raise InvalidArgument("You need to confirm your email before logging in")

        session_id = await conn.fetchval(
            "insert into session (user_id, name) values ($1, $2) returning id",
            user["id"],
            session_name,
        )
        access_token = self._create_access_token(user_id=user["id"], session_id=session_id)

        return user["id"], session_id, access_token

    @with_db_transaction
    async def logout_user(self, *, conn: Connection, user: User, session_id: int):
        sess_id = await conn.fetchval(
            "delete from session where id = $1 and user_id = $2 returning id",
            session_id,
            user.id,
        )
        if sess_id is None:
            raise InvalidArgument("Already logged out")

    @with_db_transaction
    async def demo_register_user(self, *, conn: Connection, username: str, email: str, password: str) -> int:
        await _check_user_exists(conn=conn, username=username, email=email)
        hashed_password = self._hash_password(password)
        user_id = await conn.fetchval(
            "insert into usr (username, email, hashed_password, pending) values ($1, $2, $3, false) returning id",
            username,
            email,
            hashed_password,
        )
        if user_id is None:
            raise InvalidArgument("Registering new user failed")

        return user_id

    @staticmethod
    def _validate_email_address(email: str) -> str:
        try:
            valid = validate_email(email)
            email = valid.normalized
        except EmailNotValidError as e:
            raise InvalidArgument(str(e))

        return email

    def _validate_email_domain(self, email: str) -> bool:
        if self.valid_email_domains is None:
            return True

        domain = email.split("@")[-1]
        if domain not in self.valid_email_domains:
            return False

        return True

    @with_db_transaction
    async def register_user(
        self,
        *,
        conn: Connection,
        username: str,
        email: str,
        password: str,
        invite_token: Optional[str] = None,
        requires_email_confirmation=True,
    ) -> int:
        """Register a new user, returning the newly created user id and creating a pending registration entry"""
        if not self.enable_registration:
            raise AccessDenied("User registrations are disabled on this server")

        requires_email_confirmation = self.require_email_confirmation and requires_email_confirmation

        await _check_user_exists(conn=conn, username=username, email=email)

        email = self._validate_email_address(email)

        is_guest_user = False
        has_valid_email = self._validate_email_domain(email)

        if invite_token is not None and self.allow_guest_users and not has_valid_email:
            invite = await conn.fetchval(
                "select id from group_invite where token = $1 and valid_until > now()",
                invite_token,
            )
            if invite is None:
                raise InvalidArgument("Invalid invite token")
            is_guest_user = True
            if self.enable_registration and has_valid_email:
                self._validate_email_domain(email)
        elif not has_valid_email:
            raise AccessDenied(
                f"Only users with emails out of the following domains are allowed: {self.valid_email_domains}"
            )

        hashed_password = self._hash_password(password)
        user_id = await conn.fetchval(
            "insert into usr (username, email, hashed_password, is_guest_user, pending) values ($1, $2, $3, $4, $5) returning id",
            username,
            email,
            hashed_password,
            is_guest_user,
            requires_email_confirmation,
        )
        if user_id is None:
            raise InvalidArgument("Registering new user failed")

        if requires_email_confirmation:
            await conn.execute("delete from pending_registration where user_id = $1", user_id)
            await conn.execute("insert into pending_registration (user_id) values ($1)", user_id)

        return user_id

    @with_db_transaction
    async def confirm_registration(self, *, conn: Connection, token: str) -> int:
        if not is_valid_uuid(token):
            raise InvalidArgument("Invalid confirmation token")
        row = await conn.fetchrow(
            "select user_id, valid_until from pending_registration where token = $1",
            token,
        )
        if row is None:
            raise AccessDenied("Invalid registration token")

        user_id = row["user_id"]
        valid_until = row["valid_until"]
        if valid_until is None or valid_until < datetime.now(tz=timezone.utc):
            raise AccessDenied("Invalid registration token")

        await conn.execute("delete from pending_registration where user_id = $1", user_id)
        await conn.execute("update usr set pending = false where id = $1", user_id)

        return user_id

    @staticmethod
    async def _get_user(conn: Connection, user_id: int) -> User:
        user = await conn.fetch_one(
            User,
            "select id, email, registered_at, username, pending, deleted, is_guest_user, "
            "   json_build_array() as sessions "
            "from usr where id = $1",
            user_id,
        )

        if user is None:
            raise InvalidArgument(f"User with id {user_id} does not exist")

        sessions = await conn.fetch_many(
            Session,
            "select id, name, valid_until, last_seen from session where user_id = $1",
            user_id,
        )
        user.sessions = sessions
        return user

    @with_db_transaction
    async def get_user(self, *, conn: Connection, user_id: int) -> User:
        return await self._get_user(conn, user_id)

    @with_db_transaction
    async def delete_session(self, *, conn: Connection, user: User, session_id: int):
        sess_id = await conn.fetchval(
            "delete from session where id = $1 and user_id = $2 returning id",
            session_id,
            user.id,
        )
        if not sess_id:
            raise InvalidArgument(f"no such session found with id {session_id}")

    @with_db_transaction
    async def rename_session(self, *, conn: Connection, user: User, session_id: int, name: str):
        sess_id = await conn.fetchval(
            "update session set name = $3 where id = $1 and user_id = $2 returning id",
            session_id,
            user.id,
            name,
        )
        if not sess_id:
            raise InvalidArgument(f"no such session found with id {session_id}")

    @with_db_transaction
    async def change_password(self, *, conn: Connection, user: User, old_password: str, new_password: str):
        valid_pw = await self._verify_user_password(user.id, old_password)
        if not valid_pw:
            raise InvalidPassword

        hashed_password = self._hash_password(new_password)
        await conn.execute(
            "update usr set hashed_password = $1 where id = $2",
            hashed_password,
            user.id,
        )

    @with_db_transaction
    async def request_email_change(self, *, conn: Connection, user: User, password: str, email: str):
        try:
            valid = validate_email(email)
            email = valid.normalized
        except EmailNotValidError as e:
            raise InvalidArgument(str(e))

        valid_pw = await self._verify_user_password(user.id, password)
        if not valid_pw:
            raise InvalidPassword

        await conn.execute("delete from pending_email_change where user_id = $1", user.id)
        await conn.execute(
            "insert into pending_email_change (user_id, new_email) values ($1, $2)",
            user.id,
            email,
        )

    @with_db_transaction
    async def confirm_email_change(self, *, conn: Connection, token: str) -> int:
        if not is_valid_uuid(token):
            raise InvalidArgument("Invalid confirmation token")
        row = await conn.fetchrow(
            "select user_id, new_email, valid_until from pending_email_change where token = $1",
            token,
        )
        user_id = row["user_id"]
        valid_until = row["valid_until"]
        if valid_until is None or valid_until < datetime.now(tz=timezone.utc):
            raise AccessDenied("Invalid confirmation token")

        await conn.execute("delete from pending_email_change where user_id = $1", user_id)
        await conn.execute("update usr set email = $2 where id = $1", user_id, row["new_email"])

        return user_id

    @with_db_transaction
    async def request_password_recovery(self, *, conn: Connection, email: str):
        user_id = await conn.fetchval("select id from usr where email = $1", email)
        if not user_id:
            raise InvalidArgument("permission denied")

        await conn.execute("delete from pending_password_recovery where user_id = $1", user_id)
        await conn.execute(
            "insert into pending_password_recovery (user_id) values ($1)",
            user_id,
        )

    @with_db_transaction
    async def confirm_password_recovery(self, *, conn: Connection, token: str, new_password: str) -> int:
        if not is_valid_uuid(token):
            raise InvalidArgument("Invalid confirmation token")
        row = await conn.fetchrow(
            "select user_id, valid_until from pending_password_recovery where token = $1",
            token,
        )
        user_id = row["user_id"]
        valid_until = row["valid_until"]
        if valid_until is None or valid_until < datetime.now(tz=timezone.utc):
            raise AccessDenied("Invalid confirmation token")

        await conn.execute("delete from pending_password_recovery where user_id = $1", user_id)
        hashed_password = self._hash_password(password=new_password)
        await conn.execute(
            "update usr set hashed_password = $2 where id = $1",
            user_id,
            hashed_password,
        )

        return user_id
