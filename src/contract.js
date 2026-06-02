import { createPublicClient, defineChain, getAddress, http } from 'viem'
import { readFile } from 'fs/promises'

export async function loadBottleAbi() {
  const artifactPath = new URL('../ffs-contracts/artifacts/contracts/FFSBottle.sol/FFSBottle.json', import.meta.url)
  const artifactRaw = await readFile(artifactPath, 'utf8')
  const artifact = JSON.parse(artifactRaw)
  return artifact.abi
}

export function createChainClient() {
  const rpcUrl = process.env.RPC_URL
  if (!rpcUrl) throw new Error('RPC_URL is required.')

  const chainId = Number(process.env.CHAIN_ID || '25')
  if (chainId !== 25) {
    throw new Error(`Unsupported CHAIN_ID ${chainId}. FFS production indexer must use Cronos Mainnet chain ID 25.`)
  }

  if (rpcUrl !== 'https://evm.cronos.org') {
    throw new Error(`Unsupported RPC_URL ${rpcUrl}. FFS production indexer must use https://evm.cronos.org.`)
  }

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