import { formatUnits } from 'viem'
import { createChainClient, getBottleAddress, loadBottleAbi } from './contract.js'
import { query } from './db.js'

const RETRY_DELAY_MS = 5000
const DEFAULT_LOG_BLOCK_RANGE = 1900

function formatFfs(value) {
  return Number(formatUnits(value, 18))
}

async function ensureRoundExists(roundNumber) {
  await query(
    `
      insert into rounds (round_number, started_at, participants_count)
      values ($1, now(), 0)
      on conflict (round_number) do nothing
    `,
    [Number(roundNumber)],
  )
}

async function handleRoundStarted(log) {
  try {
    const { round } = log.args
    await ensureRoundExists(round)
    console.log(`[ROUND] Round ${round} started`)
  } catch (error) {
    console.error(`Failed to record round start event ${log.transactionHash}:`, error)
  }
}

async function updateRoundAfterSip(roundNumber, winner, winnerAmount, treasuryAmount) {
  const participantsResult = await query(
    `
      select count(distinct wallet_address) as participant_count,
             coalesce(sum(amount), 0) as total_collected
      from pours
      where round_number = $1
    `,
    [Number(roundNumber)],
  )

  const participantsCount = Number(participantsResult.rows[0]?.participant_count ?? 0)
  const totalCollected = participantsResult.rows[0]?.total_collected ?? 0

  await query(
    `
      update rounds
      set ended_at = now(),
          total_collected = $1,
          winner_address = $2,
          winner_amount = $3,
          treasury_amount = $4,
          participants_count = $5
      where round_number = $6
    `,
    [totalCollected, winner, winnerAmount, treasuryAmount, participantsCount, Number(roundNumber)],
  )

  await query(
    `
      insert into rounds (round_number, started_at, participants_count)
      values ($1, now(), 0)
      on conflict (round_number) do nothing
    `,
    [Number(roundNumber) + 1],
  )
}

async function handlePoured(log) {
  try {
    const { round, user, croAmount, ffsAmount, bottleBalance, roundPours } = log.args
    await ensureRoundExists(round)

    await query(
      `
        insert into pours (
          wallet_address,
          amount,
          cro_amount,
          ffs_amount,
          bottle_balance,
          round_pours,
          transaction_hash,
          round_number,
          poured_at
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, now())
        on conflict (transaction_hash) do nothing
      `,
      [
        user,
        formatUnits(croAmount, 18),
        formatUnits(croAmount, 18),
        formatUnits(ffsAmount, 18),
        formatUnits(bottleBalance, 18),
        Number(roundPours),
        log.transactionHash,
        Number(round),
      ],
    )

    console.log(
      `[POUR] ${user} poured ${formatFfs(croAmount)} CRO and ${formatFfs(ffsAmount)} FFS in round ${round}`,
    )
  } catch (error) {
    console.error(`Failed to record pour event ${log.transactionHash}:`, error)
  }
}

async function handleBottleSipped(log) {
  try {
    const { round, winner, winnerAmount, treasuryAmount } = log.args

    await updateRoundAfterSip(round, winner, formatUnits(winnerAmount, 18), formatUnits(treasuryAmount, 18))

    await query(
      `
        insert into winners (winner_address, amount_won, treasury_amount, transaction_hash, round_number, won_at)
        values ($1, $2, $3, $4, $5, now())
        on conflict (transaction_hash) do nothing
      `,
      [winner, formatUnits(winnerAmount, 18), formatUnits(treasuryAmount, 18), log.transactionHash, Number(round)],
    )

    console.log(`[SIP] ${winner} won ${formatFfs(winnerAmount)} FFS in round ${round}`)
  } catch (error) {
    console.error(`Failed to record sip event ${log.transactionHash}:`, error)
  }
}

