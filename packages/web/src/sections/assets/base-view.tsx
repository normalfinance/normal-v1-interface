'use client';

import type { FlowSummary } from '@/lib/flow/types';
import type { PortfolioAsset } from '@/types/portfolio';

import { paths } from '@/routes/paths';
import { logger } from '@/utils/logger';
import { useTranslate } from '@/locales';
import { useState, useCallback } from 'react';
import { useFlowRun } from '@/hooks/use-flow-run';
import { runBaseBringHome } from '@/lib/cctp/refund';
import { useNetworkStore } from '@normalfinance/state';
import { DashboardContent } from '@/layouts/dashboard';
import { baseAssetToToken } from '@/lib/portfolio/display';
import { INK, MUTED, INK_SOFT } from '@/theme/brand-colors';
import { useTurnkeyWallet } from '@/hooks/use-turnkey-wallet';
import { shortAddress, cctpRefundPlan } from '@/lib/flow/plans';
import { useWalletBalances } from '@/hooks/use-wallet-balances';
import { PIVOT_CHAIN, CCTP_ETA_SECONDS } from '@/lib/cctp/config';
import { friendlyAppError } from '@/utils/errors/error-classifier';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import NorthEastRounded from '@mui/icons-material/NorthEastRounded';
import SouthWestRounded from '@mui/icons-material/SouthWestRounded';

import { AppPageHeader } from '@/components/_common/brand';
import { AssetAvatar } from '@/components/_common/asset-avatar';
import { FlowHost, FlowView, FlowPortal } from '@/components/_common/flow';
import {
  baseTxLink,
  baseAddressHref,
  stellarAccountHref,
} from '@/components/_common/flow/flow-links';
import {
  SeeAll,
  ListRow,
  RowList,
  AppBlock,
  Headline,
  formatUsd,
  formatCoin,
  ActionButton,
  RowsSkeleton,
} from '@/components/_common/app-ui';

// ---------------------------------------------------------------------------
// Doc 129: what the person's own address on Base holds, and why.
//
// Base is the network Circle swaps and Autoinvest purchases pass through. Two
// things can sit on the person's address there:
//   - USDC: an Autoinvest coin on hold, a swap that stopped on the way, or USDC
//     someone sent to the address (an exchange withdrawal);
//   - ETH: the few cents of gas Normal's relayer sends so a Base step can
//     finish (server/cctp-transfer-gas.ts). What is left stays and pays the
//     next step.
// Both are the person's and count toward their total. The words say exactly
// that, plainly, because a balance nobody explains reads as a mistake.
// ---------------------------------------------------------------------------

/** The smallest move (the server's BRING_HOME_MIN_WIRE): Normal pays both networks' fees. */
const MIN_MOVE_USD = 1;

const asNumber = (a: PortfolioAsset | undefined) => (a?.balance ? Number(a.balance) : 0);
const valueOf = (a: PortfolioAsset | undefined) => (a?.usdValue ? Number(a.usdValue) : 0);

