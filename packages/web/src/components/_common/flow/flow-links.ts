'use client';

import type { ChainId } from '@/lib/chains/registry';
import type { StepLink, Translate } from '@/lib/flow/types';
import type { TxRecord } from '@/lib/stellar/await-tx-visible';

import { CHAINS } from '@/lib/chains/registry';
import { lifiScanTx, PIVOT_CHAIN } from '@/lib/cctp/config';
import { createStellarExpertUrl } from '@/utils/transactions.utils';

import { appLocale } from '../app-ui';

// ---------------------------------------------------------------------------
// The words and links a step shows once it happened: where the network
// recorded it ("In ledger 51,234,567 at 14:32:05") and a link to the
// network's own page for it. Explorers come from the chain registry (Stellar
// through stellar.expert, which follows the app's network).
// ---------------------------------------------------------------------------

const host = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'the explorer';
  }
};

export const stellarTxLink = (t: Translate, hash: string, label?: string): StepLink => ({
  label: label ?? t('View on stellar.expert'),
  href: createStellarExpertUrl('tx', hash),
});

export const stellarAccountHref = (address?: string | null) =>
  address ? createStellarExpertUrl('account', address) : undefined;

export const chainTxLink = (t: Translate, chain: ChainId, hash: string): StepLink => {
  const href =
    chain === 'stellar' ? createStellarExpertUrl('tx', hash) : CHAINS[chain].explorerTx(hash);
  return { label: t('View on {{site}}', { site: host(href) }), href };
};

export const chainAddressHref = (chain: ChainId, address?: string | null) =>
  !address
    ? undefined
    : chain === 'stellar'
      ? createStellarExpertUrl('account', address)
      : CHAINS[chain].explorerAddress(address);

export const baseTxLink = (t: Translate, hash: string): StepLink => {
  const href = PIVOT_CHAIN.explorerTx(hash);
  return { label: t('View on {{site}}', { site: host(href) }), href };
};

export const baseAddressHref = (address?: string | null) =>
  address ? PIVOT_CHAIN.explorerAddress(address) : undefined;

export const lifiTrackLink = (t: Translate, hash: string): StepLink => ({
  label: t('Follow it on LI.FI'),
  href: lifiScanTx(hash),
});

/** "In ledger 51,234,567 at 14:32:05", or undefined when Horizon said nothing. */
export function ledgerNote(t: Translate, record: TxRecord | null | undefined): string | undefined {
  if (!record?.ledger) return undefined;
  const n = new Intl.NumberFormat(appLocale()).format(record.ledger);
  if (!record.closedAt) return t('In ledger {{n}}', { n });
  const time = new Intl.DateTimeFormat(appLocale(), {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(record.closedAt));
  return t('In ledger {{n}} at {{time}}', { n, time });
}
