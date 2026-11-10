'use client';

import type { FlowSummaryRow } from '@/lib/flow/types';
import type { FlowAction } from '@/components/_common/flow';

import { paths } from '@/routes/paths';
import { useTranslate } from '@/locales';
import { useRouter } from '@/routes/hooks';
import { handOffRun } from '@/lib/flow/run';
import { MUTED } from '@/theme/brand-colors';
import { buildAuthHeaders } from '@/utils/http';
import { wireToUsdc } from '@/lib/cctp/decimals';
import { DashboardContent } from '@/layouts/dashboard';
import { useInProgress } from '@/lib/cctp/in-progress';
import { useBtcPortfolio } from '@/hooks/use-btc-portfolio';
import { useMemo, useState, useEffect, useCallback } from 'react';
import { useSupabaseAuth } from '@/providers/SupabaseAuthProvider';
import { useEthPortfolio, useSolPortfolio } from '@/hooks/use-chain-portfolio';
import { autopilotActiveFor, AUTOPILOT_CHANGED_EVENT } from '@/lib/cctp/autopilot-active';

import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';

import { FlowView } from '@/components/_common/flow';
import { AppPageHeader } from '@/components/_common/brand';
import { assetName, appLocale, formatCoin } from '@/components/_common/app-ui';

import { transferJourney } from './transfer-journey';
import { CctpRecoveryBanner } from './cctp-resume-banner';
import { bannerPhase, exchangeSlowAfterMs } from './cctp-phase';

import type { TransferRowForJourney } from './transfer-journey';

// ---------------------------------------------------------------------------
// One Circle swap's own page, for a swap no longer on the page that started it
// (Niko 2026-11-09: a swap you closed out opens a page with all its steps).
// The journey it would have shown live, rebuilt from the transfer's row and
// read again every 15 seconds until it ends; when its next step needs the
// person's passkey, the way forward is here ("Finish the swap", "Bring back as
// digital dollars"), carried out by the page's one recovery keeper. Who it
// waits on comes from that keeper (cctp-phase.ts waitsOn): the exchange, Normal
// or the person; only the person is "Needs you" (Niko 2026-11-10).
// ---------------------------------------------------------------------------

type Row = TransferRowForJourney & {
  id: string;
  srcAmount: string | null;
  dstAmount: string | null;
  amountWire: string;
  quoteJson?: string | null;
};

// The exchanges LI.FI picks, by the key a transfer stores (quoteJson.lifiTool).
const TOOL_NAMES: Record<string, string> = {
  mayan: 'Mayan',
  mayanMCTP: 'Mayan',
  mayanWH: 'Mayan',
  chainflip: 'Chainflip',
  near: 'NEAR Intents',
  relay: 'Relay',
  relaydepository: 'Relay',
  across: 'Across',
  stargate: 'Stargate',
  stargateV2: 'Stargate',
  allbridge: 'Allbridge',
  symbiosis: 'Symbiosis',
  thorswap: 'THORSwap',
};

function toolOf(row: Row) {
  try {
    const key = row.quoteJson ? JSON.parse(row.quoteJson)?.lifiTool : null;
    return (typeof key === 'string' && TOOL_NAMES[key]) || 'LI.FI';
  } catch {
    return 'LI.FI';
  }
}

const ENDED = ['COMPLETED', 'FAILED', 'REFUNDED'];