export default function BaseView() {
  const { t } = useTranslate();
  const network = useNetworkStore((s) => s.network);
  const { base, isLoading, refresh } = useWalletBalances(true);
  const { addresses: turnkey } = useTurnkeyWallet();
  const flow = useFlowRun();
  const [flowOpen, setFlowOpen] = useState(false);

  const usdc = base?.assets.find((a) => a.symbol === 'USDC');
  const eth = base?.assets.find((a) => a.symbol === 'ETH');
  const total = valueOf(usdc) + valueOf(eth);
  const stale = [usdc, eth].some((a) => a?.status === 'stale');
  const explorer = base?.address
    ? network === 'mainnet'
      ? PIVOT_CHAIN.explorerAddress(base.address)
      : PIVOT_CHAIN.testnetExplorerAddress(base.address)
    : null;

  // ---- Move to Stellar (doc 129 Phase 2b) -----------------------------------
  // Everything on the Base address comes home to the person's own Stellar
  // wallet: the same steps as a swap's Bring back (lib/cctp/refund.ts), with
  // Auto-finish signing when it is on and the passkey otherwise.
  const usdcAmount = asNumber(usdc);
  const stellarAddress = turnkey?.stellarAddress ?? null;
  const minutes = Math.round(CCTP_ETA_SECONDS.fromEvm / 60 / 5) * 5;
  const moveBlocked = !stellarAddress
    ? t('Set up your Stellar wallet first: it is where these dollars go.')
    : usdcAmount < MIN_MOVE_USD
      ? t('Amounts under $1 stay on Base until there is more.')
      : null;

  const planFor = useCallback(
    () =>
      cctpRefundPlan({
        t,
        kind: 'move',
        amountUsdc: formatCoin(usdcAmount, 'USDC'),
        baseWallet: base?.address
          ? { address: base.address, href: baseAddressHref(base.address) }
          : undefined,
        stellarWallet: stellarAddress
          ? { address: stellarAddress, href: stellarAccountHref(stellarAddress) }
          : undefined,
      }),
    [t, usdcAmount, base?.address, stellarAddress]
  );

  const openMove = () => {
    flow.reset();
    flow.replan(planFor());
    setFlowOpen(true);
  };
  const closeMove = () => {
    setFlowOpen(false);
    flow.reset();
  };

  const confirmMove = async () => {
    if (!base?.address || !stellarAddress || moveBlocked) return;
    flow.begin(planFor());
    try {
      const { burnTxHash, signedBy } = await runBaseBringHome({
        network,
        baseAddress: base.address,
        stellarAddress,
        tryAutopilotFirst: true,
        onStage: (stage) =>
          stage === 'topup'
            ? flow.start('refund-gas')
            : flow.start('refund-sign', { waiting: true }),
      });
      if (signedBy === 'autopilot') flow.skip('refund-sign', t('Auto-finish signed it for you.'));
      flow.done('refund-burn', { links: [baseTxLink(t, burnTxHash)] });
      flow.start('refund-attest');
      // Circle's wait on Base finality and the mint run on Normal's servers.
      flow.handOff(
        t(
          'Your digital dollars are on their way to your Stellar wallet. They arrive in about {{n}} minutes, and Normal finishes it on its own.',
          { n: minutes }
        )
      );
      window.dispatchEvent(new Event('nf:activity-updated'));
      refresh();
    } catch (e) {
      logger.error('[base bring-home] failed:', e);
      flow.fail(friendlyAppError(e));
    }
  };

  const summary: FlowSummary = {
    rows: [
      {
        key: 'amount',
        label: t('Amount'),
        value: formatCoin(usdcAmount, 'USDC'),
        detail: formatUsd(valueOf(usdc)),
      },
      {
        key: 'from',
        label: t('From'),
        value: t('Your Base address'),
        detail: shortAddress(base?.address),
      },
      {
        key: 'to',
        label: t('To'),
        value: t('Your Stellar wallet'),
        detail: shortAddress(stellarAddress),
      },
      { key: 'fees', label: t('Network fees'), value: t('Normal pays them') },
      { key: 'time', label: t('Time'), value: t('About {{n}} minutes', { n: minutes }) },
    ],
    note: t(
      'Everything on your Base address comes home. If an Autoinvest coin is still waiting for these dollars, it is not bought: the dollars come to your Stellar wallet instead.'
    ),
  };

  const row = (a: PortfolioAsset | undefined, subtitle: string) =>
    a ? (
      <ListRow
        icon={<AssetAvatar token={baseAssetToToken(a)} size={40} />}
        title={a.symbol === 'USDC' ? t('Digital dollars') : t('Ethereum')}
        subtitle={subtitle}
        value={formatUsd(valueOf(a))}
        detail={formatCoin(asNumber(a), a.symbol)}
      />
    ) : null;

  return (
    <DashboardContent>
      {/* Move to Stellar opens its review here, in place of the page, with the
          sidebar beside it (components/_common/flow). */}
      <FlowHost>
        <AppPageHeader
          title={t('On Base')}
          subtitle={t('What your own address on Base holds, and why it is there.')}
          action={<SeeAll href={paths.assets.root}>{t('All assets')}</SeeAll>}
        />

        {isLoading && !base ? (
          <RowsSkeleton rows={2} />
        ) : !base ? (
          <Typography sx={{ fontSize: 15, color: MUTED, mt: 3 }}>
            {t(
              'You have no Base address yet. It is the same as your Ethereum address, and it appears once you add Ethereum.'
            )}
          </Typography>
        ) : (
          <>
            <Headline
              label={t('Total on Base')}
              value={formatUsd(total)}
              note={
                stale
                  ? t('Base did not answer just now, so this is the last known balance.')
                  : undefined
              }
            />

            <AppBlock title={t('Digital dollars on Base')} sx={{ mt: { xs: 4, md: 5 } }}>
              <RowList>{row(usdc, t('USDC · Base'))}</RowList>
              <Typography sx={{ fontSize: 14, color: MUTED, mt: 1.5, maxWidth: 640 }}>
                {t(
                  'Base is the network your Circle swaps and Autoinvest purchases pass through. Digital dollars wait here when an Autoinvest coin is on hold, when a swap stopped on the way, or when someone sends USDC to your Base address. They are yours and count toward your total.'
                )}
              </Typography>
              {usdc && usdcAmount > 0 && (
                <Box
                  sx={{
                    mt: 2.5,
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: 1.5,
                  }}
                >
                  {!moveBlocked && (
                    <ActionButton
                      primary
                      icon={<SouthWestRounded sx={{ fontSize: 18 }} />}
                      label={t('Move to Stellar')}
                      onClick={openMove}
                    />
                  )}
                  <Typography sx={{ fontSize: 13.5, color: MUTED }}>
                    {moveBlocked ??
                      t('About {{n}} minutes. Normal pays the network fees.', { n: minutes })}
                  </Typography>
                </Box>
              )}
            </AppBlock>

            <AppBlock title={t('Ethereum on Base')} sx={{ mt: { xs: 4, md: 5 } }}>
              <RowList>{row(eth, t('ETH · Base · Network fees'))}</RowList>
              <Typography sx={{ fontSize: 14, color: MUTED, mt: 1.5, maxWidth: 640 }}>
                {t(
                  'Each step on Base costs a small network fee, paid in ETH. When one of your purchases or swaps needs it, Normal sends a few cents of ETH to your own Base address so the step can finish. What is left stays at your address and pays for the next step. It is yours and counts toward your total. You do not need to do anything with it.'
                )}
              </Typography>
            </AppBlock>

            <Box
              sx={{
                mt: { xs: 4, md: 5 },
                display: 'flex',
                flexWrap: 'wrap',
                columnGap: 1.5,
                rowGap: 0.5,
                alignItems: 'baseline',
              }}
            >
              <Typography sx={{ fontSize: 14, color: MUTED }}>
                {t('Your Base address is your Ethereum address:')}
              </Typography>
              <Typography
                sx={{
                  fontSize: 14,
                  color: INK_SOFT,
                  fontFamily: '"Geist Mono", ui-monospace, monospace',
                  wordBreak: 'break-all',
                }}
              >
                {base.address}
              </Typography>
              {explorer && (
                <Link
                  href={explorer}
                  target="_blank"
                  rel="noopener noreferrer"
                  underline="hover"
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.5,
                    fontSize: 14,
                    fontWeight: 500,
                    color: INK,
                    textUnderlineOffset: '3px',
                  }}
                >
                  {t('Check it on BaseScan')}
                  <NorthEastRounded sx={{ fontSize: 15, color: MUTED }} />
                </Link>
              )}
            </Box>
          </>
        )}

        {flowOpen && flow.plan && (
          <FlowPortal>
            <FlowView
              plan={flow.plan}
              run={flow.run}
              summary={summary}
              titles={{
                review: t('Review your move'),
                running: t('Moving to Stellar'),
                done: t('Move complete'),
                failed: t('Move stopped'),
                stopped: t('Move ended'),
                'handed-off': t('Move on its way'),
              }}
              lede={t('{{amount}} from Base to your Stellar wallet', {
                amount: formatCoin(usdcAmount, 'USDC'),
              })}
              confirm={{ label: t('Move to Stellar'), onClick: confirmMove, blocked: moveBlocked }}
              back={{ label: t('Back'), onClick: closeMove }}
              doneActions={[
                { label: t('Back to Base'), primary: true, onClick: closeMove },
                { label: t('See it in Activity'), href: paths.activity },
              ]}
              failActions={[{ label: t('Back to Base'), primary: true, onClick: closeMove }]}
              leave={{
                safe: flow.run.phase !== 'running',
                message: t(
                  'Stay on this page until the move is sent. Leaving now stops it, and nothing is lost.'
                ),
              }}
            />
          </FlowPortal>
        )}
      </FlowHost>
    </DashboardContent>
  );
}
