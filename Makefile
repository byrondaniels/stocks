SEC_USER_AGENT ?= stocks-insider-poc/1.0 (byrondaniels@gmail.com)

.PHONY: server-install server-build server-dev client-install client-build client-dev install build dev

server-install:
	cd server && npm install

server-build:
	cd server && npm run build

server-dev:
	cd server && SEC_USER_AGENT="$(SEC_USER_AGENT)" npm run dev

client-install:
	cd client && npm install

client-build:
	cd client && npm run build

client-dev:
	cd client && npm run dev

install: server-install client-install

build: server-build client-build

dev:
	@echo "Run 'make server-dev' and 'make client-dev' in separate terminals."
