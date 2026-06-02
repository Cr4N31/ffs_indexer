# For Fox Sake Contracts

Hardhat 3 contract package for the FFS bottle game.

## Local checks

```shell
npm install
npm test
```

## Cronos testnet deployment

Create a local `.env` using `.env.example`, then deploy the test token and bottle:

```shell
npm run deploy:mock:cronos
$env:FFS_TOKEN_ADDRESS="0x..."
npm run deploy:bottle:cronos
```

Deployment outputs are saved to:

- `deployments/mock-ffs.json`
- `deployments/ffs-bottle.json`

Verify the bottle after deployment:

```shell
npm run verify:bottle:cronos -- 0xBottleAddress 0xFfsTokenAddress 0xAdminAddress
```

Before seeding, approve the bottle to spend `100000 FFS` from the admin wallet. Before pouring, each user must approve the bottle to spend `1000 FFS`.
