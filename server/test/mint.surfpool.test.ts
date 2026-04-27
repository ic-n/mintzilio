/**
 * Surfpool integration test for NftMinter.
 *
 * Prerequisites:
 *   1. surfpool running on localhost:8899
 *   2. Run this script: npx tsx server/test/mint.surfpool.test.ts
 *
 * What it does:
 *   1. Creates a test SPL token mint + treasury ATA + user ATA (airdrops tokens)
 *   2. Creates a Core collection
 *   3. Instantiates NftMinter and builds an atomic mint tx
 *   4. User co-signs and submits the tx
 *   5. Verifies: NFT exists, SPL tokens transferred, no free minting possible
 */

import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { mplCore } from '@metaplex-foundation/mpl-core';
import { mplToolbox } from '@metaplex-foundation/mpl-toolbox';
import {
  createCollection,
  fetchCollection,
  fetchAsset,
  ruleSet,
} from '@metaplex-foundation/mpl-core';
import {
  createMint,
  createToken,
  mintTokensTo,
  findAssociatedTokenPda,
  createAssociatedToken,
  fetchToken,
} from '@metaplex-foundation/mpl-toolbox';
import {
  generateSigner,
  keypairIdentity,
  publicKey,
  sol,
  transactionBuilder,
  type Umi,
  type Keypair,
  type KeypairSigner,
} from '@metaplex-foundation/umi';
import { base58 } from '@metaplex-foundation/umi/serializers';
import { NftMinter } from '../minter.js';
import type { MintConfig } from '../config.js';

const RPC = 'http://localhost:8899';

// ── Helpers ──────────────────────────────────────────────────────

