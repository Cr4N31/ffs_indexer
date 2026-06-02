import "dotenv/config";
import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import hardhatEthersPlugin from "@nomicfoundation/hardhat-ethers";
import { configVariable, defineConfig } from "hardhat/config";

export default defineConfig({
  plugins: [hardhatToolboxViemPlugin, hardhatEthersPlugin],

  paths: {
    sources: "./contracts",
    artifacts: "./artifacts",
    cache: "./cache",
  },

  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },

  networks: {
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
    },
    cronosTestnet: {
      type: "http",
      chainType: "l1",
      url: configVariable("CRONOS_TESTNET_RPC_URL"),
      accounts: [configVariable("CRONOS_TESTNET_PRIVATE_KEY")],
    },
    localhost: {
      type: "http",
      chainType: "l1",
      url: "http://127.0.0.1:8545",
    },
  },

  verify: {
    etherscan: {
      apiKey: configVariable("CRONOSCAN_API_KEY"),
    },
  },

  chainDescriptors: {
    338: {
      name: "Cronos Testnet",
      blockExplorers: {
        etherscan: {
          name: "Cronos Testnet Explorer",
          url: "https://cronos.org/explorer/testnet3",
          apiUrl: "https://cronos.org/explorer/testnet3/api",
        },
      },
    },
  },
});