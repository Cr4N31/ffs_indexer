import { network } from "hardhat";
import { parseEther, writeContract } from "viem";

const { viem } = await network.create();
const [deployer] = await viem.getWalletClients();

console.log("Deployer:", deployer.account.address);

const tx = await writeContract({
  abi: [
    {
      inputs: [
        { internalType: "address", name: "to", type: "address" },
        { internalType: "uint256", name: "amount", type: "uint256" }
      ],
      name: "mint",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function"
    }
  ],
  address: "0x3aa5ebb10dc797cac828524e59a333d0a371443c",
  walletClient: deployer,
  functionName: "mint",
  args: [
    "0xFB09A8a038E2d2C92041A9fC85aDd2612Ed0887d",
    parseEther("100000"),
  ],
});

console.log("tx:", tx);
