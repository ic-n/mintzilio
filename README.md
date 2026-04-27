# Mintzilio - Toxic Ponzilio Boyfriends

NFT minting dApp on Solana. 777-supply generative PFP collection with SPL token payment for minting.

**Stack:** Astro 6 + React 19 + Tailwind 4 (frontend) | Fastify (mint API server) | Metaplex Core + Umi SDK (NFT creation) | Surfpool (local testing)

## Server Architecture

### Files

| File | Purpose |
|------|---------|
| `server/minter.ts` | Core `NftMinter` class — builds atomic tx (SPL transfer + Core create), partial-signs, serializes |
| `server/config.ts` | Mint config loaded from env vars |
| `server/umi.ts` | Server-side Umi instance factory |
| `server/index.ts` | Fastify app with CORS + rate limiting |
| `server/routes/mint.ts` | `POST /api/mint` — builds + returns serialized tx |
| `server/routes/status.ts` | `GET /api/status` — supply count, isActive, price |
| `server/test/mint.surfpool.test.ts` | Full integration test against Surfpool |

### How SPL Payment is Enforced

The server builds a single atomic transaction containing both the SPL transfer and NFT create instructions, then partially signs it with the asset keypair + collection authority. If a malicious client strips the SPL transfer instruction, the server's signature becomes invalid and the transaction is rejected on-chain. No one can mint without paying.

### Mint Flow

1. Client sends `POST /api/mint` with `{ payerAddress }`
2. Server builds atomic tx: SPL token transfer (user -> treasury) + Core NFT create
3. Server partially signs (asset keypair + collection authority)
4. Server returns serialized tx (base64) + asset address
5. Client deserializes, user signs with wallet (authorizes SPL transfer + gas)
6. Client submits signed tx to RPC
7. NFT is minted to user's wallet, SPL tokens transferred to treasury

### Environment Variables

| Variable | Description |
|----------|-------------|
| `COLLECTION_ADDRESS` | Metaplex Core collection public key |
| `TREASURY_TOKEN_ACCOUNT` | ATA receiving SPL payments |
| `SPL_MINT` | SPL token mint address |
| `MINT_PRICE` | Price in smallest SPL token units |
| `MAX_SUPPLY` | Hard cap (default: 777) |
| `RPC_ENDPOINT` | Solana RPC URL (default: `http://localhost:8899`) |
| `AUTHORITY_KEYPAIR_PATH` | Path to collection authority keypair JSON |
| `PORT` | Server port (default: 3001) |
| `CORS_ORIGIN` | Allowed CORS origin (default: `*`) |

## Commands

| Command | Action |
|---------|--------|
| `pnpm install` | Install dependencies |
| `pnpm dev` | Start Astro dev server at `localhost:4321` |
| `pnpm server` | Start Fastify mint server |
| `pnpm test:mint` | Run Surfpool integration test |
| `pnpm build` | Build production frontend to `./dist/` |

## Testing with Surfpool

```bash
# Start Surfpool (local Solana network with mainnet forking) in new terminal tab
surfpool

# In another terminal, run the integration test
pnpm test:mint
```

### Test Results Verified

- NFT created and owned by user
- SPL tokens transferred (user paid mint price, treasury received it)
- Supply counter incremented
- Atomic tx has exactly 2 instructions (tamper-proof)
- Minting correctly rejected when paused
