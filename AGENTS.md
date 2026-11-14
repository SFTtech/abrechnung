# Abrechnung Codebase Instructions

Abrechnung is an open source splitwise / tricount alternative: a Python (FastAPI + PostgreSQL) backend in `abrechnung/` and a React web app in `apps/web/`. Shared frontend code lives in `libs/` (translations are in `libs/translations/src/lib/<lang>.json`).

Backend layers: `database/` (migrations and SQL) → `domain/` (Pydantic models) → `application/` (services) → `http/` (FastAPI routers). Permission helpers live in `core/` (`decorators.py`, `auth.py`).

## Key Architectural Patterns

### Permission Model

Three-tier group membership: **owner** → **can_write** (editor) → **read-only** member

- Checks live in the **application service layer**, never in HTTP routers. Routers only call services with the `user` parameter.
- Service methods receive `user: User` and validate access via `@requires_group_permissions()` (use `requires_write=True` for writes) from `abrechnung/core/decorators.py`, or via `check_group_permissions()` from `abrechnung/core/auth.py`.

### Services and Database

- All business logic lives in Service classes (`abrechnung/application/*.py`) inheriting from `sftkit.service.Service[Config]`. Cross-service dependencies are injected in [Context](abrechnung/http/context.py).
- Never query the database directly in routers.
- Methods decorated with `sftkit.service.with_db_transaction` receive a `conn: Connection` parameter. Do not begin or commit transactions manually.
- Use raw SQL with asyncpg parameter binding (`conn.fetch_one()`, `conn.fetch_many()`, `conn.fetchval()`) and map results to Pydantic models.
- Constraints and cascades are defined at the schema level (e.g. group deletion cascades to memberships).

## Workflows

### Backend

```bash
just test    # pytest; needs a running Postgres (TEST_DB_* env vars, default db `abrechnung_test`, see tests/conftest.py)
just lint    # pylint + ty + ruff
just format  # ruff + vp fmt (also formats the frontend)
abrechnung -c config.yaml -vvv api  # start the API server with the dev config in the repo root
```

### Frontend

The frontend is a pnpm workspace using Vite+ (`vp`).

```bash
just dev-web                  # dev server
pnpm --filter web run build   # production build
pnpm -r run test              # tests for all projects
```

### Database migrations

```bash
uv run sftkit create-migration <migration-name>
```

This creates the file in `abrechnung/database/revisions/`. Then set `CURRENT_REVISION` in `abrechnung/database/migrations.py` to the new revision ID.

## Adding API Endpoints

1. Add or extend the **domain model** in `abrechnung/domain/*.py` (Pydantic).
2. Add the **service method** in `abrechnung/application/*.py` (`@with_db_transaction`, plus `@requires_group_permissions()` where needed).
3. Add the **router** in `abrechnung/http/routers/*.py`, injecting the service via `Depends()`.
4. **Always** run `just generate-openapi` after changing any model or endpoint used by the HTTP API. This updates `api/openapi.json` and the generated frontend client (`apps/web/src/core/generated/api.ts`). Commit the results.
