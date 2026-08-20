'use client';

import type { Token } from '@normalfinance/types';
import type { TurnkeyChain } from '@/lib/turnkey/add-account';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { usePersistStore } from '@normalfinance/state';
import { useBtcPortfolio } from '@/hooks/use-btc-portfolio';
import { useStellarTokens } from '@/hooks/use-stellar-tokens';
import { useEthPortfolio, useSolPortfolio } from '@/hooks/use-chain-portfolio';

import { CoinbaseOfframpModal } from './coinbase-offramp-modal';

// ---------------------------------------------------------------------------
// Global handler that completes a Coinbase off-ramp after the user returns from
// Coinbase. The off-ramp dialog redirects back to the current page with
// `?offramp=coinbase&sym=<SYMBOL>&chain=<CHAIN>`; this (mounted once in
// ModalProvider) detects it on any page — asset pages, savings, etc. — resolves
// the asset's address + token, and opens the completion modal to send the crypto.
//
// We read window.location in a mount effect (not useSearchParams) so a global
// mount doesn't force a Suspense/CSR de-opt across the app. The marker only ever
// arrives via Coinbase's external redirect, which is a fresh page load.
// ---------------------------------------------------------------------------

const STELLAR_SYMBOLS = new Set(['USDC', 'XLM']);
const VALID_CHAINS = new Set(['bitcoin', 'ethereum', 'solana', 'stellar']);

export function OfframpResumeHandler() {
  const router = useRouter();
  const { wallet } = usePersistStore();
  const stellarTokens = useStellarTokens();

  // Latched from the URL so it survives the marker cleanup below.
  const [resume, setResume] = useState<{ chain: TurnkeyChain; sym: string } | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('offramp') !== 'coinbase') return;
    const chain = params.get('chain');
    const sym = (params.get('sym') ?? '').toUpperCase();
    if (chain && VALID_CHAINS.has(chain) && sym) {
      setResume({ chain: chain as TurnkeyChain, sym });
      router.replace(window.location.pathname); // strip markers
    }
  }, [router]);

  const chain = resume?.chain ?? null;
  const sym = resume?.sym ?? null;

  // Native balances/addresses — only fetched while a resume is in progress.
  const btc = useBtcPortfolio(chain === 'bitcoin');
  const eth = useEthPortfolio(chain === 'ethereum');
  const sol = useSolPortfolio(chain === 'solana');

  if (!resume || !chain || !sym) return null;

  let address: string | null = null;
  let token: Token | null = null;
  if (chain === 'stellar' && STELLAR_SYMBOLS.has(sym)) {
    address = wallet.address ?? null;
    token = stellarTokens.find((tk) => tk.symbol.toUpperCase() === sym) ?? null;
  } else if (chain === 'bitcoin') {
    address = btc.bitcoinAddress;
    token = btc.btcToken;
  } else if (chain === 'ethereum') {
    address = eth.ethereumAddress;
    token = eth.ethToken;
  } else if (chain === 'solana') {
    address = sol.solanaAddress;
    token = sol.solToken;
  }

  if (!address || !token) return null;

  return (
    <CoinbaseOfframpModal
      open
      onClose={() => setResume(null)}
      chain={chain}
      symbol={sym}
      address={address}
      token={token}
    />
  );
}
