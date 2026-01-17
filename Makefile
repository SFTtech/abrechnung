.PHONY: test
test:
	uv run pytest tests --doctest-modules --cov=abrechnung

.PHONY: format
format:
	uv run ruff format
	npx oxfmt

.PHONY: check-format
check-format:
	uv run ruff format --check

.PHONY: check-format-frontend
check-format-frontend:
	npx oxfmt --check

.PHONY: lint
lint: pylint typecheck ruff

.PHONY: pylint
pylint:
	uv run pylint ./**/*.py

.PHONY: ruff
ruff:
	uv run ruff check

.PHONY: ruff-fix
ruff-fix:
	uv run ruff check --fix

.PHONY: typecheck
typecheck:
	uv run ty check

.PHONY: docs
docs:
	uv run sphinx-build docs docs/_build

.PHONY: serve-docs
serve-docs:
	uv run sphinx-autobuild docs docs/_build

.PHONY: generate-openapi
generate-openapi:
	mkdir -p api
	uv run abrechnung -c config.yaml show-openapi > api/openapi.json
	npx nx run-many --target generate-openapi
