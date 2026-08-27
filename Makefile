.PHONY: install dev build test lint clean

install:
	python3 -m venv venv
	. venv/bin/activate && pip install -r requirements.txt
	cd web && npm install

dev:
	@echo "Start backend: python3 desktop.py"
	@echo "Start frontend: cd web && npm run dev"

build:
	cd web && npm run build
	pyinstaller Quill.spec

test:
	python -m pytest tests/ -v

lint:
	ruff check .
	cd web && npx tsc --noEmit

clean:
	rm -rf dist/ build/ __pycache__ .pytest_cache
	cd web && rm -rf dist/ node_modules/
