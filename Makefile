.PHONY: test
test:
	pytest tests --doctest-modules --cov=abrechnung

.PHONY: format
format:
	isort .
	black .
	cd frontend && npx prettier --write . && cd ..

.PHONY: check-format
check-format:
	isort --check-only .
	black --check .

.PHONY: check-format-frontend
check-format-frontend:
	cd frontend && npx prettier --check . && cd ..

.PHONY: lint
lint: pylint mypy

.PHONY: pylint
pylint:
	pylint ./**/*.py

.PHONY: eslint
eslint:
	cd frontend && npx nx lint && cd ..

.PHONY: mypy
mypy:
	mypy --ignore-missing-imports .

.PHONY: package
package:
	flit build

.PHONY: docs
docs:
	$(MAKE) -C docs html

.PHONY: generate-openapi
generate-openapi:
	mkdir -p api
	python3 -m abrechnung -c config.yaml show-openapi > api/openapi.json
