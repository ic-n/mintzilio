import type { FastifyInstance } from 'fastify';
import type { NftMinter } from '../minter.js';

export function statusRoutes(app: FastifyInstance, minter: NftMinter) {
  app.get('/api/status', async (_request, reply) => {
    return reply.send(minter.getStatus());
  });
}
