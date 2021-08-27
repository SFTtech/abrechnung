import bcrypt

from abrechnung.domain.users import User
from . import Application, NotFoundError


class InvalidPassword(Exception):
    pass


class LoginFailed(Exception):
    pass


class Users(Application):
    @staticmethod
    async def _hash_password(password: str) -> str:
        salt = bcrypt.gensalt()
        return bcrypt.hashpw(password=password.encode("utf-8"), salt=salt).decode()

    @staticmethod
    async def _check_password(password: str, hashed_password: str) -> bool:
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

            return await self._check_password(password, res["hashed_password"])

    async def login_user(self, username: str, password: str) -> tuple[int, str]:
        """
        validate whether a given user can login

        If successful return the user id and a session token
        """
        async with self.db_pool.acquire() as conn:
            async with conn.transaction():
                user = await conn.fetchrow(
                    "select id, hashed_password, pending, deleted from usr where username = $1",
                    username,
                )
                if user is None:
                    raise NotFoundError(f"User with username {username} does not exist")

                if not self._check_password(password, user["hashed_password"]):
                    raise InvalidPassword

                if user["pending"] or user["deleted"]:
                    raise LoginFailed(f"User is not permitted to login")

                session_token = await conn.fetchval(
                    "insert into session (user_id) values ($1) returning token",
                    user["id"],
                )

                return user["id"], session_token

    async def register_user(self, username: str, email: str, password: str) -> int:
        """Register a new user, returning the newly created user id and creating a pending registration entry"""
        async with self.db_pool.acquire() as conn:
            async with conn.transaction():
                hashed_password = self._hash_password(password)
                user_id = await conn.fetchval(
                    "insert into usr (email, hashed_password, username) values ($1, $2, $3) returning id",
                    email,
                    username,
                    hashed_password,
                )
                if user_id is None:
                    raise NotFoundError(f"User with id {user_id} does not exist")
                await conn.execute(
                    "insert into pending_registration (user_id) values ($1)", user_id
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

            return User(
                id=user["id"],
                email=user["email"],
                registered_at=user["registered_at"],
                username=user["username"],
                pending=user["pending"],
                deleted=user["deleted"],
            )

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
        async with self.db_pool.acquire() as conn:
            valid_pw = await self._verify_user_password(user_id, password)
            if not valid_pw:
                raise InvalidPassword

            await conn.execute(
                "insert into pending_email_change (user_id, new_email) values ($1, $2)",
                user_id,
                email,
            )
