import { StaticJsonRpcProvider } from '@ethersproject/providers';
import { ethers } from 'ethers';

import config from './config';

const totalGrapeNodeCost =
  config.nodeCost * config.compoundAtNodes + config.bufferGrapes;

const abi = [
  'function compound() public',
  'function getTotalRewards(address) public view returns (uint256)',
];

const provider = new StaticJsonRpcProvider(config.rpcURL);
const signer = new ethers.Wallet(config.privKey, provider);
const contract = new ethers.Contract(config.contract, abi, signer);

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
    rewards = +(await contract.getTotalRewards(config.address)) / 1e18;
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

    const numNodes = Math.floor(rewards / config.nodeCost);
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
    setTimeout(compoundTimeout, config.compoundInterval * 1000);
  }, config.compoundInterval * 1000);
})();
