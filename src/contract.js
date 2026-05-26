import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createPublicClient, defineChain, getAddress, http } from 'viem'
import { cronosTestnet, hardhat } from 'viem/chains'

export async function loadBottleAbi() {
  const artifactPath = resolve(process.cwd(), process.env.FFS_BOTTLE_ABI_PATH || '../ffs-contracts/artifacts/contracts/FFSBottle.sol/FFSBottle.json')
  const artifact = JSON.parse(await readFile(artifactPath, 'utf8'))
  return artifact.abi
}

export function createChainClient() {
  const rpcUrl = process.env.RPC_URL || process.env.CRONOS_TESTNET_RPC_URL
  if (!rpcUrl) throw new Error('RPC_URL or CRONOS_TESTNET_RPC_URL is required.')

  const chainId = Number(process.env.CHAIN_ID || '338')
  const chain = chainId === hardhat.id
    ? hardhat
    : chainId === cronosTestnet.id
      ? cronosTestnet
      : defineChain({
          id: chainId,
          name: process.env.CHAIN_NAME || 'Custom EVM',
          nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
          rpcUrls: { default: { http: [rpcUrl] } },
        })

  return createPublicClient({
    chain,
    transport: http(rpcUrl),
  })
}

export function getBottleAddress() {
  if (!process.env.FFS_BOTTLE_ADDRESS) {
    throw new Error('FFS_BOTTLE_ADDRESS is required.')
  }

  return getAddress(process.env.FFS_BOTTLE_ADDRESS)
}
