import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";
import { parseEther } from "viem";

const SEED_AMOUNT = parseEther("100000");
const POUR_AMOUNT = parseEther("1000");
const TREASURY_WALLET = "0x75d04bcA6B542Fe1f3EeE8196DEB2C2675dAABcb";

describe("FFSBottle", async function () {
  const { viem } = await network.create();
  const publicClient = await viem.getPublicClient();

  async function deployFixture() {
    const [admin, user, otherUser] = await viem.getWalletClients();
    const token = await viem.deployContract("MockFFS", [admin.account.address]);
    const bottle = await viem.deployContract("FFSBottleHarness", [
      token.address,
      admin.account.address,
    ]);

    for (const account of [admin.account.address, user.account.address, otherUser.account.address]) {
      await token.write.mint([account, parseEther("500000")]);
    }

    await token.write.approve([bottle.address, parseEther("500000")], {
      account: admin.account,
    });
    await token.write.approve([bottle.address, parseEther("500000")], {
      account: user.account,
    });
    await token.write.approve([bottle.address, parseEther("500000")], {
      account: otherUser.account,
    });

    return { admin, user, otherUser, token, bottle };
  }

  it("handles a normal pour without sipping", async function () {
    const { user, bottle } = await deployFixture();

    await bottle.write.seed();
    await bottle.write.setForcedThreshold([SEED_AMOUNT + POUR_AMOUNT + 1n]);
    await bottle.write.pour([0n], { account: user.account, value: parseEther("1") });

    assert.equal(await bottle.read.bottleBalance(), SEED_AMOUNT);
    assert.equal(await bottle.read.roundPours(), 1n);
    assert.equal(await bottle.read.totalPours(), 1n);
    assert.equal(await bottle.read.totalSips(), 0n);
    assert.equal(await bottle.read.currentRound(), 1n);
  });

  it("sips when a pour crosses the secret threshold", async function () {
    const { user, bottle } = await deployFixture();
    const deploymentBlock = await publicClient.getBlockNumber();

    await bottle.write.seed();
    await bottle.write.setForcedThreshold([SEED_AMOUNT]);
    await bottle.write.pour([0n], { account: user.account, value: parseEther("1") });

    assert.equal(await bottle.read.bottleBalance(), 0n);
    assert.equal(await bottle.read.roundPours(), 0n);
    assert.equal(await bottle.read.totalPours(), 1n);
    assert.equal(await bottle.read.totalSips(), 1n);
    assert.equal(await bottle.read.currentRound(), 2n);

    const events = await publicClient.getContractEvents({
      address: bottle.address,
      abi: bottle.abi,
      eventName: "BottleSipped",
      fromBlock: deploymentBlock,
      strict: true,
    });

    assert.equal(events.length, 1);
    assert.equal(events[0].args.winner.toLowerCase(), user.account.address.toLowerCase());
  });

  it("pays exact 95 percent to winner and 5 percent to treasury", async function () {
    const { user, token, bottle } = await deployFixture();

    await bottle.write.seed();
    await bottle.write.setForcedThreshold([SEED_AMOUNT]);

    const userBefore = await token.read.balanceOf([user.account.address]);
    const treasuryBefore = await token.read.balanceOf([TREASURY_WALLET]);

    await bottle.write.pour([0n], { account: user.account, value: parseEther("1") });

    const bottleTotal = SEED_AMOUNT;
    const treasuryShare = (bottleTotal * 5n) / 100n;
    const winnerShare = bottleTotal - treasuryShare;

    const userAfter = await token.read.balanceOf([user.account.address]);
    const treasuryAfter = await token.read.balanceOf([TREASURY_WALLET]);

    assert.equal(userAfter - userBefore, winnerShare);
    assert.equal(treasuryAfter - treasuryBefore, treasuryShare);
  });

  it("resets the round and picks a new threshold after payout", async function () {
    const { user, bottle } = await deployFixture();

    await bottle.write.seed();
    const thresholdBefore = await bottle.read.exposedSecretThreshold();
    await bottle.write.setForcedThreshold([SEED_AMOUNT]);
    await bottle.write.pour([0n], { account: user.account, value: parseEther("1") });
    const thresholdAfter = await bottle.read.exposedSecretThreshold();

    assert.equal(await bottle.read.roundActive(), true);
    assert.equal(await bottle.read.currentRound(), 2n);
    assert.equal(await bottle.read.roundPours(), 0n);
    assert.notEqual(thresholdAfter, 0n);
    assert.notEqual(thresholdAfter, thresholdBefore);
  });

  it("allows only admin to seed", async function () {
    const { user, bottle } = await deployFixture();

    await assert.rejects(
      bottle.write.seed([], { account: user.account }),
      /OwnableUnauthorizedAccount/,
    );
  });
});