export function TransferView({ id }: { id: string }) {
  const { t } = useTranslate();
  const router = useRouter();
  const { user } = useSupabaseAuth();
  const { items, busyId } = useInProgress();
  const [row, setRow] = useState<Row | null>(null);
  const [missing, setMissing] = useState(false);
  const [autopilot, setAutopilot] = useState(false);

  // The page's one recovery keeper needs the coin addresses a swap out pays to.
  const btc = useBtcPortfolio(true);
  const eth = useEthPortfolio(true);
  const sol = useSolPortfolio(true);
  const addresses = useMemo(
    () => ({ BTC: btc.bitcoinAddress, ETH: eth.ethereumAddress, SOL: sol.solanaAddress }),
    [btc.bitcoinAddress, eth.ethereumAddress, sol.solanaAddress]
  );

  // Read the row (the read also nudges the transfer forward), every 15
  // seconds until it ends, and at once after a finish or a bring-back.
  const read = useCallback(async () => {
    const res = await fetch(`/api/cctp/transfers/${id}`, {
      headers: await buildAuthHeaders(),
      credentials: 'include',
    }).catch(() => null);
    if (res?.status === 404) {
      setMissing(true);
      return null;
    }
    const data = res?.ok ? await res.json().catch(() => null) : null;
    if (data?.transfer) setRow(data.transfer as Row);
    return (data?.transfer as Row | undefined) ?? null;
  }, [id]);

  useEffect(() => {
    if (!user) return undefined;
    let stop = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const loop = async () => {
      const next = await read();
      if (stop) return;
      const ended =
        next &&
        ENDED.includes(next.status) &&
        (next.status !== 'COMPLETED' ||
          next.direction !== 'stellar_to_crosschain' ||
          !!next.dstSwapTxHash);
      if (!ended) timer = setTimeout(loop, 15_000);
    };
    loop();
    const again = () => {
      read();
    };
    window.addEventListener('nf:activity-updated', again);
    return () => {
      stop = true;
      clearTimeout(timer);
      window.removeEventListener('nf:activity-updated', again);
    };
  }, [user, read]);

  // The words of the steps depend on it ("signed for you by auto-finish"):
  // one read, shared with the page's keeper, again when it is turned on or off.
  useEffect(() => {
    if (!user) return undefined;
    let live = true;
    const readAutopilot = () => {
      autopilotActiveFor(user.id).then((on) => {
        if (live) setAutopilot(on);
      });
    };
    readAutopilot();
    window.addEventListener(AUTOPILOT_CHANGED_EVENT, readAutopilot);
    return () => {
      live = false;
      window.removeEventListener(AUTOPILOT_CHANGED_EVENT, readAutopilot);
    };
  }, [user]);

  // An index purchase opened here (an old link) goes to its own page.
  const indexPurchase = row?.direction === 'stellar_to_index';
  useEffect(() => {
    if (indexPurchase) router.replace(paths.indexes.purchase(id));
  }, [indexPurchase, id, router]);

  const keeper = <CctpRecoveryBanner addresses={addresses} />;

  if (missing) {
    return (
      <DashboardContent>
        {keeper}
        <AppPageHeader
          title={t('Swap not found')}
          subtitle={t('This swap is not on your account. Your swaps are all in Activity.')}
        />
        <Typography sx={{ fontSize: 14, color: MUTED }}>
          <Box component="a" href={paths.activity} sx={{ color: 'inherit' }}>
            {t('See Activity')}
          </Box>
        </Typography>
      </DashboardContent>
    );
  }

  // An index purchase has its own page, with its coins' steps.
  if (!row || row.direction === 'stellar_to_index') {
    return (
      <DashboardContent>
        {keeper}
        <Skeleton variant="text" sx={{ width: 240, fontSize: 28 }} />
        <Skeleton variant="rectangular" sx={{ mt: 3, height: 110 }} />
        <Skeleton variant="rectangular" sx={{ mt: 4, height: 420 }} />
      </DashboardContent>
    );
  }

  const tool = toolOf(row);
  // The keeper's view of this swap: where it is and who moves it next.
  const item = items.find((i) => i.id === row.id);
  // Before the keeper has read it (its first second): a swap in whose coin
  // went to the exchange is with the exchange, as the keeper's own first answer
  // is until it has seen the Base address. Never "needs you" on a guess.
  const waits =
    item?.waitsOn ??
    (row.direction === 'crosschain_to_stellar' && bannerPhase(row) === 'halt-receive'
      ? 'exchange'
      : undefined);
  const autoFinish = item?.autoFinish ?? autopilot;
  const usdc = Number(wireToUsdc(BigInt(row.amountWire || '0')));
  const words = {
    amountIn:
      row.srcAmount && Number(row.srcAmount) > 0
        ? formatCoin(Number(row.srcAmount), row.srcAsset)
        : assetName(row.srcAsset),
    usdcOut: `≈ ${formatCoin(usdc, 'USDC')}`,
    amountUsdc: formatCoin(usdc, 'USDC'),
    amountOut:
      row.dstAmount && Number(row.dstAmount) > 0
        ? `≈ ${formatCoin(Number(row.dstAmount), row.dstAsset)}`
        : assetName(row.dstAsset),
    tool,
    autopilot,
    // Seen at Base by the keeper, or proved by the mint of a swap out.
    onBase:
      (item?.onBase ?? false) ||
      (row.direction === 'stellar_to_crosschain' &&
        (!!row.mintTxHash || row.status === 'COMPLETED')),
    waits,
  };
  const journey = transferJourney(t, row, words);
  const coin = assetName(journey.kind === 'out' ? row.dstAsset : row.srcAsset);
  const busy = busyId === row.id;

  // This page only follows: once the row says where it stands, hand it off
  // with the words for what happens next, and who does it.
  const halt = item?.phase;
  // The exchange has had it longer than usual (twice its chain's window):
  // say so, and how it can end, instead of a clock that only counts up.
  const exchangeSlow =
    waits === 'exchange' &&
    Date.now() - (Date.parse(row.updatedAt) || Date.now()) > exchangeSlowAfterMs(row.srcAsset);
  const exchangeWords = exchangeSlow
    ? autoFinish
      ? t(
          'This is taking longer than usual. Your {{coin}} went to {{tool}}: it either delivers the digital dollars to your own Base address or sends your {{coin}} back to your wallet. Normal finishes the swap on its own once they arrive. You can leave this page.',
          { coin, tool }
        )
      : t(
          'This is taking longer than usual. Your {{coin}} went to {{tool}}: it either delivers the digital dollars to your own Base address or sends your {{coin}} back to your wallet. Once they arrive, finish the swap here with your passkey. You can leave this page.',
          { coin, tool }
        )
    : autoFinish
      ? t(
          '{{tool}} is turning your {{coin}} into digital dollars and sending them to your own Base address. Normal finishes the swap on its own once they arrive. You can leave this page.',
          { coin, tool }
        )
      : t(
          '{{tool}} is turning your {{coin}} into digital dollars and sending them to your own Base address. Once they arrive, finish the swap here with your passkey. You can leave this page.',
          { coin, tool }
        );
  const handOff =
    journey.standing === 'needs-you'
      ? journey.kind === 'out'
        ? t(
            'Your digital dollars are at your own Base address. Finish the swap to {{coin}}, or bring them back to your Stellar wallet as digital dollars.',
            { coin }
          )
        : t(
            'Your digital dollars are at your own Base address. Finish the swap to send them on to your Stellar wallet.'
          )
      : waits === 'exchange'
        ? exchangeWords
        : waits === 'normal' && halt !== 'auto'
          ? journey.kind === 'out'
            ? t(
                'Your digital dollars are at your own Base address. Normal swaps them to {{coin}} on its own shortly. You can leave this page.',
                { coin }
              )
            : t(
                'Your digital dollars are at your own Base address. Normal sends them on to your Stellar wallet on its own shortly. You can leave this page.'
              )
          : journey.kind === 'out'
            ? row.dstSwapTxHash
              ? t('The exchange is sending your {{coin}} to your wallet. It finishes on its own.', {
                  coin,
                })
              : t(
                  'Circle is moving your digital dollars to your Base address. The swap to {{coin}} follows when they arrive.',
                  { coin }
                )
            : t(
                'Circle is moving your digital dollars to your Stellar wallet. Normal finishes it on its own, usually within 20 minutes. You can leave this page.'
              );
  const run =
    journey.standing === 'needs-you' || journey.standing === 'on-its-way'
      ? handOffRun(journey.run, handOff, Date.parse(row.updatedAt) || Date.now())
      : journey.run;

  const activity: FlowAction = { label: t('See it in Activity'), href: paths.activity };
  const doneActions: FlowAction[] =
    journey.standing === 'needs-you'
      ? [
          {
            label: busy ? t('Working…') : t('Finish the swap'),
            primary: true,
            onClick: () => {
              if (busy) return;
              window.dispatchEvent(new CustomEvent('nf:cctp-resume', { detail: { id: row.id } }));
            },
          },
          ...(halt === 'halt-finish'
            ? [
                {
                  label: t('Bring back as digital dollars'),
                  onClick: () => {
                    if (busy) return;
                    window.dispatchEvent(
                      new CustomEvent('nf:cctp-refund', { detail: { id: row.id } })
                    );
                  },
                },
              ]
            : []),
          activity,
        ]
      : journey.standing === 'done'
        ? [{ label: t('Make another swap'), primary: true, href: paths.swap }, activity]
        : [{ label: t('Back to swap'), primary: true, href: paths.swap }, activity];

  const started = new Intl.DateTimeFormat(appLocale(), {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(Date.parse(row.createdAt));
  const summaryRows: FlowSummaryRow[] =
    journey.kind === 'back'
      ? [
          {
            key: 'amount',
            label: t('Coming back'),
            value: words.amountUsdc,
            detail: t('Digital dollars to your Stellar wallet'),
          },
          { key: 'started', label: t('Started'), value: started },
        ]
      : [
          {
            key: 'pay',
            label: t('You pay'),
            value: journey.kind === 'out' ? words.amountUsdc : words.amountIn,
          },
          {
            key: 'receive',
            label: t('You receive'),
            value: journey.kind === 'out' ? words.amountOut : words.usdcOut,
            detail:
              journey.kind === 'out'
                ? t('In your {{coin}} wallet', { coin })
                : t('In your Stellar wallet'),
          },
          { key: 'exchange', label: t('Exchange'), value: tool, detail: t('Picked by LI.FI') },
          { key: 'started', label: t('Started'), value: started },
        ];

  const lede =
    journey.kind === 'back'
      ? t('{{amount}} back to your Stellar wallet.', { amount: words.amountUsdc })
      : journey.kind === 'out'
        ? t('{{pay}} for about {{get}}, through {{tool}}.', {
            pay: words.amountUsdc,
            get: words.amountOut.replace(/^≈ /, ''),
            tool,
          })
        : t('{{pay}} for about {{get}} in your Stellar wallet, through {{tool}}.', {
            pay: words.amountIn,
            get: words.usdcOut.replace(/^≈ /, ''),
            tool,
          });

  return (
    <DashboardContent>
      {keeper}
      <FlowView
        plan={journey.plan}
        run={run}
        summary={{ rows: summaryRows }}
        titles={{
          review: t('Swap'),
          running: t('Swapping'),
          done: t('Swap complete'),
          failed: t('Swap stopped'),
          stopped: t('Swap ended'),
          'handed-off':
            journey.standing === 'needs-you' ? t('Your swap needs you') : t('Swap on its way'),
        }}
        handOffTitle={journey.standing === 'needs-you' ? t('Needs you') : undefined}
        lede={lede}
        confirm={{ label: '', onClick: () => {} }}
        back={{ label: t('Back to swap'), onClick: () => router.push(paths.swap) }}
        doneActions={doneActions}
        failActions={[]}
        leave={{ safe: true, message: '' }}
      />
    </DashboardContent>
  );
}