async function processLogs(eventName, logs) {
  const sortedLogs = [...logs].sort((a, b) => {
    if (a.blockNumber === b.blockNumber) return Number(a.logIndex) - Number(b.logIndex)
    return a.blockNumber < b.blockNumber ? -1 : 1
  })

  for (const log of sortedLogs) {
    if (eventName === 'RoundStarted') {
      await handleRoundStarted(log)
    } else if (eventName === 'Poured') {
      await handlePoured(log)
    } else if (eventName === 'BottleSipped') {
      await handleBottleSipped(log)
    }
  }
}

async function backfillEvent(client, address, abi, eventName, fromBlock, toBlock) {
  const range = BigInt(Number(process.env.LOG_BLOCK_RANGE || DEFAULT_LOG_BLOCK_RANGE))

  for (let start = fromBlock; start <= toBlock; start += range + 1n) {
    const end = start + range > toBlock ? toBlock : start + range
    const logs = await client.getContractEvents({
      address,
      abi,
      eventName,
      fromBlock: start,
      toBlock: end,
    })

    if (logs.length > 0) {
      await processLogs(eventName, logs)
    }
  }
}

async function backfillConfirmedEvents(client, address, abi) {
  const startBlock = BigInt(process.env.START_BLOCK || 0)
  const confirmations = BigInt(process.env.CONFIRMATIONS || 0)
  const latestBlock = await client.getBlockNumber()
  const toBlock = latestBlock > confirmations ? latestBlock - confirmations : latestBlock

  if (startBlock > toBlock) {
    console.log(`Skipping backfill: START_BLOCK ${startBlock} is above confirmed block ${toBlock}`)
    return
  }

  console.log(`Backfilling FFSBottle events from block ${startBlock} to ${toBlock}`)
  await backfillEvent(client, address, abi, 'RoundStarted', startBlock, toBlock)
  await backfillEvent(client, address, abi, 'Poured', startBlock, toBlock)
  await backfillEvent(client, address, abi, 'BottleSipped', startBlock, toBlock)
  console.log('Backfill complete')
}

export async function startIndexer() {
  const client = createChainClient()
  const address = getBottleAddress()
  const abi = await loadBottleAbi()

  await backfillConfirmedEvents(client, address, abi)

  const stopRoundStartedWatch = client.watchContractEvent({
    address,
    abi,
    eventName: 'RoundStarted',
    onLogs(logs) {
      processLogs('RoundStarted', logs).catch((error) => console.error('RoundStarted log processing failed:', error))
    },
    onError(error) {
      console.error('RoundStarted event watcher error:', error)
      setTimeout(() => startIndexer().catch((err) => console.error('Indexer reconnect failed:', err)), RETRY_DELAY_MS)
    },
    pollingInterval: Number(process.env.POLL_INTERVAL_MS || 12000),
  })

  const stopPouredWatch = client.watchContractEvent({
    address,
    abi,
    eventName: 'Poured',
    onLogs(logs) {
      processLogs('Poured', logs).catch((error) => console.error('Poured log processing failed:', error))
    },
    onError(error) {
      console.error('Poured event watcher error:', error)
      setTimeout(() => startIndexer().catch((err) => console.error('Indexer reconnect failed:', err)), RETRY_DELAY_MS)
    },
    pollingInterval: Number(process.env.POLL_INTERVAL_MS || 12000),
  })

  const stopSippedWatch = client.watchContractEvent({
    address,
    abi,
    eventName: 'BottleSipped',
    onLogs(logs) {
      processLogs('BottleSipped', logs).catch((error) => console.error('BottleSipped log processing failed:', error))
    },
    onError(error) {
      console.error('BottleSipped event watcher error:', error)
      setTimeout(() => startIndexer().catch((err) => console.error('Indexer reconnect failed:', err)), RETRY_DELAY_MS)
    },
    pollingInterval: Number(process.env.POLL_INTERVAL_MS || 12000),
  })

  console.log(`Indexer started and listening for FFSBottle events at ${address}`)

  return () => {
    stopRoundStartedWatch()
    stopPouredWatch()
    stopSippedWatch()
  }
}
