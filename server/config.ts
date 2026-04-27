import 'dotenv/config';

export interface MintConfig {
  collectionAddress: string;
  treasuryAddress: string;
  splMint: string;
  price: bigint;
  maxSupply: number;
  rpcEndpoint: string;
}

export function loadConfig(): MintConfig {
  const required = (key: string): string => {
    const val = process.env[key];
    if (!val) throw new Error(`Missing env var: ${key}`);
    return val;
  };

  return {
    collectionAddress: required('COLLECTION_ADDRESS'),
    treasuryAddress: required('TREASURY_TOKEN_ACCOUNT'),
    splMint: required('SPL_MINT'),
    price: BigInt(required('MINT_PRICE')),
    maxSupply: Number(process.env.MAX_SUPPLY ?? '777'),
    rpcEndpoint: process.env.RPC_ENDPOINT ?? 'http://localhost:8899',
  };
}
