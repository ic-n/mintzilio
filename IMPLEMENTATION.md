# Toxic Ponzilio Boyfriends — Implementation Guide

## Architecture

Replaced the original Fastify server + in-memory counter approach with a fully on-chain **Metaplex Core Candy Machine** drop. No server. No bottleneck.

| Old | New |
|-----|-----|
| Fastify mint server | Gone |
| In-memory `totalMinted` counter | `numMinted` on Core Collection account (on-chain) |
| Server keypair holds collection authority | Candy Machine program PDA owns collection |
| Manual rate limiting | `botTax` + `mintLimit` guards |
| `isActive` flag | CM exhausts naturally / `endDate` guard |
| Race conditions under load | Not possible — atomic on-chain |

---

## Stack

- **NFT standard**: Metaplex Core (single account, ~0.003 SOL/mint)
- **Drop mechanism**: Core Candy Machine v0.3.0
- **Metadata storage**: Arweave via Irys (permanent, pay-once)
- **Minting SDK**: `@metaplex-foundation/mpl-core-candy-machine` + Umi
- **CLI**: `mplx` (`@metaplex-foundation/cli`)

---

## Devnet Deployment

| Resource | Address |
|----------|---------|
| Candy Machine | `GNCfFjQnQX71oMMmZQDML8gyHHTCv77Tu2V1Vur9ttTn` |
| Core Collection | `5EpHyYP5S2UwFaWpxzD3Sm7SBD7WJ4VsR3d6Ak9Jtu8D` |
| USDC Mint (devnet) | `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` |
| Treasury ATA | `DxpiW8pQEPHTTMqQdxTV9cnf4pthAeaBjLja1BSfLkSC` |
| Treasury Wallet | `6v3BHJUZoojHAR9q9y9AoLaSVJwZi2CigCpYwjHKTWAi` |
| Deployer | `98nL55QbYoh6Y5FJEJ92eQH7rsKkp7eXzhnwuWjSjWRi` |

---

## Guards

```json
{
  "tokenPayment": {
    "amount": 250000,
    "mint": "<USDC_MINT>",
    "destinationAta": "<TREASURY_ATA>"
  },
  "mintLimit": { "id": 1, "limit": 1 },
  "botTax": { "lamports": 10000000, "lastInstruction": true }
}
```

- **tokenPayment**: 0.25 USDC (250,000 base units, 6 decimals) → treasury ATA on every mint
- **mintLimit**: 1 NFT per wallet — enforced on-chain, no duplicate art possible
- **botTax**: 0.01 SOL charged on any failed mint attempt — makes spam economically painful
- **isSequential: true**: mints in order (0 → 18), deterministic URI assignment

---

## Asset Preparation

### File naming
Candy Machine requires 0-indexed assets: `0.png`, `0.json` ... `18.png`, `18.json` plus `collection.png` and `collection.json`.

Original files were 1-indexed (`1.json` → `20.json`). Renamed `20.*` → `0.*` and `19.png` → `collection.png`.

### Metadata schema fixes
Each JSON needed:
- `description` field added
- `external_url` field added
- `properties.files` array added
- Non-standard `collection` field removed
- `0.json` image ref fixed from `"20.png"` → `"0.png"`

Run `scripts/fix-metadata.sh` to apply all fixes to `nfts/`.

### Directory structure

```
candy-machine/
  assets/          → symlink to ../nfts
  cm-config.json   → CM configuration
  plugins.json     → Royalties plugin (5%)
```

Create the symlink:
```bash
ln -s ../nfts candy-machine/assets
```

---

## Setup Process (Devnet)

### Prerequisites
```bash
npm install -g @metaplex-foundation/cli
mplx config rpcs add devnet https://api.devnet.solana.com
mplx config rpcs set devnet
mplx config wallets add deployer ./keys/deployer.json
mplx config wallets set deployer
```

### 1. Fix metadata
```bash
chmod +x scripts/fix-metadata.sh && scripts/fix-metadata.sh
```

### 2. Create collection + patch cm-config.json
```bash
chmod +x scripts/setup-collection.sh && scripts/setup-collection.sh
```

This script:
1. Uploads `collection.png` to Arweave via Irys
2. Updates `collection.json` with the real image URI
3. Uploads `collection.json` to Arweave
4. Creates the Core collection on-chain with 5% royalties
5. Patches `candy-machine/cm-config.json` with the collection address

### 3. Upload, create, and insert
```bash
mplx cm upload ./candy-machine
mplx cm create ./candy-machine
mplx cm insert ./candy-machine
```

### 4. Validate
```bash
mplx cm validate ./candy-machine --onchain
```

---

## Minting (SDK)

Install dependencies:
```bash
pnpm add -D \
  @metaplex-foundation/umi \
  @metaplex-foundation/umi-bundle-defaults \
  @metaplex-foundation/mpl-core \
  @metaplex-foundation/mpl-core-candy-machine \
  @metaplex-foundation/mpl-token-metadata \
  @metaplex-foundation/mpl-toolbox
```

### Mint script (Node.js / scripts)

See `scripts/mint-test.ts` for a working example using a keypair file.

```typescript
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { keypairIdentity, generateSigner, publicKey, some } from '@metaplex-foundation/umi';
import { mplCandyMachine, mintV1 } from '@metaplex-foundation/mpl-core-candy-machine';
import { mplCore } from '@metaplex-foundation/mpl-core';
import { mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata';
import { mplToolbox } from '@metaplex-foundation/mpl-toolbox';

const umi = createUmi(RPC_URL)
  .use(mplCore())
  .use(mplTokenMetadata())
  .use(mplToolbox())
  .use(mplCandyMachine());

// Load keypair (Node.js) or use walletAdapterIdentity (browser)
const keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(secretKeyArray));
umi.use(keypairIdentity(keypair));

const asset = generateSigner(umi);

await mintV1(umi, {
  candyMachine: publicKey(CANDY_MACHINE_ADDRESS),
  asset,
  collection: publicKey(COLLECTION_ADDRESS),
  mintArgs: {
    tokenPayment: some({
      mint: publicKey(USDC_MINT),
      destinationAta: publicKey(TREASURY_ATA),
    }),
    mintLimit: some({ id: 1 }),
  },
}).sendAndConfirm(umi);
```

### Browser / wallet adapter

Replace `keypairIdentity` with:
```typescript
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters';

umi.use(walletAdapterIdentity(wallet)); // wallet = useWallet() from @solana/wallet-adapter-react
```

The `mintArgs` and `mintV1` call are identical.

---

## Mainnet Checklist

- [ ] Generate new deployer keypair (do not reuse devnet key)
- [ ] Fund deployer with SOL (collection creation + Irys uploads + CM deployment ≈ 0.5–1 SOL)
- [ ] Create treasury ATA for mainnet USDC (`EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`)
- [ ] Update `cm-config.json`: correct USDC mint, treasury ATA, `itemsAvailable: 777`
- [ ] Switch mplx RPC to mainnet: `mplx config rpcs add mainnet <YOUR_RPC_URL> && mplx config rpcs set mainnet`
- [ ] Re-run full setup process against mainnet
- [ ] Use a premium RPC (Helius, Triton, QuickNode) — public RPC will fail under mint load
- [ ] Test one mint on mainnet before going live
