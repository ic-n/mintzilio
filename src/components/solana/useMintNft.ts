import { useCallback, useState } from 'react';
import { useSolana } from '@phantom/react-sdk';
import { generateSigner, publicKey, some } from '@metaplex-foundation/umi';
import { mintV1 } from '@metaplex-foundation/mpl-core-candy-machine';
import { createMintUmi } from '../../lib/solana/umi';
import {
  CANDY_MACHINE_ADDRESS,
  COLLECTION_ADDRESS,
  USDC_MINT,
  TREASURY_ATA,
} from '../../lib/solana/constants';

export type MintStatus = 'idle' | 'minting' | 'success' | 'error';

export type MintResult = {
  assetAddress: string;
  explorerUrl: string;
};

export function useMintNft(onSuccess?: () => void) {
  const { solana } = useSolana();
  const [status, setStatus] = useState<MintStatus>('idle');
  const [result, setResult] = useState<MintResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mint = useCallback(async () => {
    if (!solana.publicKey) return;

    setStatus('minting');
    setError(null);
    setResult(null);

    try {
      const umi = createMintUmi(solana);
      const asset = generateSigner(umi);

      await mintV1(umi, {
        candyMachine: publicKey(CANDY_MACHINE_ADDRESS),
        asset,
        collection:   publicKey(COLLECTION_ADDRESS),
        mintArgs: {
          tokenPayment: some({
            mint:           publicKey(USDC_MINT),
            destinationAta: publicKey(TREASURY_ATA),
          }),
          mintLimit: some({ id: 1 }),
        },
      }).sendAndConfirm(umi);

      const assetAddress = asset.publicKey;
      setResult({
        assetAddress,
        explorerUrl: `https://core.metaplex.com/explorer/${assetAddress}?env=devnet`,
      });
      setStatus('success');
      onSuccess?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Mint failed');
      setStatus('error');
    }
  }, [solana, onSuccess]);

  const reset = useCallback(() => {
    setStatus('idle');
    setResult(null);
    setError(null);
  }, []);

  return { mint, status, result, error, reset };
}
