import { publicKey as umiPublicKey } from '@metaplex-foundation/umi';
import {
  toWeb3JsTransaction,
  fromWeb3JsTransaction,
} from '@metaplex-foundation/umi-web3js-adapters';
import { VersionedTransaction } from '@solana/web3.js';
import type { Signer } from '@metaplex-foundation/umi';
import type { ISolanaChain } from '@phantom/chain-interfaces';

export function createSignerFromPhantom(solana: ISolanaChain): Signer {
  return {
    get publicKey() {
      if (!solana.publicKey) throw new Error('Phantom wallet not connected');
      return umiPublicKey(solana.publicKey);
    },
    async signMessage(message: Uint8Array): Promise<Uint8Array> {
      const { signature } = await solana.signMessage(message);
      return signature;
    },
    async signTransaction(transaction) {
      const web3Tx = toWeb3JsTransaction(transaction);
      const signed = await solana.signTransaction(web3Tx);
      return fromWeb3JsTransaction(signed as VersionedTransaction);
    },
    async signAllTransactions(transactions) {
      const web3Txs = transactions.map(toWeb3JsTransaction);
      const signed = await solana.signAllTransactions(web3Txs);
      return signed.map(tx => fromWeb3JsTransaction(tx as VersionedTransaction));
    },
  };
}
