'use client';

// #67: "Network fees on Stellar" explainer. The savings page's plain-language
// answer to "why does the app hold 1 XLM back, and why is my savings button
// paused?", with the same live status as the savings card (same classifier,
// so the two can never disagree).
//
// #75 round 2 (Niko): on a hybrid account this card showed ONE wallet, the
// connected slot's XLM (0.50 for a fresh Lobstr) while savings actually runs
// from either wallet via the savings-card tabs. It shows a row PER wallet;
// the header carries the WORST status (a red row under a "Healthy" header
// reads as a contradiction). Balances come from the portfolio aggregate, the
// one display source (doc 75 rule), refreshed on every activity event.
//
// 2026-11-08: the app's own parts (AppBlock, StatusBadge) replace the old
// hand-coloured card and its coloured dots: colour only where it means
// something, so "Healthy" is plain words and only pending and failed are
// coloured. When XLM is short, buying or receiving it sits beside the swap:
// a new account may have no digital dollars to swap (as on the phone).

import { paths } from '@/routes/paths';
import { BigNumber } from 'bignumber.js';
import { useTranslate } from '@/locales';
import { usePersistStore } from '@normalfinance/state';
import { connectedWalletLabel } from '@/lib/portfolio/display';
import { useWalletBalances } from '@/hooks/use-wallet-balances';
import { useSavingsPosition } from '@/hooks/use-savings-position';
import { INK, FAINT, MUTED, HAIRLINE_COLOR } from '@/theme/brand-colors';
import { useAssetActionsContext } from '@/providers/AssetActionsProvider';
import { xlmFeeStatus, SAVINGS_XLM_BUFFER, xlmAvailableForFees } from '@/utils/stellar-reserve';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import AddRounded from '@mui/icons-material/AddRounded';
import SwapHorizRounded from '@mui/icons-material/SwapHorizRounded';
import SouthWestRounded from '@mui/icons-material/SouthWestRounded';

import { FIGURES, AppBlock, StatusBadge, ActionButton } from '@/components/_common/app-ui';

type FeeStatus = 'ok' | 'low' | 'blocked';

const STATUS_RANK: Record<FeeStatus, number> = { ok: 0, low: 1, blocked: 2 };

function StatusWord({ status }: { status: FeeStatus }) {
  const { t } = useTranslate();
  if (status === 'low') return <StatusBadge tone="pending">{t('Running low')}</StatusBadge>;
  if (status === 'blocked') return <StatusBadge tone="failed">{t('Add XLM')}</StatusBadge>;
  return <Typography sx={{ fontSize: 13, color: MUTED }}>{t('Healthy')}</Typography>;
}

export function SavingsXlmFeesCard() {
  const { t } = useTranslate();
  const { wallet } = usePersistStore();
  const { startFlow } = useAssetActionsContext();
  const { position, companionPosition } = useSavingsPosition();
  const { assets, companionStellar } = useWalletBalances(true);

  if (!wallet.address) return null;

  const isExternalSlot = wallet.walletType != null && wallet.walletType !== 'normal-wallet';
  const slotXlm = BigNumber(
    assets.find((a) => a.chain === 'stellar' && a.symbol === 'XLM')?.balance ?? 0
  ).toNumber();
  const companionXlm = companionStellar
    ? BigNumber(companionStellar.assets.find((a) => a.symbol === 'XLM')?.balance ?? 0).toNumber()
    : null;

  // One row per wallet that can run savings transactions. Normal wallet
  // first, the same order as the savings-card tabs.
  const rows = [
    ...(isExternalSlot && companionXlm != null
      ? [{ key: 'normal', label: t('Normal wallet'), xlm: companionXlm }]
      : []),
    {
      key: 'slot',
      label: isExternalSlot ? connectedWalletLabel(wallet.walletType) : null,
      xlm: slotXlm,
    },
  ].map((r) => ({
    ...r,
    status: xlmFeeStatus(r.xlm) as FeeStatus,
    feeAvailable: xlmAvailableForFees(r.xlm),
  }));

  const worst = rows.reduce((a, b) => (STATUS_RANK[a.status] >= STATUS_RANK[b.status] ? a : b));
  const hasActiveSavings =
    BigNumber(position?.currentValue || 0).gt(0) ||
    BigNumber(position?.shares || 0).gt(0) ||
    BigNumber(companionPosition?.currentValue || 0).gt(0) ||
    BigNumber(companionPosition?.shares || 0).gt(0);

  const sentence = { fontSize: 13, lineHeight: '20px', color: MUTED } as const;

  return (
    <AppBlock title={t('Network fees (XLM)')} action={<StatusWord status={worst.status} />}>
      <Typography sx={sentence}>
        {t(
          'Every deposit and withdrawal is a Stellar transaction that costs a small XLM fee. No XLM means no way to move money in or out of savings.'
        )}
      </Typography>

      {hasActiveSavings && (
        <Typography sx={{ ...sentence, mt: 1 }}>
          {t(
            'While you have savings, {{buffer}} XLM is kept aside so a withdrawal can always pay its fee. That is why Send and Swap show slightly less than your full XLM balance.',
            { buffer: SAVINGS_XLM_BUFFER }
          )}
        </Typography>
      )}

      <Box sx={{ mt: 2 }}>
        {rows.map((r, index) => (
          <Box
            key={r.key}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
              py: 1.25,
              borderTop: index > 0 ? `1px solid ${HAIRLINE_COLOR}` : 'none',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: 12, color: MUTED }}>
                {r.label ?? t('Your wallet')}
              </Typography>
              {rows.length > 1 && r.status !== 'ok' && <StatusWord status={r.status} />}
            </Box>
            {/* Total first, spendable-after-reserve second: showing only the
                fee number read as a WRONG balance (Niko: "it tells Lobstr has
                0.5 XLM, but it actually has 2"). */}
            <Typography sx={{ ...FIGURES, fontSize: 13, fontWeight: 500, color: INK }}>
              {r.xlm.toFixed(2)} XLM
              <Box component="span" sx={{ color: FAINT }}>
                {` · ${r.feeAvailable.toFixed(2)} ${t('for fees')}`}
              </Box>
            </Typography>
          </Box>
        ))}
      </Box>

      {worst.status !== 'ok' && (
        <Box
          sx={{
            mt: 2,
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: 1,
            '& > :first-child': { gridColumn: '1 / -1' },
          }}
        >
          <ActionButton
            primary
            icon={<SwapHorizRounded />}
            label={t('Get XLM: swap a little USDC')}
            href={`${paths.swap}?from=USDC`}
          />
          <ActionButton
            icon={<AddRounded />}
            label={t('Buy XLM')}
            onClick={() => startFlow('buy', 'XLM')}
          />
          <ActionButton
            icon={<SouthWestRounded />}
            label={t('Receive XLM')}
            onClick={() => startFlow('receive', 'XLM')}
          />
        </Box>
      )}
    </AppBlock>
  );
}
