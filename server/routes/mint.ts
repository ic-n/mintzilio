import type { FastifyInstance } from 'fastify';
import type { NftMinter } from '../minter.js';

interface MintBody {
    payerAddress: string;
}

export function mintRoutes(app: FastifyInstance, minter: NftMinter) {
    app.post<{ Body: MintBody }>('/api/mint', async (request, reply) => {
        const { payerAddress } = request.body;

        if (!payerAddress || typeof payerAddress !== 'string') {
            return reply
                .status(400)
                .send({ error: 'payerAddress is required' });
        }

        // Basic base58 pubkey validation (32-44 chars, alphanumeric)
        if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(payerAddress)) {
            return reply.status(400).send({ error: 'Invalid payerAddress' });
        }

        const result = await minter.buildMintTransaction(payerAddress);

        return reply.send({
            transaction: Buffer.from(result.transaction).toString('base64'),
            assetAddress: result.assetAddress,
        });
    });
}
