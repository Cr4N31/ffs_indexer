import { network } from "hardhat";
import { formatEther, parseEther } from "viem";
import { mkdir, writeFile } from "node:fs/promises";

const { viem } = await network.create();
const [deployer] = await viem.getWalletClients();

const token = await viem.deployContract("MockFFS", [deployer.account.address]);
await token.write.mint([deployer.account.address, parseEther("10000000")]);

const output = {
  network: network.name,
  deployer: deployer.account.address,
  mockFFS: token.address,
  initialMint: `${formatEther(parseEther("10000000"))} FFS`,
  deployedAt: new Date().toISOString(),
};

await mkdir("deployments", { recursive: true });
await writeFile("deployments/mock-ffs.json", `${JSON.stringify(output, null, 2)}\n`);

console.log(JSON.stringify(output, null, 2));
