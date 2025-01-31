.PHONY: test
test:
	pytest tests --doctest-modules --cov=abrechnung

.PHONY: format
format:
	ruff format
	cd frontend && npx prettier --write . && cd ..

.PHONY: check-format
check-format:
	ruff format --check

.PHONY: check-format-frontend
check-format-frontend:
	cd frontend && npx prettier --check . && cd ..

.PHONY: lint
lint: pylint mypy ruff

.PHONY: pylint
pylint:
	pylint ./**/*.py

.PHONY: ruff
ruff:
	ruff check

.PHONY: ruff-fix
ruff-fix:
	ruff check --fix

.PHONY: eslint
eslint:
	cd frontend && npx nx lint && cd ..

.PHONY: mypy
mypy:
	mypy .

.PHONY: docs
docs:
	$(MAKE) -C docs html

.PHONY: serve-docs
serve-docs:
	python3 -m http.server -d docs/_build/html 8888

.PHONY: generate-openapi
generate-openapi:
	mkdir -p api
	python3 -m abrechnung -c config.yaml show-openapi > api/openapi.json
