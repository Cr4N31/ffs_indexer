import { network } from "hardhat";
import { formatEther } from "viem";
import { mkdir, writeFile } from "node:fs/promises";

const FFS_TOKEN_ADDRESS = "0xf9D90e9f8E3fcc41D44e220deDB73DF6c42c8244";

const { viem } = await network.create();
const [deployer] = await viem.getWalletClients();
const deployerAddress = deployer.account.address;

console.log("Deploying with account:", deployerAddress);

const ffsBottle = await viem.deployContract("FFSBottle", [FFS_TOKEN_ADDRESS, deployerAddress]);
const ffsBottleAddress = ffsBottle.address;
console.log("FFSBottle deployed to:", ffsBottleAddress);

const output = {
  network: network.name,
  deployer: deployerAddress,
  ffsToken: FFS_TOKEN_ADDRESS,
  ffsBottle: ffsBottleAddress,
  deployedAt: new Date().toISOString(),
};

await mkdir("deployments", { recursive: true });
await writeFile("deployments/deploy-mainnet.json", JSON.stringify(output, null, 2) + "\n");

console.log("\n--- SAVE THESE ADDRESSES ---");
console.log("FFS_BOTTLE_ADDRESS =", ffsBottleAddress);