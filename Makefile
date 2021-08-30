.PHONY: test
test:
	python -m unittest

.PHONY: format
format:
	black .

.PHONY: check-format
check-format:
	black --check .

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
	python3 -m build