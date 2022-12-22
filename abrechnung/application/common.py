from typing import Optional

import asyncpg


async def _get_or_create_tag_ids(
    *, conn: asyncpg.Connection, group_id: int, tags: Optional[list[str]]
) -> list[int]:
    if not tags or len(tags) <= 0:
        return []
    tag_rows = await conn.fetch(
        "select * from tag where group_id = $1 and name = any(($2::varchar(255)[]))",
        group_id,
        tags,
    )
    tag_ids = [t["id"] for t in tag_rows]
    existing_tag_names = [t["name"] for t in tag_rows]
    for t in tags:
        if t not in existing_tag_names:
            tag_id = await conn.fetchval(
                "insert into tag (group_id, name) values ($1, $2) returning id",
                group_id,
                t,
            )
            tag_ids.append(tag_id)
    return tag_ids
