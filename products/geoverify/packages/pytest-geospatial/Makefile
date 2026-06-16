.PHONY: help install install-dev test test-cov lint format format-check typecheck clean build docs

PYTHON := python3
PIP := $(PYTHON) -m pip

help:
	@echo "Available targets:"
	@echo "  install       Install package in editable mode"
	@echo "  install-dev   Install package with dev dependencies"
	@echo "  test          Run the test suite"
	@echo "  test-cov      Run tests with coverage"
	@echo "  lint          Run ruff linter"
	@echo "  format        Run black and ruff formatters"
	@echo "  format-check  Check formatting without modifying files"
	@echo "  typecheck     Run mypy type checker"
	@echo "  clean         Remove build artifacts"
	@echo "  build         Build sdist and wheel"
	@echo "  docs          Serve MkDocs documentation locally"

install:
	$(PIP) install -e .

install-dev:
	$(PIP) install -e ".[dev,docs]"

test:
	$(PYTHON) -m pytest -q

test-cov:
	$(PYTHON) -m pytest --cov=src/pytest_geospatial --cov-report=term-missing --cov-report=xml

lint:
	$(PYTHON) -m ruff check src tests

format:
	$(PYTHON) -m black src tests
	$(PYTHON) -m ruff check --fix src tests

format-check:
	$(PYTHON) -m black --check src tests
	$(PYTHON) -m ruff check src tests

typecheck:
	$(PYTHON) -m mypy src/pytest_geospatial

clean:
	rm -rf build dist *.egg-info .pytest_cache .coverage coverage.xml htmlcov
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name '*.pyc' -delete

build: clean
	$(PYTHON) -m build

docs:
	$(PYTHON) -m mkdocs serve
