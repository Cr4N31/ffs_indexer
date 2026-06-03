import { createPublicClient, defineChain, getAddress, http } from 'viem'

const FFS_BOTTLE_ABI = [
  { inputs: [{ internalType: 'contract IERC20', name: 'token_', type: 'address' }, { internalType: 'address', name: 'admin_', type: 'address' }], stateMutability: 'nonpayable', type: 'constructor' },
  { inputs: [], name: 'InvalidTokenAddress', type: 'error' },
  { inputs: [{ internalType: 'address', name: 'owner', type: 'address' }], name: 'OwnableInvalidOwner', type: 'error' },
  { inputs: [{ internalType: 'address', name: 'account', type: 'address' }], name: 'OwnableUnauthorizedAccount', type: 'error' },
  { inputs: [], name: 'ReentrancyGuardReentrantCall', type: 'error' },
  { inputs: [], name: 'RoundAlreadyActive', type: 'error' },
  { inputs: [], name: 'RoundNotActive', type: 'error' },
  { inputs: [{ internalType: 'address', name: 'token', type: 'address' }], name: 'SafeERC20FailedOperation', type: 'error' },
  { anonymous: false, inputs: [{ indexed: true, internalType: 'uint256', name: 'round', type: 'uint256' }, { indexed: true, internalType: 'address', name: 'winner', type: 'address' }, { indexed: false, internalType: 'uint256', name: 'bottleBalance', type: 'uint256' }, { indexed: false, internalType: 'uint256', name: 'winnerAmount', type: 'uint256' }, { indexed: false, internalType: 'uint256', name: 'treasuryAmount', type: 'uint256' }], name: 'BottleSipped', type: 'event' },
  { anonymous: false, inputs: [{ indexed: true, internalType: 'address', name: 'previousOwner', type: 'address' }, { indexed: true, internalType: 'address', name: 'newOwner', type: 'address' }], name: 'OwnershipTransferred', type: 'event' },
  { anonymous: false, inputs: [{ indexed: true, internalType: 'uint256', name: 'round', type: 'uint256' }, { indexed: true, internalType: 'address', name: 'user', type: 'address' }, { indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256' }, { indexed: false, internalType: 'uint256', name: 'bottleBalance', type: 'uint256' }, { indexed: false, internalType: 'uint256', name: 'roundPours', type: 'uint256' }], name: 'Poured', type: 'event' },
  { anonymous: false, inputs: [{ indexed: true, internalType: 'uint256', name: 'round', type: 'uint256' }, { indexed: false, internalType: 'uint256', name: 'threshold', type: 'uint256' }], name: 'RoundStarted', type: 'event' },
  { inputs: [], name: 'BPS_DENOMINATOR', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'MAX_THRESHOLD', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'MIN_THRESHOLD', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'POUR_AMOUNT', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'SEED_AMOUNT', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'TREASURY_BPS', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'TREASURY_WALLET', outputs: [{ internalType: 'address', name: '', type: 'address' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'bottleBalance', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'currentRound', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'ffsToken', outputs: [{ internalType: 'contract IERC20', name: '', type: 'address' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'fillPercent', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'owner', outputs: [{ internalType: 'address', name: '', type: 'address' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'pour', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [], name: 'renounceOwnership', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [], name: 'roundActive', outputs: [{ internalType: 'bool', name: '', type: 'bool' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'roundPours', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'seed', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [], name: 'totalPours', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'totalSips', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ internalType: 'address', name: 'newOwner', type: 'address' }], name: 'transferOwnership', outputs: [], stateMutability: 'nonpayable', type: 'function' },
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
  const DEFAULT_FFS_BOTTLE_ADDRESS = '0x93E7a174E1DadfE429De8D0E0f281ee1851820E9'
  const address = process.env.FFS_BOTTLE_ADDRESS || DEFAULT_FFS_BOTTLE_ADDRESS
  return getAddress(address)
}