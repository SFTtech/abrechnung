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
lint: pylint mypy ruff

.PHONY: pylint
pylint:
	uv run pylint ./**/*.py

.PHONY: ruff
ruff:
	uv run ruff check

.PHONY: ruff-fix
ruff-fix:
	uv run ruff check --fix

.PHONY: mypy
mypy:
	uv run mypy .

.PHONY: docs
docs:
	$(MAKE) -C docs html

.PHONY: serve-docs
serve-docs:
	uv run -m http.server -d docs/_build/html 8888

.PHONY: generate-openapi
generate-openapi:
	mkdir -p api
	uv run abrechnung -c config.yaml show-openapi > api/openapi.json
	npx nx run-many --target generate-openapi
