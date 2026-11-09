import type { Metadata } from 'next';

import { notFound } from 'next/navigation';
import { indexEnabled } from '@/lib/index/flag';
import { CryptoIndexView } from '@/sections/crypto-index';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Crypto index | Normal',
  description: 'Bitcoin, Ethereum and Solana in one purchase, with one signature.',
  robots: { index: false, follow: false },
};

export default function CryptoIndexPage() {
  // Off until the team switches it on (lib/index/flag.ts).
  if (!indexEnabled()) notFound();
  return <CryptoIndexView />;
}
