import { network } from "hardhat";
import { getAddress } from "viem";
import { mkdir, writeFile } from "node:fs/promises";

const tokenAddress = process.env.FFS_TOKEN_ADDRESS;

if (tokenAddress === undefined) {
  throw new Error("Set FFS_TOKEN_ADDRESS to the deployed FFS token address.");
}

const { viem } = await network.create();
const [deployer] = await viem.getWalletClients();
const bottle = await viem.deployContract("FFSBottle", [
  getAddress(tokenAddress),
  deployer.account.address,
]);

const output = {
  network: network.name,
  deployer: deployer.account.address,
  ffsToken: getAddress(tokenAddress),
  ffsBottle: bottle.address,
  deployedAt: new Date().toISOString(),
};

await mkdir("deployments", { recursive: true });
await writeFile("deployments/ffs-bottle.json", `${JSON.stringify(output, null, 2)}\n`);

console.log(JSON.stringify(output, null, 2));
