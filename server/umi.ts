import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { mplCore } from "@metaplex-foundation/mpl-core";
import { mplToolbox } from "@metaplex-foundation/mpl-toolbox";
import {
  keypairIdentity,
  type Umi,
  type Keypair,
} from "@metaplex-foundation/umi";

export function createServerUmi(
  rpcEndpoint: string,
  authorityKeypair: Keypair
): Umi {
  return createUmi(rpcEndpoint)
    .use(mplCore())
    .use(mplToolbox())
    .use(keypairIdentity(authorityKeypair));
}
