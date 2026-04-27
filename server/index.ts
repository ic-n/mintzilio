import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { keypairIdentity } from '@metaplex-foundation/umi';
import { loadConfig } from './config.js';
import { createServerUmi } from './umi.js';
import { NftMinter } from './minter.js';
import { mintRoutes } from './routes/mint.js';
import { statusRoutes } from './routes/status.js';
import fs from 'fs';

async function main() {
  const config = loadConfig();

  // Load authority keypair from file
  const keypairPath = process.env.AUTHORITY_KEYPAIR_PATH;
  if (!keypairPath) throw new Error('Missing AUTHORITY_KEYPAIR_PATH env var');
  const secretKey = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));

  const umi = createServerUmi(config.rpcEndpoint, undefined!);
  const keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(secretKey));
  umi.use(keypairIdentity(keypair));

  const minter = new NftMinter(umi, config);

  // Sync supply from chain on startup
  try {
    await minter.syncSupply();
    console.log(`Supply synced: ${minter.getStatus().totalMinted}/${config.maxSupply}`);
  } catch (e) {
    console.warn('Could not sync supply from chain, starting at 0:', (e as Error).message);
  }

  const app = Fastify({ logger: true });

  await app.register(cors, { origin: process.env.CORS_ORIGIN ?? '*' });
  await app.register(rateLimit, {
    max: 10,
    timeWindow: '1 minute',
    keyGenerator: (req) => {
      // Rate limit by payer address when available
      try {
        const body = req.body as { payerAddress?: string };
        return body?.payerAddress ?? req.ip;
      } catch {
        return req.ip;
      }
    },
  });

  mintRoutes(app, minter);
  statusRoutes(app, minter);

  const port = Number(process.env.PORT ?? 3001);
  await app.listen({ port, host: '0.0.0.0' });
  console.log(`Mint server running on :${port}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
