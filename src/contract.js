import { createPublicClient, defineChain, getAddress, http } from 'viem'

export const FFS_BOTTLE_ABI = [
  { type: 'function', name: 'pour', inputs: [], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'bottleBalance', inputs: [], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'fillPercent', inputs: [], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'currentRound', inputs: [], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'roundPours', inputs: [], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'totalPours', inputs: [], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'totalSips', inputs: [], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'POUR_AMOUNT', inputs: [], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'roundActive', inputs: [], outputs: [{ type: 'bool' }], stateMutability: 'view' },
  {
    type: 'event', name: 'Poured',
    inputs: [
      { name: 'round', type: 'uint256', indexed: true },
      { name: 'user', type: 'address', indexed: true },
      { name: 'ffsAmount', type: 'uint256', indexed: false },
      { name: 'bottleBalance', type: 'uint256', indexed: false },
      { name: 'roundPours', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event', name: 'BottleSipped',
    inputs: [
      { name: 'round', type: 'uint256', indexed: true },
      { name: 'winner', type: 'address', indexed: true },
      { name: 'bottleBalance', type: 'uint256', indexed: false },
      { name: 'winnerAmount', type: 'uint256', indexed: false },
      { name: 'treasuryAmount', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event', name: 'RoundStarted',
    inputs: [
      { name: 'round', type: 'uint256', indexed: true },
    ],
  },
]

// ← FIXED: no file system reads, no strict RPC check
export async function loadBottleAbi() {
  return FFS_BOTTLE_ABI
}

export function createChainClient() {
  const rpcUrl = process.env.RPC_URL
  if (!rpcUrl) throw new Error('RPC_URL is required.')

  const chainId = Number(process.env.CHAIN_ID || '25')

  const chain = defineChain({
    id: chainId,
    name: process.env.CHAIN_NAME || 'Cronos Mainnet',
    nativeCurrency: { name: 'Cronos', symbol: 'CRO', decimals: 18 },
    rpcUrls: { default: { http: [rpcUrl] } },
  })

  return createPublicClient({
    chain,
    transport: http(rpcUrl),
  })
}

export function getBottleAddress() {
const DEFAULT_FFS_BOTTLE_ADDRESS = '0x11cc5f9b4012a08fb9fd46fa47ad96e37a5f2605'
  const address = process.env.FFS_BOTTLE_ADDRESS || DEFAULT_FFS_BOTTLE_ADDRESS
  return getAddress(address)
}