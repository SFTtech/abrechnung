import asyncio
import contextlib
import json
import logging
import os
import re
import shutil
import ssl
import tempfile
from pathlib import Path
from typing import Literal, Optional, Type, TypeVar, Union

import asyncpg
from pydantic import BaseModel

from abrechnung import util

logger = logging.getLogger(__name__)

REVISION_VERSION_RE = re.compile(r"^-- revision: (?P<version>\w+)$")
REVISION_REQUIRES_RE = re.compile(r"^-- requires: (?P<version>\w+)$")
REVISION_TABLE = "schema_revision"


class DatabaseConfig(BaseModel):
    user: Optional[str] = None
    password: Optional[str] = None
    host: Optional[str] = None
    port: Optional[int] = 5432
    dbname: str
    require_ssl: bool = False
    sslrootcert: Optional[str] = None


async def psql_attach(config: DatabaseConfig):
    with contextlib.ExitStack() as exitstack:
        env = dict(os.environ)
        env["PGDATABASE"] = config.dbname

        if config.user is None:
            if config.host is not None:
                raise ValueError("database user is None, but host is set")
            if config.password is not None:
                raise ValueError("database user is None, but password is set")
        else:

            def escape_colon(value: str):
                return value.replace("\\", "\\\\").replace(":", "\\:")

            if (
                config.user is not None
                and config.password is not None
                and config.host is not None
            ):
                passfile = exitstack.enter_context(tempfile.NamedTemporaryFile("w"))
                os.chmod(passfile.name, 0o600)

                passfile.write(
                    ":".join(
                        [
                            escape_colon(config.host),
                            "*",
                            escape_colon(config.dbname),
                            escape_colon(config.user),
                            escape_colon(config.password),
                        ]
                    )
                )
                passfile.write("\n")
                passfile.flush()
                env["PGPASSFILE"] = passfile.name
                env["PGHOST"] = config.host
                env["PGUSER"] = config.user

        command = ["psql", "--variable", "ON_ERROR_STOP=1"]
        if shutil.which("pgcli") is not None:
            # if pgcli is installed, use that instead!
            command = ["pgcli"]

        cwd = os.path.join(os.path.dirname(__file__))
        ret = await util.run_as_fg_process(command, env=env, cwd=cwd)
        return ret


async def drop_all_views(conn: asyncpg.Connection, schema: str):
    # TODO: we might have to find out the dependency order of the views if drop cascade does not work
    result = await conn.fetch(
        "select table_name from information_schema.views where table_schema = $1 and table_name !~ '^pg_';",
        schema,
    )
    views = [row["table_name"] for row in result]
    if len(views) == 0:
        return

    # we use drop if exists here as the cascade dropping might lead the view to being already dropped
    # due to being a dependency of another view
    drop_statements = "\n".join(
        [f"drop view if exists {view} cascade;" for view in views]
    )
    await conn.execute(drop_statements)


async def drop_all_triggers(conn: asyncpg.Connection, schema: str):
    result = await conn.fetch(
        "select distinct on (trigger_name, event_object_table) trigger_name, event_object_table "
        "from information_schema.triggers where trigger_schema = $1",
        schema,
    )
    statements = []
    for row in result:
        trigger_name = row["trigger_name"]
        table = row["event_object_table"]
        statements.append(f"drop trigger {trigger_name} on {table};")

    if len(statements) == 0:
        return

    drop_statements = "\n".join(statements)
    await conn.execute(drop_statements)


async def drop_all_functions(conn: asyncpg.Connection, schema: str):
    result = await conn.fetch(
        "select proname, prokind from pg_proc where pronamespace = $1::regnamespace;",
        schema,
    )
    drop_statements = []
    for row in result:
        kind = row["prokind"].decode("utf-8")
        name = row["proname"]
        if kind == "f" or kind == "w":
            drop_type = "function"
        elif kind == "a":
            drop_type = "aggregate"
        elif kind == "p":
            drop_type = "procedure"
        else:
            raise RuntimeError(f'Unknown postgres function type "{kind}"')
        drop_statements.append(f"drop {drop_type} {name} cascade;")

    if len(drop_statements) == 0:
        return

    drop_code = "\n".join(drop_statements)
    await conn.execute(drop_code)


