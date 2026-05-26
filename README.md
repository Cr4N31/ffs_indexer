# FFS Indexer Backend

Backend indexer for the For Fox Sake Dapp.

This service watches the `FFSBottle` contract for `Poured` and `BottleSipped` events, writes them to PostgreSQL, and exposes REST APIs for frontend consumption.

## Prerequisites

- Node.js 18+ installed
- npm available
- PostgreSQL database
- Access to a Cronos-compatible RPC endpoint
- `FFSBottle` contract ABI JSON available locally

## Install and run locally

```bash
cd ffs-indexer
npm install
cp .env.example .env
npm run db:schema
npm run dev
```

## Environment variables

The indexer uses the following variables from `.env`:

- `PORT` — optional API server port (default: `4000`)
- `DATABASE_URL` — PostgreSQL connection string
- `RPC_URL` — RPC endpoint used for event watching
- `CHAIN_ID` — optional chain ID, currently the indexer uses Cronos Testnet by default
- `CHAIN_NAME` — optional chain name
- `FFS_BOTTLE_ADDRESS` — deployed `FFSBottle` contract address
- `FFS_BOTTLE_ABI_PATH` — path to the local `FFSBottle.json` ABI file
- `START_BLOCK` — starting block for event indexing (used by the indexer logic)
- `CONFIRMATIONS` — optional confirmations to wait for event stability
- `CORS_ORIGIN` — allowed frontend origin for API requests (default in example: `http://localhost:5173`)
- `POLL_INTERVAL_MS` — optional contract watcher polling interval in milliseconds

## Database setup

Run the schema script to create the required tables:

```bash
npm run db:schema
```

This executes `src/schema.js` and applies the SQL in `schema.sql`.

## API endpoints

- `GET /api/winners` — returns recent `BottleSipped` winners
- `GET /api/activity` — returns recent `Poured` and `BottleSipped` activity
- `GET /api/stats` — returns aggregate stats such as total pours, total sips, amounts paid to winners and treasury, and latest round
- `GET /health` — simple health check endpoint

## What the indexer does

- Connects to PostgreSQL using `DATABASE_URL`
- Watches the `FFSBottle` contract for `Poured` and `BottleSipped` events
- Records pours, winners, and round summary data
- Serves aggregated data to the frontend via REST APIs

## Start production server

```bash
npm start
```

## Notes

- The indexer is designed to run alongside the frontend, providing event history and aggregate stats.
- Ensure the frontend `VITE_FFS_API_URL` points to the indexer API server.
