import { PhantomProvider, darkTheme, AddressType } from '@phantom/react-sdk';

export function SolanaWalletProvider({ children }: { children: React.ReactNode }) {
  return (
    <PhantomProvider
      config={{
        providers: ['google', 'apple', 'injected'],
        appId: '34b504a3-8851-4d60-be0c-66d697f96e09',
        addressTypes: [AddressType.solana],
        authOptions: {
          redirectUrl: typeof window !== 'undefined'
            ? `${window.location.origin}/auth/callback`
            : 'http://localhost:4321/auth/callback',
        },
      }}
      theme={darkTheme}
      appName="Mintzilio"
    >
      {children}
    </PhantomProvider>
  );
}