async def drop_all_constraints(conn: asyncpg.Connection, schema: str):
    """drop all constraints in the given schema which are not unique, primary or foreign key constraints"""
    result = await conn.fetch(
        "select con.conname as constraint_name, rel.relname as table_name, con.contype as constraint_type "
        "from pg_catalog.pg_constraint con "
        "   join pg_catalog.pg_namespace nsp on nsp.oid = con.connamespace "
        "   left join pg_catalog.pg_class rel on rel.oid = con.conrelid "
        "where nsp.nspname = $1 and con.conname !~ '^pg_' "
        "   and con.contype != 'p' and con.contype != 'f' and con.contype != 'u';",
        schema,
    )
    constraints = []
    for row in result:
        constraint_name = row["constraint_name"]
        constraint_type = row["constraint_type"].decode("utf-8")
        table_name = row["table_name"]
        if constraint_type == "c":
            constraints.append(
                f"alter table {table_name} drop constraint {constraint_name};"
            )
        elif constraint_type == "t":
            constraints.append(f"drop constraint trigger {constraint_name};")
        else:
            raise RuntimeError(
                f'Unknown constraint type "{constraint_type}" for constraint "{constraint_name}"'
            )

    if len(constraints) == 0:
        return

    drop_statements = "\n".join(constraints)
    await conn.execute(drop_statements)


async def drop_db_code(conn: asyncpg.Connection, schema: str):
    await drop_all_triggers(conn, schema=schema)
    await drop_all_functions(conn, schema=schema)
    await drop_all_views(conn, schema=schema)
    await drop_all_constraints(conn, schema=schema)


class SchemaRevision:
    def __init__(
        self, file_name: Path, code: str, version: str, requires: Optional[str]
    ):
        self.file_name = file_name
        self.code = code
        self.version = version
        self.requires = requires

    async def apply(self, conn):
        logger.info(
            f"Applying revision {self.file_name.name} with version {self.version}"
        )
        if self.requires:
            version = await conn.fetchval(
                f"update {REVISION_TABLE} set version = $1 where version = $2 returning version",
                self.version,
                self.requires,
            )
            if version != self.version:
                raise ValueError(
                    f"Found other revision present than {self.requires} which was required"
                )
        else:
            n_table = await conn.fetchval(f"select count(*) from {REVISION_TABLE}")
            if n_table != 0:
                raise ValueError(
                    f"Could not apply revision {self.version} as there appears to be a revision present,"
                    f"none was expected"
                )
            await conn.execute(
                f"insert into {REVISION_TABLE} (version) values ($1)", self.version
            )

        # now we can actually apply the revision
        try:
            if (
                len(self.code.splitlines()) > 2
            ):  # does not only consist of first two header comment lines
                await conn.execute(self.code)
        except asyncpg.exceptions.PostgresSyntaxError as exc:
            exc_dict = exc.as_dict()
            position = int(exc_dict["position"])
            message = exc_dict["message"]
            lineno = self.code.count("\n", 0, position) + 1
            raise ValueError(
                f"Syntax error when executing SQL code at character "
                f"{position} ({self.file_name!s}:{lineno}): {message!r}"
            ) from exc

    @classmethod
    def revisions_from_dir(cls, revision_dir: Path) -> list["SchemaRevision"]:
        """
        returns an ordered list of revisions with their dependencies resolved
        """
        revisions = []
        for revision in sorted(revision_dir.glob("*.sql")):
            revision_content = revision.read_text("utf-8")
            lines = revision_content.splitlines()
            if not len(lines) > 2:
                logger.warning(f"Revision {revision} is empty")

            if (version_match := REVISION_VERSION_RE.match(lines[0])) is None:
                raise ValueError(
                    f"Invalid version string in revision {revision}, "
                    f"should be of form '-- revision: <name>'"
                )
            if (requires_match := REVISION_REQUIRES_RE.match(lines[1])) is None:
                raise ValueError(
                    f"Invalid requires string in revision {revision}, "
                    f"should be of form '-- requires: <name>'"
                )

            version = version_match["version"]
            requires: Optional[str] = requires_match["version"]

            if requires == "null":
                requires = None

            revisions.append(
                cls(
                    revision,
                    revision_content,
                    version,
                    requires,
                )
            )

        if len(revisions) == 0:
            return revisions

        # now for the purpose of sorting the revisions according to their dependencies
        first_revision = next((x for x in revisions if x.requires is None), None)
        if first_revision is None:
            raise ValueError("Could not find a revision without any dependencies")

        # TODO: detect revision branches
        sorted_revisions = [first_revision]
        while len(sorted_revisions) < len(revisions):
            curr_revision = sorted_revisions[-1]
            next_revision = next(
                (x for x in revisions if x.requires == curr_revision.version), None
            )
            if next_revision is None:
                raise ValueError(
                    f"Could not find the successor to revision {curr_revision.version}"
                )
            sorted_revisions.append(next_revision)

        return sorted_revisions


