import { SolanaWalletProvider } from './WalletProvider';
import { MintSection } from './MintSection';

export default function MintPage() {
  return (
    <SolanaWalletProvider>
      <MintSection />
    </SolanaWalletProvider>
  );
}
