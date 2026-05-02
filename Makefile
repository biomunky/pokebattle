.PHONY: help dev build tauri-dev tauri-build tauri-clean clean

help:
	@echo "Pokémon Top Trumps — Available Commands:"
	@echo ""
	@echo "  make dev          - Start the frontend dev server"
	@echo "  make build        - Build the frontend for production"
	@echo "  make tauri-dev    - Run Tauri desktop app in development mode"
	@echo "  make tauri-build  - Build Tauri desktop app for production"
	@echo "  make tauri-clean  - Clean Tauri build artifacts"
	@echo "  make clean        - Clean all build artifacts"

dev:
	cd frontend && npm run dev

build:
	cd frontend && npm run build

tauri-dev:
	cargo tauri dev

tauri-build:
	cargo tauri build

tauri-clean:
	rm -rf src-tauri/target frontend/dist

clean:
	rm -rf frontend/dist frontend/node_modules/.vite
