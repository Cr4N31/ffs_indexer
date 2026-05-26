import { formatUnits } from 'viem'

export function toDecimalString(value) {
  if (value === null || value === undefined) return null
  return value.toString()
}

export function fromWeiString(value) {
  if (value === null || value === undefined) return '0'
  return formatUnits(BigInt(value), 18)
}

export function shortAddress(address = '') {
  if (!address) return ''
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function rowToActivity(row) {
  const isSip = row.event_name === 'BottleSipped'

  return {
    id: Number(row.id),
    type: isSip ? 'sip' : 'pour',
    round: row.round,
    address: isSip ? row.winner_address : row.user_address,
    shortAddress: shortAddress(isSip ? row.winner_address : row.user_address),
    amount: fromWeiString(isSip ? row.winner_amount_wei : row.amount_wei),
    bottleBalance: fromWeiString(row.bottle_balance_wei),
    transactionHash: row.transaction_hash,
    blockNumber: row.block_number,
    happenedAt: row.happened_at,
  }
}

export function rowToWinner(row) {
  return {
    id: Number(row.id),
    round: row.round,
    winner: row.winner_address,
    shortWinner: shortAddress(row.winner_address),
    bottleBalance: fromWeiString(row.bottle_balance_wei),
    winnerAmount: fromWeiString(row.winner_amount_wei),
    treasuryAmount: fromWeiString(row.treasury_amount_wei),
    transactionHash: row.transaction_hash,
    blockNumber: row.block_number,
    happenedAt: row.happened_at,
  }
}
