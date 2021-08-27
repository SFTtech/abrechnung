.PHONY: test
test:
	python -m unittest

.PHONY: format
format:
	black .