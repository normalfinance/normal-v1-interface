'use client';

import type { FlowSummaryRow } from '@/lib/flow/types';
import type { FlowAction } from '@/components/_common/flow';

import { useState } from 'react';
import { paths } from '@/routes/paths';
import { useTranslate } from '@/locales';
import { useRouter } from '@/routes/hooks';
import { handOffRun } from '@/lib/flow/run';
import { MUTED } from '@/theme/brand-colors';
import { CHAINS } from '@/lib/chains/registry';
import { buildAuthHeaders } from '@/utils/http';
import { TOP_3, indexById } from '@/lib/index/indexes';
import { DashboardContent } from '@/layouts/dashboard';
import { useIndexPurchase } from '@/hooks/use-index-purchase';
import { weightLabel, wireToUsdNumber } from '@/lib/index/basket';

import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';

import { FlowView } from '@/components/_common/flow';
import { AppPageHeader } from '@/components/_common/brand';
import { useSnackbar } from '@/components/template/snackbar';
import { assetName, appLocale, formatUsd, formatCoin } from '@/components/_common/app-ui';

import { purchaseJourney } from './purchase-journey';

// ---------------------------------------------------------------------------
// One index purchase's own page, for a purchase no longer on the page that
// started it (Niko 2026-11-10: "there should be some pending screen for
// indexes as well when users leave the purchase screen"). The journey its
// purchase page showed live, rebuilt from the saved purchase and its coins and
// read again every 15 seconds until it ends (purchase-journey.ts), with the
// way forward when it waits on the person: trying a held coin again.
// ---------------------------------------------------------------------------

