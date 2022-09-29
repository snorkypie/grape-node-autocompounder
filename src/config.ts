import dotenv from 'dotenv';
import { ethers } from 'ethers';

dotenv.config();

type Config = {
  privKey: string;
  address: string;
  compoundAtNodes: number;
  bufferGrapes: number;
  contract: string;
  rpcURL: string;
  nodeCost: number;
  compoundInterval: number;
};

type Variable = {
  input: string;
  output: string;
  validation?: (key: any) => boolean;
  type?: string;
  defaultValue?: any;
  assign?: (key: any) => [[string, any]];
};

const variables: Variable[] = [
  {
    input: 'PRIVATE_KEY',
    output: 'privKey',
    validation: (key: string) => /^[a-f0-9]{64}$/i.test(key),
    assign: (key: string) => [['address', new ethers.Wallet(key).address]],
  },
  {
    input: 'COMPOUND_AT_NODES',
    output: 'compoundAtNodes',
    type: 'integer',
    defaultValue: 1,
  },
  {
    input: 'COMPOUND_BUFFER_GRAPES',
    output: 'bufferGrapes',
    validation: (value: number) => value >= 0 && value < 50,
    type: 'number',
    defaultValue: 0,
  },
  {
    input: 'CONTRACT_ADDRESS',
    output: 'contract',
    defaultValue: '0xd77b0756be406a6a78d47285edd59234d781d568',
  },
  {
    input: 'RPC_URL',
    output: 'rpcURL',
    defaultValue: 'https://api.avax.network/ext/bc/C/rpc',
  },
  {
    input: 'GRAPE_NODE_COST',
    output: 'nodeCost',
    type: 'number',
    defaultValue: 50,
  },
  {
    input: 'COMPOUND_INTERVAL',
    output: 'compoundInterval',
    type: 'number',
    defaultValue: 10,
  },
];

function getValue(
  name: string,
  type: string,
  value: string | undefined,
  defaultValue: any
): string | number {
  if (typeof value === 'undefined') {
    if (typeof defaultValue !== 'undefined') {
      return defaultValue;
    }
    throw Error(`Value for '${name}' not supplied.`);
  } else if (type === 'integer') {
    const iValue = parseInt(value, 10);
    if (isNaN(iValue)) {
      throw Error(`${name} is not set to a valid integer: '${value}'`);
    }
    return iValue;
  } else if (type === 'number') {
    const iValue = Number(value);
    if (isNaN(iValue)) {
      throw Error(`${name} is not set to a valid number: '${value}'`);
    }
    return iValue;
  }

  return value;
}

let correctlyParsed = true;
const config: Config = Object.fromEntries(
  variables
    .map(({ defaultValue, input, output, assign, type, validation }) => {
      const origValue = process.env[input];
      const value = getValue(input, type || 'string', origValue, defaultValue);
      if (typeof validation !== 'undefined' && !validation(value)) {
        console.error(`Incorrect configuration value set for '${input}'`);
        correctlyParsed = false;
      }

      try {
        return [
          [output, value],
          ...(typeof assign !== 'undefined' ? assign(value) : []),
        ];
      } catch (e: any) {
        console.error(e.message);
        correctlyParsed = false;
      }

      return [];
    })
    .flat()
);

if (!correctlyParsed) {
  process.exit(1);
}

export default config;
