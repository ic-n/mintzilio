import { useEffect, useState, useCallback } from 'react';
import { fetchCandyMachine } from '@metaplex-foundation/mpl-core-candy-machine';
import { publicKey } from '@metaplex-foundation/umi';
import { createReadUmi } from '../../lib/solana/umi';
import { CANDY_MACHINE_ADDRESS } from '../../lib/solana/constants';

const readUmi = createReadUmi();

export type CandyMachineState = {
  redeemed: number;
  available: number;
};

export function useCandyMachineState() {
  const [state, setState] = useState<CandyMachineState | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const cm = await fetchCandyMachine(readUmi, publicKey(CANDY_MACHINE_ADDRESS));
      setState({
        redeemed:   Number(cm.itemsRedeemed),
        available:  Number(cm.data.itemsAvailable),
      });
    } catch (e) {
      console.error('Failed to fetch candy machine state', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { state, loading, refetch: fetch };
}
