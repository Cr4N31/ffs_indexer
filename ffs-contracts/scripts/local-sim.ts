import { network } from "hardhat";
import { parseEther } from "viem";
import bottleDeployment from "../deployments/ffs-bottle.json" with { type: "json" };
import mockDeployment from "../deployments/mock-ffs.json" with { type: "json" };

const { viem } = await network.create();
const [admin, userOne, userTwo, userThree] = await viem.getWalletClients();

const token = await viem.getContractAt("MockFFS", mockDeployment.mockFFS);
const bottle = await viem.getContractAt("FFSBottle", bottleDeployment.ffsBottle);

const users = [userOne, userTwo, userThree];

for (const user of users) {
  await token.write.mint([user.account.address, parseEther("250000")]);
  await token.write.approve([bottle.address, parseEther("250000")], {
    account: user.account,
  });
}

await token.write.approve([bottle.address, parseEther("100000")], {
  account: admin.account,
});

if (!(await bottle.read.roundActive())) {
  await bottle.write.seed();
}

let startingSips = await bottle.read.totalSips();
let pours = 0;

while ((await bottle.read.totalSips()) === startingSips && pours < 150) {
  const user = users[pours % users.length];
  await bottle.write.pour([], { account: user.account });
  pours += 1;
}

const output = {
  token: token.address,
  bottle: bottle.address,
  round: (await bottle.read.currentRound()).toString(),
  roundActive: await bottle.read.roundActive(),
  bottleBalance: (await bottle.read.bottleBalance()).toString(),
  totalPours: (await bottle.read.totalPours()).toString(),
  totalSips: (await bottle.read.totalSips()).toString(),
  poursSubmitted: pours,
};

console.log(JSON.stringify(output, null, 2));
