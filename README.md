# FFS Indexer Backend

Production backend indexer for the For Fox Sake dApp.

This service watches the production `FFSBottle` contract for `RoundStarted`, `Poured`, and `BottleSipped` events, writes them to PostgreSQL, and exposes REST APIs for frontend consumption.

## Required Production Configuration

```env
RPC_URL=https://evm.cronos.org
CHAIN_ID=25
CHAIN_NAME=Cronos Mainnet
FFS_TOKEN_ADDRESS=0xf9D90e9f8E3fcc41D44e220deDB73DF6c42c8244
FFS_BOTTLE_ADDRESS=0x93E7a174E1DadfE429De8D0E0f281ee1851820E9
TREASURY_WALLET=0x75d04bcA6B542Fe1f3EeE8196DEB2C2675dAABcb
```

The treasury wallet is a fee receiver only. The indexer listens only to `FFS_BOTTLE_ADDRESS`.

## Install And Run

```bash
cd ffs-indexer
npm install
cp .env.example .env
npm run db:schema
npm run dev
```

## Environment Variables

- `PORT` - optional API server port.
- `DATABASE_URL` - PostgreSQL connection string.
- `RPC_URL` - must be `https://evm.cronos.org`.
- `CHAIN_ID` - must be `25`.
- `CHAIN_NAME` - must be `Cronos Mainnet`.
- `FFS_TOKEN_ADDRESS` - canonical FFS ERC20 token address.
- `FFS_BOTTLE_ADDRESS` - canonical `FFSBottle` contract address.
- `TREASURY_WALLET` - canonical treasury wallet, not indexed as a contract.
- `START_BLOCK` - starting block for backfill.
- `CONFIRMATIONS` - confirmations to wait before backfilling up to a block.
- `LOG_BLOCK_RANGE` - optional max block span per `getLogs` request, default `1900`.
- `CORS_ORIGIN` - allowed frontend origin.
- `POLL_INTERVAL_MS` - optional watcher polling interval.

## API Endpoints

- `GET /api/winners` - returns recent `BottleSipped` winners.
- `GET /api/activity` - returns recent `Poured` and `BottleSipped` activity.
- `GET /api/stats` - returns aggregate stats.
- `GET /api/holders` - returns unique pouring wallets from indexed pours.
- `GET /health` - health check.

## Production Notes

- Backfill runs from `START_BLOCK` to the latest confirmed block in Cronos-safe block ranges.
- Inserts are idempotent by transaction hash, so restarts do not duplicate records.
- Set `START_BLOCK` to the deployment block for `0x93E7a174E1DadfE429De8D0E0f281ee1851820E9` for faster startup.