async def _apply_db_code(conn: asyncpg.Connection, code_path: Path):
    for code_file in sorted(code_path.glob("*.sql")):
        logger.info(f"Applying database code file {code_file.name}")
        code = code_file.read_text("utf-8")
        await conn.execute(code)


async def apply_revisions(
    db_pool: asyncpg.Pool,
    revision_path: Path,
    code_path: Path,
    until_revision: Optional[str] = None,
):
    revisions = SchemaRevision.revisions_from_dir(revision_path)

    async with db_pool.acquire() as conn:
        async with conn.transaction():
            await conn.execute(
                f"create table if not exists {REVISION_TABLE} (version text not null primary key)"
            )

            curr_revision = await conn.fetchval(
                f"select version from {REVISION_TABLE} limit 1"
            )

            await drop_db_code(conn=conn, schema="public")
            # TODO: perform a dry run to check all revisions before doing anything

            found = curr_revision is None
            for revision in revisions:
                if found:
                    await revision.apply(conn)

                if revision.version == curr_revision:
                    found = True

                if until_revision is not None and revision.version == until_revision:
                    return

            if not found:
                raise ValueError(
                    f"Unknown revision {curr_revision} present in database"
                )

            await _apply_db_code(conn=conn, code_path=code_path)


T = TypeVar("T", bound=BaseModel)


class Connection(asyncpg.Connection):
    async def fetch_one(self, model: Type[T], query: str, *args) -> T:
        result: Optional[asyncpg.Record] = await self.fetchrow(query, *args)
        if result is None:
            raise asyncpg.DataError("not found")

        return model.model_validate(dict(result))

    async def fetch_maybe_one(self, model: Type[T], query: str, *args) -> Optional[T]:
        result: Optional[asyncpg.Record] = await self.fetchrow(query, *args)
        if result is None:
            return None

        return model.model_validate(dict(result))

    async def fetch_many(self, model: Type[T], query: str, *args) -> list[T]:
        # TODO: also allow async cursor
        results: list[asyncpg.Record] = await self.fetch(query, *args)
        return [model.model_validate(dict(r)) for r in results]


async def init_connection(conn: Connection):
    await conn.set_type_codec(
        "json", encoder=json.dumps, decoder=json.loads, schema="pg_catalog"
    )
    await conn.set_type_codec(
        "jsonb", encoder=json.dumps, decoder=json.loads, schema="pg_catalog"
    )


async def create_db_pool(cfg: DatabaseConfig, n_connections=10) -> asyncpg.Pool:
    """
    get a connection pool to the database
    """
    pool = None

    retry_counter = 0
    next_log_at_retry = 0
    while pool is None:
        try:
            sslctx: Optional[Union[ssl.SSLContext, Literal["verify-full", "prefer"]]]
            if cfg.sslrootcert and cfg.require_ssl:
                sslctx = ssl.create_default_context(
                    ssl.Purpose.SERVER_AUTH,
                    cafile=cfg.sslrootcert,
                )
                sslctx.check_hostname = True
            else:
                sslctx = "verify-full" if cfg.require_ssl else "prefer"

            pool = await asyncpg.create_pool(
                user=cfg.user,
                password=cfg.password,
                database=cfg.dbname,
                host=cfg.host,
                max_size=n_connections,
                connection_class=Connection,
                min_size=n_connections,
                ssl=sslctx,
                # the introspection query of asyncpg (defined as introspection.INTRO_LOOKUP_TYPES)
                # can take 1s with the jit.
                # the introspection is triggered to create converters for unknown types,
                # for example the integer[] (oid = 1007).
                # see https://github.com/MagicStack/asyncpg/issues/530
                server_settings={"jit": "off"},
                init=init_connection,
            )
        except Exception as e:  # pylint: disable=broad-except
            sleep_amount = 10
            if next_log_at_retry == retry_counter:
                logger.warning(
                    f"Failed to create database pool: {e}, waiting {sleep_amount} seconds and trying again..."
                )

            retry_counter += 1
            next_log_at_retry = min(retry_counter * 2, 2**9)
            await asyncio.sleep(sleep_amount)

    return pool
