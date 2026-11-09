'use client';

import type { InProgressItem } from '@/lib/cctp/in-progress';

import { paths } from '@/routes/paths';
import { useTranslate } from '@/locales';
import { useInProgress } from '@/lib/cctp/in-progress';

import SwapHorizRounded from '@mui/icons-material/SwapHorizRounded';

import {
  ListRow,
  RowIcon,
  RowList,
  AppBlock,
  assetName,
  formatUsd,
  formatCoin,
  StatusBadge,
} from '@/components/_common/app-ui';

// ---------------------------------------------------------------------------
// The Circle swaps still under way, beside the swap card (Niko 2026-11-09: the
// old block above the card had to move, and each swap opens its own page with
// every step). Plain rows like Activity's: what is moving, where it stands, a
// yellow "Needs you" only when it waits on the person. Nothing turns here; the
// actions are on the swap's page. Shows nothing when nothing is under way.
// ---------------------------------------------------------------------------

type Translate = (key: string, opts?: Record<string, unknown>) => string;

/** "1.1292 SOL to digital dollars", "$25.00 to Bitcoin". */
export function inProgressTitle(t: Translate, item: InProgressItem) {
  if (item.direction === 'stellar_to_crosschain') {
    return t('{{amount}} to {{coin}}', {
      amount: formatUsd(Number(item.amountWire) / 1e6),
      coin: assetName(item.dstAsset),
    });
  }
  const amount =
    item.srcAmount && Number(item.srcAmount) > 0
      ? formatCoin(Number(item.srcAmount), item.srcAsset)
      : assetName(item.srcAsset);
  return item.srcAsset === 'USDC'
    ? t('{{amount}} back to your Stellar wallet', {
        amount: formatUsd(Number(item.amountWire) / 1e6),
      })
    : t('{{amount}} to digital dollars', { amount });
}

/** Where it stands, in one line. */
export function inProgressLine(t: Translate, item: InProgressItem) {
  if (item.phase === 'auto') return t('Completing on its own. Nothing to do.');
  if (!item.onBase) return t('On its way to your own Base address.');
  return item.phase === 'halt-finish'
    ? t('At your own Base address. Finish the swap to {{coin}}.', {
        coin: assetName(item.dstAsset),
      })
    : t('At your own Base address. Finish it to your Stellar wallet.');
}

export function InProgressBlock() {
  const { t } = useTranslate();
  const { items } = useInProgress();
  if (!items.length) return null;

  return (
    <AppBlock flush title={t('In progress')}>
      <RowList>
        {items.map((item) => (
          <ListRow
            key={item.id}
            href={paths.swapTransfer(item.id)}
            icon={
              <RowIcon>
                <SwapHorizRounded />
              </RowIcon>
            }
            title={inProgressTitle(t, item)}
            subtitle={inProgressLine(t, item)}
            badge={
              item.phase === 'auto' ? undefined : (
                <StatusBadge tone="pending">{t('Needs you')}</StatusBadge>
              )
            }
          />
        ))}
      </RowList>
    </AppBlock>
  );
}
