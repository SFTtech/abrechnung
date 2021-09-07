import logging
import re
from pathlib import Path
from typing import Optional

import asyncpg
from asyncpg.pool import Pool

REVISION_DIR = Path(__file__).parent
logger = logging.getLogger(__name__)

REVISION_VERSION_RE = re.compile(r"^-- revision: (?P<version>\w+)$")
REVISION_REQUIRES_RE = re.compile(r"^-- requires: (?P<version>\w+)$")
REVISION_TABLE = "schema_revision"


class SchemaRevision:
    def __init__(
        self, file_name: Path, code: str, version: str, requires: Optional[str]
    ):
        self.file_name = file_name
        self.code = code
        self.version = version
        self.requires = requires

    async def apply(self, conn: asyncpg.Connection):
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
        await conn.execute(self.code)

    @classmethod
    def revisions_from_dir(cls, file_path: Path) -> list["SchemaRevision"]:
        """
        returns an ordered list of revisions with their dependencies resolved
        """
        revisions = []
        for revision in sorted(REVISION_DIR.glob("*.sql")):
            revision_content = revision.read_text("utf-8")
            lines = revision_content.splitlines()
            if not len(lines) > 2:
                raise ValueError(f"Revision {revision} is invalid")

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
            raise ValueError(f"Could not find a revision without any dependencies")

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


async def reset_schema(db_pool: Pool):
    async with db_pool.acquire() as conn:
        async with conn.transaction():
            await conn.execute("drop schema public cascade")
            await conn.execute("create schema public")


async def apply_revisions(db_pool: Pool):
    revisions = SchemaRevision.revisions_from_dir(REVISION_DIR)

    async with db_pool.acquire() as conn:
        async with conn.transaction():
            await conn.execute(
                f"create table if not exists {REVISION_TABLE} ("
                "  version text not null primary key"
                ")"
            )

            curr_revision = await conn.fetchval(
                f"select version from {REVISION_TABLE} limit 1"
            )

            found = curr_revision is None
            for revision in revisions:
                if found:
                    await revision.apply(conn)

                if revision.version == curr_revision:
                    found = True

            if not found:
                raise ValueError(
                    f"Unknown revision {curr_revision} present in database"
                )
