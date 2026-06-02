import { network } from "hardhat";
import { getAddress, formatEther, parseEther } from "viem";
import { mkdir, writeFile } from "node:fs/promises";

const { viem } = await network.create();
const [deployer] = await viem.getWalletClients();
const deployerAddress = deployer.account.address;

console.log("Deploying with account:", deployerAddress);

const mockFFS = await viem.deployContract("MockFFS", [deployerAddress]);
const mockFFSAddress = mockFFS.address;
console.log("MockFFS deployed to:", mockFFSAddress);

const ffsBottle = await viem.deployContract("FFSBottle", [mockFFSAddress, deployerAddress]);
const ffsBottleAddress = ffsBottle.address;
console.log("FFSBottle deployed to:", ffsBottleAddress);

const amount = parseEther("100000");
await mockFFS.write.mint([deployerAddress, amount]);
console.log("Minted 100,000 FFS to deployer:", deployerAddress);

const testWallet = getAddress("0xFB09A8a038E2d2C92041A9fC85aDd2612Ed0887d");
await mockFFS.write.mint([testWallet, amount]);
console.log("Minted 100,000 FFS to test wallet");

await mockFFS.write.approve([ffsBottleAddress, amount]);
await ffsBottle.write.seed([]);
console.log("Bottle seeded with 100,000 FFS");

const output = {
  network: network.name,
  deployer: deployerAddress,
  mockFFS: mockFFSAddress,
  ffsBottle: ffsBottleAddress,
  testWallet,
  seededAmount: formatEther(amount) + " FFS",
  deployedAt: new Date().toISOString(),
};

await mkdir("deployments", { recursive: true });
await writeFile("deployments/deploy.json", JSON.stringify(output, null, 2) + "\n");

console.log("\n--- SAVE THESE ADDRESSES ---");
console.log("VITE_FFS_TOKEN_ADDRESS=", mockFFSAddress);
console.log("VITE_BOTTLE_ADDRESS=", ffsBottleAddress);

