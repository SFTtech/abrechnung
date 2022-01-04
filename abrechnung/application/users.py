from datetime import datetime, timezone
from typing import Optional

import bcrypt
from asyncpg.pool import Pool
from email_validator import validate_email, EmailNotValidError

from abrechnung.domain.users import User, Session
from . import Application, NotFoundError, InvalidCommand
from ..config import Config


class InvalidPassword(Exception):
    pass


class LoginFailed(Exception):
    pass


class UserService(Application):
    def __init__(
        self,
        db_pool: Pool,
        config: Config,
    ):
        super().__init__(db_pool=db_pool, config=config)

        self.enable_registration = self.cfg["api"]["enable_registration"]
        self.valid_email_domains = self.cfg["api"]["valid_email_domains"]

    @staticmethod
    def _hash_password(password: str) -> str:
        salt = bcrypt.gensalt()
        return bcrypt.hashpw(password=password.encode("utf-8"), salt=salt).decode()

    @staticmethod
    def _check_password(password: str, hashed_password: str) -> bool:
        return bcrypt.checkpw(
            password=password.encode("utf-8"),
            hashed_password=hashed_password.encode("utf-8"),
        )

    async def _verify_user_password(self, user_id: int, password: str) -> bool:
        async with self.db_pool.acquire() as conn:
            user = await conn.fetchrow(
                "select hashed_password, pending, deleted from usr where id = $1",
                user_id,
            )
            if user is None:
                raise NotFoundError(f"User with id {user_id} does not exist")

            if user["deleted"] or user["pending"]:
                return False

            return self._check_password(password, user["hashed_password"])

    async def is_session_token_valid(self, token: str) -> Optional[tuple[int, int]]:
        """returns the session id"""
        async with self.db_pool.acquire() as conn:
            async with conn.transaction():
                row = await conn.fetchrow(
                    "select user_id, id from session where token = $1 and valid_until is null or valid_until > now()",
                    token,
                )
                if row:
                    await conn.execute(
                        "update session set last_seen = now() where token = $1", token
                    )

                return row

    async def login_user(
        self, username: str, password: str, session_name: str
    ) -> tuple[int, int, str]:
        """
        validate whether a given user can login

        If successful return the user id, a new session id and a session token
        """
        async with self.db_pool.acquire(timeout=1) as conn:
            async with conn.transaction():
                user = await conn.fetchrow(
                    "select id, hashed_password, pending, deleted from usr where username = $1 or email = $1",
                    username,
                )
                if user is None:
                    raise InvalidCommand(f"Login failed")

                if not self._check_password(password, user["hashed_password"]):
                    raise InvalidCommand(f"Login failed")

                if user["deleted"]:
                    raise InvalidCommand(f"User is not permitted to login")

                if user["pending"]:
                    raise InvalidCommand(
                        f"You need to confirm your email before logging in"
                    )

                session_token, session_id = await conn.fetchrow(
                    "insert into session (user_id, name) values ($1, $2) returning token, id",
                    user["id"],
                    session_name,
                )

                return user["id"], session_id, session_token

    async def logout_user(self, *, user_id: int, session_id: int):
        async with self.db_pool.acquire(timeout=1) as conn:
            async with conn.transaction():
                sess_id = await conn.fetchval(
                    "delete from session where id = $1 and user_id = $2 returning id",
                    session_id,
                    user_id,
                )
                if sess_id is None:
                    raise InvalidCommand(f"Already logged out")

    async def register_user(self, username: str, email: str, password: str) -> int:
        """Register a new user, returning the newly created user id and creating a pending registration entry"""
        if not self.enable_registration:
            raise PermissionError(f"User registrations are disabled on this server")

        if self.valid_email_domains is not None:
            splitted = email.split("@")
            if len(splitted) == 0:
                raise InvalidCommand(f"Invalid email {email}")

            domain = splitted[-1]
            if domain not in self.valid_email_domains:
                raise PermissionError(
                    f"Only users with emails out of the following domains are "
                    f"allowed: {self.valid_email_domains}"
                )

        try:
            valid = validate_email(email)
            email = valid.email
        except EmailNotValidError as e:
            raise InvalidCommand(str(e))

        async with self.db_pool.acquire() as conn:
            async with conn.transaction():
                hashed_password = self._hash_password(password)
                user_id = await conn.fetchval(
                    "insert into usr (username, email, hashed_password) values ($1, $2, $3) returning id",
                    username,
                    email,
                    hashed_password,
                )
                if user_id is None:
                    raise InvalidCommand(f"Registering new user failed")

                await conn.execute(
                    "insert into pending_registration (user_id) values ($1)", user_id
                )

                return user_id

    async def confirm_registration(self, token: str) -> int:
        async with self.db_pool.acquire() as conn:
            async with conn.transaction():
                row = await conn.fetchrow(
                    "select user_id, valid_until from pending_registration where token = $1",
                    token,
                )
                if row is None:
                    raise PermissionError(f"Invalid registration token")

                user_id = row["user_id"]
                valid_until = row["valid_until"]
                if valid_until is None or valid_until < datetime.now(tz=timezone.utc):
                    raise PermissionError(f"Invalid registration token")

                await conn.execute(
                    "delete from pending_registration where user_id = $1", user_id
                )
                await conn.execute(
                    "update usr set pending = false where id = $1", user_id
                )

                return user_id

    async def get_user(self, user_id: int) -> User:
        async with self.db_pool.acquire() as conn:
            user = await conn.fetchrow(
                "select id, email, registered_at, username, pending, deleted from usr where id = $1",
                user_id,
            )

            if user is None:
                raise NotFoundError(f"User with id {user_id} does not exist")

            rows = await conn.fetch(
                "select id, name, valid_until, last_seen from session where user_id = $1",
                user_id,
            )
            sessions = [
                Session(
                    id=row["id"],
                    name=row["name"],
                    valid_until=row["valid_until"],
                    last_seen=row["last_seen"],
                )
                for row in rows
            ]

            return User(
                id=user["id"],
                email=user["email"],
                registered_at=user["registered_at"],
                username=user["username"],
                pending=user["pending"],
                deleted=user["deleted"],
                sessions=sessions,
            )

    async def delete_session(self, user_id: int, session_id: int):
        async with self.db_pool.acquire() as conn:
            async with conn.transaction():
                sess_id = await conn.fetchval(
                    "delete from session where id = $1 and user_id = $2 returning id",
                    session_id,
                    user_id,
                )
                if not sess_id:
                    raise NotFoundError(f"no such session found with id {session_id}")

    async def rename_session(self, user_id: int, session_id: int, name: str):
        async with self.db_pool.acquire() as conn:
            async with conn.transaction():
                sess_id = await conn.fetchval(
                    "update session set name = $3 where id = $1 and user_id = $2 returning id",
                    session_id,
                    user_id,
                    name,
                )
                if not sess_id:
                    raise NotFoundError(f"no such session found with id {session_id}")

    async def change_password(self, user_id: int, old_password: str, new_password: str):
        async with self.db_pool.acquire() as conn:
            valid_pw = await self._verify_user_password(user_id, old_password)
            if not valid_pw:
                raise InvalidPassword

            hashed_password = self._hash_password(new_password)
            await conn.execute(
                "update usr set hashed_password = $1 where id = $2",
                hashed_password,
                user_id,
            )

    async def request_email_change(self, user_id: int, password: str, email: str):
        try:
            valid = validate_email(email)
            email = valid.email
        except EmailNotValidError as e:
            raise InvalidCommand(str(e))

        async with self.db_pool.acquire() as conn:
            valid_pw = await self._verify_user_password(user_id, password)
            if not valid_pw:
                raise InvalidPassword

            await conn.execute(
                "insert into pending_email_change (user_id, new_email) values ($1, $2)",
                user_id,
                email,
            )

    async def confirm_email_change(self, token: str) -> int:
        async with self.db_pool.acquire() as conn:
            async with conn.transaction():
                row = await conn.fetchrow(
                    "select user_id, new_email, valid_until from pending_email_change where token = $1",
                    token,
                )
                user_id = row["user_id"]
                valid_until = row["valid_until"]
                if valid_until is None or valid_until < datetime.now(tz=timezone.utc):
                    raise PermissionError

                await conn.execute(
                    "delete from pending_email_change where user_id = $1", user_id
                )
                await conn.execute(
                    "update usr set email = $2 where id = $1", user_id, row["new_email"]
                )

                return user_id

    async def request_password_recovery(self, email: str):
        async with self.db_pool.acquire() as conn:
            async with conn.transaction():
                user_id = await conn.fetchval(
                    "select id from usr where email = $1", email
                )
                if not user_id:
                    raise PermissionError

                await conn.execute(
                    "insert into pending_password_recovery (user_id) values ($1)",
                    user_id,
                )

    async def confirm_password_recovery(self, token: str, new_password: str) -> int:
        async with self.db_pool.acquire() as conn:
            async with conn.transaction():
                row = await conn.fetchrow(
                    "select user_id, valid_until from pending_password_recovery where token = $1",
                    token,
                )
                user_id = row["user_id"]
                valid_until = row["valid_until"]
                if valid_until is None or valid_until < datetime.now(tz=timezone.utc):
                    raise PermissionError

                await conn.execute(
                    "delete from pending_password_recovery where user_id = $1", user_id
                )
                hashed_password = self._hash_password(password=new_password)
                await conn.execute(
                    "update usr set hashed_password = $2 where id = $1",
                    user_id,
                    hashed_password,
                )

                return user_id
