.PHONY: dev test build

dev:
	@bash scripts/dev.sh

test:
	pytest tests/ -x -q
	cd frontend && npm run build

build:
	cd frontend && npm ci && npm run build
