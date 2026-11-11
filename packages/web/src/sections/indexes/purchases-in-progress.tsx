'use client';

import type { Theme, SxProps } from '@mui/material/styles';
import type { PurchaseInProgress } from '@/hooks/use-index-purchase';

import { paths } from '@/routes/paths';
import { useTranslate } from '@/locales';
import { wireToUsdNumber } from '@/lib/index/basket';
import { TOP_3, indexById } from '@/lib/index/indexes';
import { useIndexPurchasesInProgress } from '@/hooks/use-index-purchase';

import DonutSmallOutlined from '@mui/icons-material/DonutSmallOutlined';

import {
  ListRow,
  RowIcon,
  RowList,
  AppBlock,
  assetName,
  formatUsd,
  StatusBadge,
} from '@/components/_common/app-ui';

// ---------------------------------------------------------------------------
// Index purchases still under way, on the Indexes pages (Niko 2026-11-10: a
// pending screen for indexes when people leave the purchase screen), as Swap
// lists its own. Plain rows: what was bought, where it stands, a yellow
// "Needs you" only when a coin waits for the person. Each opens the purchase's
// own page with every step. Nothing shows when nothing is under way.
// ---------------------------------------------------------------------------

type Translate = (key: string, opts?: Record<string, unknown>) => string;

/** Where it stands, in one short line (whole in a phone's row). */
export function purchaseLine(t: Translate, item: PurchaseInProgress) {
  if (item.standing === 'needs-you' && item.heldCoin) {
    return t('{{coin}} waits for you: try it again.', { coin: assetName(item.heldCoin) });
  }
  if (item.stage === 'circle') return t('Circle is moving it to Base. Nothing to do.');
  if (item.stage === 'buying') return t('Buying the coins. Nothing to do.');
  return item.arrived.length
    ? t('Arriving: {{coins}} in your wallet.', { coins: item.arrived.map(assetName).join(', ') })
    : t('The exchanges are delivering. Nothing to do.');
}

export function IndexPurchasesInProgress({
  indexId,
  sx,
}: {
  /** Only this index's purchases (an index's own page). */
  indexId?: string;
  sx?: SxProps<Theme>;
}) {
  const { t } = useTranslate();
  const items = useIndexPurchasesInProgress().filter(
    (item) => !indexId || !item.indexId || item.indexId === indexId
  );
  if (!items.length) return null;

  return (
    <AppBlock flush open title={t('In progress')} sx={sx}>
      <RowList>
        {items.map((item) => {
          const meta = indexById(item.indexId) ?? TOP_3;
          return (
            <ListRow
              key={item.id}
              href={paths.indexes.purchase(item.id)}
              icon={
                <RowIcon>
                  <DonutSmallOutlined />
                </RowIcon>
              }
              title={t('{{amount}} of {{name}}', {
                amount: formatUsd(wireToUsdNumber(BigInt(item.amountWire))),
                name: meta.name,
              })}
              subtitle={purchaseLine(t, item)}
              badge={
                item.standing === 'needs-you' ? (
                  <StatusBadge tone="pending">{t('Needs you')}</StatusBadge>
                ) : undefined
              }
            />
          );
        })}
      </RowList>
    </AppBlock>
  );
}