export function IndexPurchaseView({ id }: { id: string }) {
  const { t } = useTranslate();
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const { read, deliveries, missing, refresh } = useIndexPurchase(id);
  const [retrying, setRetrying] = useState(false);

  if (missing) {
    return (
      <DashboardContent>
        <AppPageHeader
          title={t('Purchase not found')}
          subtitle={t('This purchase is not on your account. Your purchases are all in Activity.')}
        />
        <Typography sx={{ fontSize: 14, color: MUTED }}>
          <Box component="a" href={paths.activity} sx={{ color: 'inherit' }}>
            {t('See Activity')}
          </Box>
        </Typography>
      </DashboardContent>
    );
  }

  if (!read) {
    return (
      <DashboardContent>
        <Skeleton variant="text" sx={{ width: 240, fontSize: 28 }} />
        <Skeleton variant="rectangular" sx={{ mt: 3, height: 110 }} />
        <Skeleton variant="rectangular" sx={{ mt: 4, height: 420 }} />
      </DashboardContent>
    );
  }

  const meta = indexById(read.indexId) ?? TOP_3;
  const usd = (wire: string) => wireToUsdNumber(BigInt(wire || '0'));
  const words = {
    amountUsdc: formatCoin(usd(read.purchase.amountWire), 'USDC'),
    legs: read.legs.map((leg) => ({
      symbol: leg.symbol as 'BTC' | 'ETH' | 'SOL',
      amountUsdc: formatCoin(usd(leg.amountWire), 'USDC'),
      weight: weightLabel(leg.weightBps),
      amountOut:
        leg.dstAmount && Number(leg.dstAmount) > 0
          ? `≈ ${formatCoin(Number(leg.dstAmount), leg.symbol)}`
          : undefined,
    })),
  };
  const journey = purchaseJourney(t, read, words, deliveries);
  const coins = read.legs.map((leg) => assetName(leg.symbol));

  // This page only follows: once it says where the purchase stands, hand it
  // off with the words for what happens next, and who does it.
  const bitcoin = CHAINS.bitcoin.settlement;
  const waitingOnBitcoin =
    read.legs.some((leg) => leg.symbol === 'BTC') && !journey.arrived.includes('BTC');
  const handOff =
    journey.standing === 'needs-you' && journey.heldCoin
      ? t(
          'The exchange for {{coin}} kept failing, so its share is safe as digital dollars at your own Base address. Try it again on another route.',
          { coin: assetName(journey.heldCoin) }
        )
      : journey.stage === 'circle'
        ? t(
            'Circle is moving your digital dollars to your own Base address. Auto-finish buys each coin when they arrive. You can leave this page.'
          )
        : journey.stage === 'buying'
          ? t('Auto-finish is buying each coin at its share. You can leave this page.')
          : deliveries.BTC?.phase === 'confirming'
            ? t(
                'Your Bitcoin was sent and the Bitcoin network is confirming it. It shows in your balance once confirmed. You can leave this page.'
              )
            : waitingOnBitcoin
              ? t(
                  'The exchanges are sending each coin to your own wallet. Bitcoin usually takes {{min}} to {{max}} minutes. You can leave this page.',
                  { min: bitcoin.minMinutes, max: bitcoin.maxMinutes }
                )
              : t(
                  'The exchanges are sending each coin to your own wallet. You can leave this page.'
                );
  const last = Date.parse(read.purchase.updatedAt) || Date.now();
  const run =
    journey.standing === 'on-its-way' || journey.standing === 'needs-you'
      ? handOffRun(journey.run, handOff, last)
      : journey.run;

  const retry = async () => {
    if (retrying || !journey.heldCoin) return;
    setRetrying(true);
    const coin = assetName(journey.heldCoin);
    const res = await fetch(`/api/index/purchases/${id}/retry`, {
      method: 'POST',
      headers: await buildAuthHeaders(),
      credentials: 'include',
    }).catch(() => null);
    setRetrying(false);
    enqueueSnackbar(
      res?.ok
        ? t('{{coin}} is being bought again. It finishes on its own.', { coin })
        : t('That did not start. Your {{coin}} share is still safe at your own Base address.', {
            coin,
          }),
      { variant: res?.ok ? 'info' : 'error' }
    );
    refresh();
    window.dispatchEvent(new Event('nf:activity-updated'));
  };

  const activity: FlowAction = { label: t('See it in Activity'), href: paths.activity };
  const doneActions: FlowAction[] =
    journey.standing === 'needs-you' && journey.heldCoin
      ? [
          {
            label: retrying
              ? t('Working…')
              : t('Try {{coin}} again', { coin: assetName(journey.heldCoin) }),
            primary: true,
            onClick: retry,
          },
          activity,
        ]
      : journey.standing === 'done'
        ? [
            { label: t('Buy more'), primary: true, href: paths.indexes.details(meta.slug) },
            activity,
          ]
        : [{ label: t('Back to indexes'), primary: true, href: paths.indexes.root }, activity];

  const started = new Intl.DateTimeFormat(appLocale(), {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(Date.parse(read.purchase.createdAt));
  const summaryRows: FlowSummaryRow[] = [
    {
      key: 'pay',
      label: t('You pay'),
      value: formatUsd(usd(read.purchase.amountWire)),
      detail: t('Digital dollars from your Stellar wallet'),
    },
    ...read.legs.map((leg) => ({
      key: leg.symbol,
      asset: leg.symbol,
      label: t('{{coin}} · {{weight}}', {
        coin: assetName(leg.symbol),
        weight: weightLabel(leg.weightBps),
      }),
      value: formatUsd(usd(leg.amountWire)),
      detail:
        leg.dstAmount && Number(leg.dstAmount) > 0
          ? `≈ ${formatCoin(Number(leg.dstAmount), leg.symbol)}`
          : undefined,
    })),
    { key: 'started', label: t('Started'), value: started },
  ];

  return (
    <DashboardContent>
      <FlowView
        plan={journey.plan}
        run={run}
        summary={{ rows: summaryRows }}
        titles={{
          review: meta.name,
          running: t('Buying {{name}}', { name: meta.name }),
          done: t('Purchase complete'),
          failed: t('Purchase stopped'),
          stopped: t('Purchase ended'),
          'handed-off':
            journey.standing === 'needs-you'
              ? t('Your purchase needs you')
              : t('Purchase on its way'),
        }}
        handOffTitle={journey.standing === 'needs-you' ? t('Needs you') : undefined}
        lede={t('{{pay}} of {{name}}: {{coins}}.', {
          pay: formatUsd(usd(read.purchase.amountWire)),
          name: meta.name,
          coins: coins.join(', '),
        })}
        confirm={{ label: '', onClick: () => {} }}
        back={{ label: t('Back to indexes'), onClick: () => router.push(paths.indexes.root) }}
        doneActions={doneActions}
        failActions={[activity]}
        leave={{ safe: true, message: '' }}
      />
    </DashboardContent>
  );
}
