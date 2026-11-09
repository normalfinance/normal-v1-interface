import type { Metadata } from 'next';

import { notFound } from 'next/navigation';
import { indexEnabled } from '@/lib/index/flag';
import { indexBySlug } from '@/lib/index/indexes';
import { CryptoIndexView } from '@/sections/crypto-index';

// ----------------------------------------------------------------------

type Props = { params: { slug: string } };

export function generateMetadata({ params }: Props): Metadata {
  const meta = indexBySlug(params.slug);
  return {
    title: `${meta?.name ?? 'Index'} | Normal`,
    description: meta?.tagline,
    robots: { index: false, follow: false },
  };
}

export default function IndexPage({ params }: Props) {
  const meta = indexBySlug(params.slug);
  if (!indexEnabled() || !meta) notFound();
  return <CryptoIndexView meta={meta} />;
}
