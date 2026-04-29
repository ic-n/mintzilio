import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { mplCore } from '@metaplex-foundation/mpl-core';
import { mplCandyMachine } from '@metaplex-foundation/mpl-core-candy-machine';
import { mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata';
import { mplToolbox } from '@metaplex-foundation/mpl-toolbox';
import { signerIdentity } from '@metaplex-foundation/umi';
import type { ISolanaChain } from '@phantom/chain-interfaces';
import { createSignerFromPhantom } from './phantomSigner';
import { RPC_ENDPOINT } from './constants';

export function createReadUmi() {
  return createUmi(RPC_ENDPOINT).use(mplCandyMachine());
}

export function createMintUmi(solana: ISolanaChain) {
  return createUmi(RPC_ENDPOINT)
    .use(mplCore())
    .use(mplTokenMetadata())
    .use(mplToolbox())
    .use(mplCandyMachine())
    .use(signerIdentity(createSignerFromPhantom(solana)));
}
