import { StaticJsonRpcProvider } from '@ethersproject/providers';
import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const grapeNodeCost = parseInt(process.env.GRAPE_NODE_COST as string, 10);
const bufferGrapes = parseInt(process.env.COMPOUND_BUFFER_GRAPES as string, 10);
const totalGrapeNodeCost =
  grapeNodeCost * parseInt(process.env.COMPOUND_AT_NODES as string, 10) +
  bufferGrapes;
const compoundInterval = parseInt(process.env.COMPOUND_INTERVAL as string, 10);

const abi = [
  'function compound() public',
  'function getTotalRewards(address) public view returns (uint256)',
];

const provider = new StaticJsonRpcProvider(process.env.RPC_URL as string);
const signer = new ethers.Wallet(process.env.PRIVATE_KEY as string, provider);
const contract = new ethers.Contract(
  process.env.CONTRACT_ADDRESS as string,
  abi,
  signer
);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const logStore: string[] = [];
let lastStatus = '';
const log = (status: boolean, ...args: any[]) => {
  const msg = [`${new Date().toLocaleString('sv-SE')} GNAC:`, ...args].join(
    ' '
  );

  if (status) {
    lastStatus = msg;
  } else {
    logStore.push(msg);
  }

  console.clear();
  console.log(lastStatus);
  logStore.forEach((m) => console.log(m));
};

async function grapeCompounder() {
  let rewards;
  try {
    rewards =
      +(await contract.getTotalRewards(process.env.WALLET_ADDRESS as string)) /
      1e18;
    if (rewards < totalGrapeNodeCost) {
      log(
        true,
        `Not enough to compound: ${rewards.toFixed(
          6
        )}, needed: ${totalGrapeNodeCost}`
      );
      return;
    }
  } catch {
    log(true, `Crashed while fetching rewards`);
    return;
  }

  log(false, `Have enough for compound, let's go (${rewards}).`);
  try {
    const transaction = await contract.compound();
    if ((await transaction.wait())?.status !== 1) {
      log(false, 'Tried to compound but got status !== 0 (failed)');
      await sleep(120);
      return;
    }

    const numNodes = Math.floor(rewards / grapeNodeCost);
    log(
      false,
      `Successfully compounded ${numNodes} grape node${numNodes > 1 ? 's' : ''}`
    );
  } catch (err) {
    log(false, 'ERROR', err);
  }
}

(async () => {
  await grapeCompounder();

  setTimeout(async function compoundTimeout() {
    await grapeCompounder();
    setTimeout(compoundTimeout, compoundInterval * 1000);
  }, compoundInterval * 1000);
})();
