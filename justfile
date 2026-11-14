default:
    @just --list

test:
    uv run pytest tests --doctest-modules --cov=abrechnung

dev-web:
    pnpm --filter web run dev

format:
    uv run ruff format
    pnpm exec vp fmt

check-format:
    uv run ruff format --check

check-format-frontend:
    pnpm exec vp fmt --check

lint: pylint typecheck ruff

pylint:
    uv run pylint ./**/*.py

ruff:
    uv run ruff check

ruff-fix:
    uv run ruff check --fix

typecheck:
    uv run ty check

docs:
    uv run sphinx-build docs docs/_build

serve-docs:
    uv run sphinx-autobuild docs docs/_build

generate-openapi:
    mkdir -p api
    uv run abrechnung -c config.yaml show-openapi > api/openapi.json
    pnpm --filter web run generate-openapi
    pnpm exec vp fmt apps/web/src/core/generated/api.ts
