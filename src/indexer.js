import { createPublicClient, http, formatUnits } from 'viem'
import { cronosTestnet } from 'viem/chains'
import { getBottleAddress, loadBottleAbi } from './contract.js'
import { query } from './db.js'

const RETRY_DELAY_MS = 5000

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
    const { round, user, amount } = log.args
    await ensureRoundExists(round)

    await query(
      `
        insert into pours (wallet_address, amount, transaction_hash, round_number, poured_at)
        values ($1, $2, $3, $4, now())
        on conflict (transaction_hash) do nothing
      `,
      [user, formatUnits(amount, 18), log.transactionHash, Number(round)],
    )

    console.log(`[POUR] ${user} poured ${formatFfs(amount)} FFS in round ${round}`)
  } catch (error) {
    console.error('Failed to record pour event:', error)
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
    console.error('Failed to record sip event:', error)
  }
}

function createIndexerClient() {
  const rpcUrl = process.env.RPC_URL
  if (!rpcUrl) {
    throw new Error('RPC_URL is required to start the indexer')
  }

  return createPublicClient({
    chain: cronosTestnet,
    transport: http(rpcUrl),
  })
}

export async function startIndexer() {
  const client = createIndexerClient()
  const address = getBottleAddress()
  const abi = await loadBottleAbi()

  const stopPouredWatch = client.watchContractEvent({
    address,
    abi,
    eventName: 'Poured',
    onLogs(logs) {
      for (const log of logs) {
        handlePoured(log)
      }
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
      for (const log of logs) {
        handleBottleSipped(log)
      }
    },
    onError(error) {
      console.error('BottleSipped event watcher error:', error)
      setTimeout(() => startIndexer().catch((err) => console.error('Indexer reconnect failed:', err)), RETRY_DELAY_MS)
    },
    pollingInterval: Number(process.env.POLL_INTERVAL_MS || 12000),
  })

  console.log('Indexer started and listening for FFSBottle events')

  return () => {
    stopPouredWatch()
    stopSippedWatch()
  }
}
