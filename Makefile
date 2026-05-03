.PHONY: help dev dev-frontend dev-backend build install-deps clean

help:
	@echo "Pokémon Battle — Available Commands:"
	@echo ""
	@echo "  make dev          - Start both backend and frontend dev servers"
	@echo "  make dev-frontend - Start the frontend dev server only"
	@echo "  make dev-backend  - Start the Rust backend server only"
	@echo "  make build        - Build the frontend for production"
	@echo "  make install-deps - Install all dependencies"
	@echo "  make clean        - Clean build artifacts"

dev:
	@trap 'kill 0' INT; \
	(cd backend && cargo run) & \
	(cd frontend && npm run dev) & \
	wait

dev-frontend:
	cd frontend && npm run dev

dev-backend:
	cd backend && cargo run

build:
	cd frontend && npm run build

install-deps:
	cd frontend && npm install
	cd backend && cargo fetch

clean:
	rm -rf frontend/dist frontend/node_modules/.vite backend/target
