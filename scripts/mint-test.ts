import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { keypairIdentity, generateSigner, publicKey, some } from '@metaplex-foundation/umi';
import {
  mplCandyMachine,
  mintV1,
  fetchCandyMachine,
} from '@metaplex-foundation/mpl-core-candy-machine';
import { mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata';
import { mplCore } from '@metaplex-foundation/mpl-core';
import { mplToolbox, findAssociatedTokenPda } from '@metaplex-foundation/mpl-toolbox';
import fs from 'fs';

const RPC            = 'https://api.devnet.solana.com';
const CANDY_MACHINE  = 'GNCfFjQnQX71oMMmZQDML8gyHHTCv77Tu2V1Vur9ttTn';
const COLLECTION     = '5EpHyYP5S2UwFaWpxzD3Sm7SBD7WJ4VsR3d6Ak9Jtu8D';
const USDC_MINT      = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU';
const TREASURY_ATA   = 'DxpiW8pQEPHTTMqQdxTV9cnf4pthAeaBjLja1BSfLkSC';

const umi = createUmi(RPC)
  .use(mplCore())
  .use(mplTokenMetadata())
  .use(mplToolbox())
  .use(mplCandyMachine());

const raw = JSON.parse(fs.readFileSync('./keys/dummyuser.json', 'utf-8'));
const keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(raw));
umi.use(keypairIdentity(keypair));

console.log('Minter:', umi.identity.publicKey.toString());

const cm = await fetchCandyMachine(umi, publicKey(CANDY_MACHINE));
console.log(`CM items: ${cm.itemsRedeemed}/${cm.data.itemsAvailable} redeemed`);

const [sourceAta] = findAssociatedTokenPda(umi, {
  mint: publicKey(USDC_MINT),
  owner: umi.identity.publicKey,
});
console.log('Source ATA:', sourceAta.toString());

const asset = generateSigner(umi);
console.log('Asset address:', asset.publicKey.toString());

console.log('Minting...');
const { signature } = await mintV1(umi, {
  candyMachine: publicKey(CANDY_MACHINE),
  asset,
  collection: publicKey(COLLECTION),
  mintArgs: {
    tokenPayment: some({
      mint: publicKey(USDC_MINT),
      destinationAta: publicKey(TREASURY_ATA),
    }),
    mintLimit: some({ id: 1 }),
  },
}).sendAndConfirm(umi, { confirm: { commitment: 'confirmed' } });

console.log('\nMint successful!');
console.log('Asset  :', asset.publicKey.toString());
console.log('Sig    :', Buffer.from(signature).toString('base64'));
console.log('Explorer: https://core.metaplex.com/explorer/' + asset.publicKey.toString() + '?env=devnet');
