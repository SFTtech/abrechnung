.PHONY: test
test:
	pytest tests --doctest-modules --cov=abrechnung

.PHONY: format
format:
	black .
	yarn --cwd web run prettier --write .

.PHONY: check-format
check-format:
	black --check .

.PHONY: check-format-web
check-format-web:
	yarn --cwd web run prettier --check .

.PHONY: lint
lint: pylint mypy bandit

.PHONY: pylint
pylint:
	pylint ./**/*.py

.PHONY: mypy
mypy:
	mypy --ignore-missing-imports .

.PHONY: bandit
bandit:
	bandit -r .

.PHONY: package
package:
	flit build

.PHONY: docs
docs:
	$(MAKE) -C docs html