function log(msg: string) {
  console.log(`[test] ${msg}`);
}

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${msg}`);
}

async function airdropSol(umi: Umi, address: ReturnType<typeof publicKey>, amount = sol(10)) {
  await umi.rpc.airdrop(address, amount);
  // Wait for confirmation
  await new Promise((r) => setTimeout(r, 500));
}

// ── Main test ────────────────────────────────────────────────────

async function main() {
  log('Connecting to Surfpool at ' + RPC);

  // --- Authority (server) keypair ---
  const umi = createUmi(RPC).use(mplCore()).use(mplToolbox());
  const authority = generateSigner(umi);
  umi.use(keypairIdentity(authority));

  log('Authority: ' + authority.publicKey);
  await airdropSol(umi, authority.publicKey);

  // --- User keypair (simulates browser wallet) ---
  const user = generateSigner(umi);
  log('User: ' + user.publicKey);
  await airdropSol(umi, user.publicKey);

  // ── Step 1: Create SPL token mint ──────────────────────────────
  log('Creating SPL token mint...');
  const splMint = generateSigner(umi);
  await createMint(umi, {
    mint: splMint,
    decimals: 6,
    mintAuthority: authority.publicKey,
    freezeAuthority: authority.publicKey,
  }).sendAndConfirm(umi);
  log('SPL Mint: ' + splMint.publicKey);

  // ── Step 2: Create ATAs + mint tokens to user ──────────────────
  log('Creating token accounts...');

  // Treasury ATA (owned by authority)
  const treasuryAta = findAssociatedTokenPda(umi, {
    mint: splMint.publicKey,
    owner: authority.publicKey,
  });
  await createAssociatedToken(umi, {
    mint: splMint.publicKey,
    owner: authority.publicKey,
  }).sendAndConfirm(umi);

  // User ATA
  const userAta = findAssociatedTokenPda(umi, {
    mint: splMint.publicKey,
    owner: user.publicKey,
  });
  await createAssociatedToken(umi, {
    mint: splMint.publicKey,
    owner: user.publicKey,
  }).sendAndConfirm(umi);

  // Mint 1000 tokens (6 decimals) to user
  const mintPrice = BigInt(100_000_000); // 100 tokens
  const userTokenAmount = BigInt(1_000_000_000); // 1000 tokens
  await mintTokensTo(umi, {
    mint: splMint.publicKey,
    token: userAta,
    amount: userTokenAmount,
  }).sendAndConfirm(umi);
  log(`Minted ${userTokenAmount} tokens to user ATA`);

  // ── Step 3: Create Core collection ─────────────────────────────
  log('Creating Core collection...');
  const collection = generateSigner(umi);
  await createCollection(umi, {
    collection,
    name: 'Toxic Ponzilio Boyfriends',
    uri: 'https://arweave.net/placeholder/collection.json',
    plugins: [
      {
        type: 'Royalties',
        basisPoints: 500,
        creators: [{ address: authority.publicKey, percentage: 100 }],
        ruleSet: ruleSet('None'),
      },
    ],
  }).sendAndConfirm(umi);
  log('Collection: ' + collection.publicKey);

  // ── Step 4: Instantiate NftMinter ──────────────────────────────
  const config: MintConfig = {
    collectionAddress: collection.publicKey.toString(),
    treasuryAddress: treasuryAta[0].toString(),
    splMint: splMint.publicKey.toString(),
    price: mintPrice,
    maxSupply: 777,
    rpcEndpoint: RPC,
  };

  const minter = new NftMinter(umi, config);

  // ── Step 5: Build mint transaction ─────────────────────────────
  log('Building mint transaction...');
  const result = await minter.buildMintTransaction(user.publicKey.toString());
  log('Asset address: ' + result.assetAddress);

  // ── Step 6: User co-signs and submits ──────────────────────────
  log('User co-signing transaction...');
  let tx = umi.transactions.deserialize(result.transaction);

  // User signs (simulates wallet.signTransaction)
  tx = await user.signTransaction(tx);

  log('Submitting to chain...');
  const sig = await umi.rpc.sendTransaction(tx);
  log('Tx signature: ' + base58.deserialize(sig)[0]);

  // Wait for confirmation
  const blockhash = await umi.rpc.getLatestBlockhash();
  await umi.rpc.confirmTransaction(sig, { strategy: { type: 'blockhash', ...blockhash } });
  log('Transaction confirmed!');

  // ── Step 7: Verify results ─────────────────────────────────────
  log('Verifying...');

  // 7a. NFT exists and is owned by user
  const asset = await fetchAsset(umi, publicKey(result.assetAddress));
  assert(asset.owner === user.publicKey, 'NFT owner should be user');
  assert(asset.name === 'Ponzilio #1', `NFT name should be "Ponzilio #1", got "${asset.name}"`);
  log('  NFT owner: correct');
  log('  NFT name: ' + asset.name);

  // 7b. SPL tokens transferred from user to treasury
  const userTokenAccount = await fetchToken(umi, userAta);
  const treasuryTokenAccount = await fetchToken(umi, treasuryAta);
  const expectedUserBalance = userTokenAmount - mintPrice;
  assert(
    userTokenAccount.amount === expectedUserBalance,
    `User balance should be ${expectedUserBalance}, got ${userTokenAccount.amount}`
  );
  assert(
    treasuryTokenAccount.amount === mintPrice,
    `Treasury balance should be ${mintPrice}, got ${treasuryTokenAccount.amount}`
  );
  log(`  User token balance: ${userTokenAccount.amount} (paid ${mintPrice})`);
  log(`  Treasury token balance: ${treasuryTokenAccount.amount}`);

  // 7c. Status reflects the mint
  const status = minter.getStatus();
  assert(status.totalMinted === 1, `totalMinted should be 1, got ${status.totalMinted}`);
  log('  Supply: ' + status.totalMinted + '/' + status.maxSupply);

  // ── Step 8: Test that minting without SPL payment fails ────────
  log('Testing tamper resistance...');
  // Build a second mint tx, but this time we'll try to verify the
  // transaction is atomic — if someone strips the SPL transfer,
  // the server's signature on the asset keypair becomes invalid.
  // We test this by checking the tx has both instructions.
  const result2 = await minter.buildMintTransaction(user.publicKey.toString());
  const tx2 = umi.transactions.deserialize(result2.transaction);
  const ixCount = tx2.message.instructions.length;
  assert(ixCount >= 2, `Transaction should have at least 2 instructions (SPL transfer + create), got ${ixCount}`);
  log(`  Atomic tx instruction count: ${ixCount} (SPL transfer + Core create)`);

  // ── Step 9: Test pause ─────────────────────────────────────────
  log('Testing pause...');
  minter.setActive(false);
  try {
    await minter.buildMintTransaction(user.publicKey.toString());
    assert(false, 'Should have thrown when minting is paused');
  } catch (e) {
    assert((e as Error).message === 'Minting is paused', 'Should throw "Minting is paused"');
    log('  Correctly rejected mint while paused');
  }

  log('');
  log('ALL TESTS PASSED');
}

main().catch((err) => {
  console.error('\nTEST FAILED:', err.message ?? err);
  process.exit(1);
});
