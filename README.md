# Stocks Insider Proof of Concept

This project demonstrates a TypeScript full-stack application that surfaces recent insider transactions (Forms 3/4/5) filed with the U.S. SEC. Data is loaded directly from the public SEC endpoints without any paid APIs or persistence.

## Project layout

- `server` – Express + TypeScript API that fetches SEC data, normalizes transactions, and applies polite rate limiting with a descriptive User-Agent.
- `client` – Vite + React TypeScript single-page app with ticker validation and transaction tables.

## Prerequisites

- Node.js 18+
- npm

To follow SEC guidance, set a descriptive User-Agent string before running the API:

```bash
export SEC_USER_AGENT="stocks-insider-poc/1.0 (byrondaniels@gmail.com)"
```

## Running the API (`/server`)

```bash
cd server
npm install
npm run dev
```

The development server starts on http://localhost:3001.

The API caches SEC responses in-memory and also persists normalized insider lookups to `server/data/insiders.json` using LowDB. Cached entries are considered fresh for 24 hours; remove the file if you want to force a refresh.

## Running the client (`/client`)

```bash
cd client
npm install
npm run dev
```

Vite serves the React app on http://localhost:5173 and proxies `/api` requests to the Express backend.

## Optional `make` helpers

From the repository root you can use:

- `make server-dev` – run the Express API with `SEC_USER_AGENT` applied.
- `make client-dev` – start the Vite dev server.
- `make server-build` / `make client-build` – compile each project.
- `make install` – install dependencies for both services.

## Notes

- The stack runs locally with no external database; normalized insider lookups persist to `server/data/insiders.json` via LowDB.
- Persisted entries are reused for 24 hours so repeat lookups avoid refetching the SEC data unless the cache expires.
- The API limits requests to the three most recent Form 3/4/5 filings per ticker and caches ticker lookups to reduce load against SEC endpoints.
- If you deploy the client separately, configure an environment variable (e.g. `VITE_API_BASE_URL`) or update the fetch call to point at the deployed API host.
