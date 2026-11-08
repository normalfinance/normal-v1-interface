'use client';

import type { BoxProps } from '@mui/material';
import type { FlowPlan, FlowSummary } from '@/lib/flow/types';
import type { SavingsProgress } from '@/hooks/stellar/use-defindex-savings';

import { paths } from '@/routes/paths';
import { useTranslate } from '@/locales';
import { useStellarConfig } from '@/hooks';
import { useRouter } from 'next/navigation';
import { useFlowRun } from '@/hooks/use-flow-run';
import { chainOfActivityEvent } from '@/lib/tx-events';
import { usePersistStore } from '@normalfinance/state';
import { useStellarTokens } from '@/hooks/use-stellar-tokens';
import { awaitTxRecord } from '@/lib/stellar/await-tx-visible';
import { connectedWalletLabel } from '@/lib/portfolio/display';
import { useWalletBalances } from '@/hooks/use-wallet-balances';
import { useTrustLine } from '@/hooks/stellar/tokens/use-trustline';
import { useAccountStatus } from '@/hooks/stellar/use-account-status';
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useDefindexSavings } from '@/hooks/stellar/use-defindex-savings';
import { useAssetActionsContext } from '@/providers/AssetActionsProvider';
import { depositPlan, withdrawPlan, shortAddress } from '@/lib/flow/plans';
import { xlmFeeStatus, xlmAvailableForFees } from '@/utils/stellar-reserve';
import {
  getYieldCommission,
  getSavingsDepositFee,
  getYieldCommissionRate,
} from '@/utils/normal-fees';
import {
  getTokenBalance,
  getSavingsUsdcIssuer,
  getSavingsDepositToken,
  getSavingsDepositTokenLabel,
} from '@/utils/token-selectors';

import { Box, Stack, Button, Skeleton, Typography, CircularProgress } from '@mui/material';

import { FlowView, FlowPortal } from '@/components/_common/flow';
import { formatUsd, formatCoin } from '@/components/_common/app-ui';
import {
  ledgerNote,
  stellarTxLink,
  stellarAccountHref,
} from '@/components/_common/flow/flow-links';

import { WalletGate } from './wallet-gate';
import { Iconify } from '../template/iconify';
import { useSnackbar } from '../template/snackbar';
import { TrustlineModal } from './trustline-modal';
import { SavingsSetupDialog } from './savings-setup-dialog';

// ----------------------------------------------------------------------

interface SavingsCardProps extends BoxProps {
  /** The page titles the card and shows the rate itself: no header of its own. */
  hideHeader?: boolean;
}

// ----------------------------------------------------------------------

const SavingsCard: React.FC<SavingsCardProps> = ({ sx: sxProp, hideHeader = false, ...other }) => {
  const { t } = useTranslate();
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const { wallet } = usePersistStore();
  const stellarTokens = useStellarTokens();
  const config = useStellarConfig();
  const savingsUsdcIssuer = getSavingsUsdcIssuer(config);

  // #32: hybrid users PICK which wallet this card operates on (Niko's
  // direction — "you can do savings from any wallet"). Default: the Normal
  // wallet, where a hybrid user's savings usually live and where every
  // action is passkey-only. EVERYTHING below — position, balances, setup
  // state, fee semaphore, deposit/withdraw signing — follows the TARGET.
  const { companionStellar, refreshFresh } = useWalletBalances(true);
  const isExternalConnected = wallet.walletType != null && wallet.walletType !== 'normal-wallet';
  const savingsHybrid = isExternalConnected && !!companionStellar;
  const [savingsWalletTab, setSavingsWalletTab] = useState<'normal' | 'connected'>('normal');
  const activeSavingsTab = savingsHybrid ? savingsWalletTab : 'connected';
  const savingsTargetAddress =
    savingsHybrid && activeSavingsTab === 'normal' ? companionStellar!.address : undefined;

  const {
    isLoading: isCheckingAccount,
    accountExists,
    xlmBalance,
    hasUsdcTrustline,
    refetch: refetchAccountStatus,
  } = useAccountStatus(savingsTargetAddress ?? wallet.address, { assetIssuer: savingsUsdcIssuer });
  const { addTrustLine, txBroadcasting: isAddingTrustline } = useTrustLine();
  const { startFlow } = useAssetActionsContext();

  const {
    vaultInfo,
    userPosition,
    loading,
    fetching,
    positionFetching,
    positionError,
    error,
    needsTrustline,
    setNeedsTrustline,
    deposit,
    withdraw,
  } = useDefindexSavings(savingsTargetAddress);

  const [mode, setMode] = useState<'deposit' | 'withdraw'>('deposit');
  const [amount, setAmount] = useState('');
  const [spentOnDeposits, setSpentOnDeposits] = useState(0);
  const [setupOpen, setSetupOpen] = useState(false);
  const setupAutoOpened = useRef(false);

  // #32: the deposit balance is the TARGET wallet's USDC — the companion's
  // (from the portfolio aggregate) when the Normal-wallet tab is active,
  // the connected wallet's token store otherwise.
  const rawDepositBalance = savingsTargetAddress
    ? Number(companionStellar?.assets.find((a) => a.symbol === 'USDC')?.balance ?? 0).toFixed(7)
    : getTokenBalance(getSavingsDepositToken(stellarTokens, config));
  const rawDepositBalanceNum = parseFloat(rawDepositBalance);

  // `spentOnDeposits` optimistically subtracts what the user just deposited, so
  // the figure drops immediately instead of waiting for the chain. It only ever
  // increased, and was never cleared — so once the real balance refreshed (and
  // already reflected the deposit) the same amount was subtracted a SECOND
  // time. The displayed wallet balance stayed wrong until a page reload threw
  // the component state away. Clearing it the moment a fresh balance arrives
  // keeps the optimistic update without letting it double-count.
  const lastRawBalanceRef = useRef(rawDepositBalance);
  useEffect(() => {
    if (rawDepositBalance !== lastRawBalanceRef.current) {
      lastRawBalanceRef.current = rawDepositBalance;
      setSpentOnDeposits(0);
    }
  }, [rawDepositBalance]);
  const adjustedDepositBalance = Math.max(rawDepositBalanceNum - spentOnDeposits, 0).toFixed(7);
  const savingsDepositBalance = adjustedDepositBalance;
  const savingsDepositLabel = getSavingsDepositTokenLabel(config);

  const truncateToSevenDecimals = (value: number): string =>
    (Math.floor(value * 1e7) / 1e7).toFixed(7);

  const handleMax = useCallback(() => {
    if (mode === 'deposit') {
      setAmount(truncateToSevenDecimals(parseFloat(savingsDepositBalance)));
    } else if (userPosition) {
      setAmount(truncateToSevenDecimals(parseFloat(userPosition.currentValue)));
    }
  }, [mode, savingsDepositBalance, userPosition]);

  const availableBalance =
    mode === 'deposit' ? savingsDepositBalance : userPosition?.currentValue || '0';
  const availableAssetLabel = mode === 'deposit' ? savingsDepositLabel : 'USDC';
  const estimatedYearlyEarningsText = `${t('Estimated yearly earnings')}: $${(
    (parseFloat(amount || '0') * (vaultInfo?.apy || 0)) /
    100
  ).toFixed(2)} ${availableAssetLabel}`;

  const parsedAvailable = parseFloat(availableBalance);
  const isInsufficientBalance =
    mode === 'withdraw'
      ? !!userPosition && parseFloat(amount) > parsedAvailable
      : parsedAvailable > 0 && parseFloat(amount) > parsedAvailable;

  const parsedAmount = parseFloat(amount || '0');
  const depositFee =
    mode === 'deposit' && parsedAmount > 0 ? getSavingsDepositFee(parsedAmount) : 0;
  const netDepositAmount = mode === 'deposit' ? Math.max(parsedAmount - depositFee, 0) : 0;

  const yieldCommission =
    mode === 'withdraw' && parsedAmount > 0
      ? getYieldCommission({
          withdrawAmount: parsedAmount,
          currentValue: parseFloat(userPosition?.currentValue || '0'),
          earnings: parseFloat(userPosition?.earnings || '0'),
        })
      : 0;
  const yieldCommissionRatePct =
    mode === 'withdraw' && parsedAmount > 0
      ? Math.round(getYieldCommissionRate(parsedAmount) * 100)
      : 0;
  const isAmountMissing = !amount || parsedAmount <= 0;
  const trustlineRequired = !!savingsUsdcIssuer;

  // Whether we've completed at least one account-status check for this wallet, so
  // the setup UI is driven by the REAL account state — not by the transient
  // isCheckingAccount that toggles on every poll. (Basing it on isCheckingAccount
  // made the pop-up close mid-poll: each 2.5s re-check briefly looked like "no
  // longer needs setup", which closed it.)
  const [hasCheckedOnce, setHasCheckedOnce] = useState(false);
  useEffect(() => {
    setHasCheckedOnce(false);
  }, [wallet.address]);
  useEffect(() => {
    if (!isCheckingAccount) setHasCheckedOnce(true);
  }, [isCheckingAccount]);

  // Savings-specific setup: activate the Stellar account (XLM), then add the USDC
  // trustline. `setupComplete` deliberately ignores isCheckingAccount, so a
  // re-check in flight never looks "done" and closes the pop-up.
  const needsSetup =
    hasCheckedOnce &&
    !!wallet.address &&
    (accountExists === false || (accountExists === true && trustlineRequired && !hasUsdcTrustline));
  const setupComplete =
    hasCheckedOnce &&
    !!wallet.address &&
    accountExists === true &&
    (!trustlineRequired || hasUsdcTrustline);

  // Auto-open the guided setup once when it's first needed (the user can reopen
  // it later via the "Set up savings" button).
  //
  // #32: NOT for hybrid users. Connecting a fresh external wallet while the
  // account already owns a working Normal wallet made this pop "Set up Normal
  // Savings" for the empty external account (observed live 2026-08-15) — the
  // user's savings-capable wallet exists; nagging them to activate a second
  // one is noise. Manual setup via the button still works for every wallet.
  useEffect(() => {
    if (!needsSetup || setupAutoOpened.current) return undefined;
    let stale = false;
    (async () => {
      const isExternal = wallet.walletType != null && wallet.walletType !== 'normal-wallet';
      if (isExternal) {
        try {
          const { getTurnkeyWalletInfo } = await import('@/lib/turnkey/wallet-info');
          const tk = await getTurnkeyWalletInfo();
          if (tk?.stellarAddress) return; // companion exists — no nag
        } catch {
          /* lookup failed — fall through to today's behavior */
        }
      }
      if (!stale && !setupAutoOpened.current) {
        setupAutoOpened.current = true;
        setSetupOpen(true);
      }
    })();
    return () => {
      stale = true;
    };
  }, [needsSetup, wallet.walletType]);

  // Close it only when setup is genuinely complete — never while a re-check is in
  // flight — and return the card to the normal deposit UI.
  useEffect(() => {
    if (setupComplete) setSetupOpen(false);
  }, [setupComplete]);

  // While the setup pop-up is open and the account isn't active yet, poll for
  // incoming XLM so activation auto-advances to the trustline step the moment
  // funds land — no manual refresh needed (mirrors the old fund-xlm step). The
  // interval reads refetch through a ref, so an unstable refetch identity can't
  // keep resetting the timer (which previously meant it never fired).
  const refetchRef = useRef(refetchAccountStatus);
  refetchRef.current = refetchAccountStatus;
  useEffect(() => {
    if (!setupOpen || accountExists === true) return undefined;
    const id = setInterval(() => refetchRef.current(), 2500);
    return () => clearInterval(id);
  }, [setupOpen, accountExists]);

  // Re-check the account (XLM balance included) after any buy/receive/setup flow
  // so the low-XLM warning clears once the user tops up. A send scoped to a
  // non-Stellar chain (see lib/tx-events.ts) cannot change this account — skip
  // those; a Stellar send CAN (it moves XLM), so it still re-checks.
  useEffect(() => {
    const handler = (e: Event) => {
      const only = chainOfActivityEvent(e);
      if (only && only !== 'stellar') return;
      refetchRef.current();
    };
    window.addEventListener('nf:activity-updated', handler);
    return () => window.removeEventListener('nf:activity-updated', handler);
  }, []);

  const handleAddTrustline = useCallback(async () => {
    if (!savingsUsdcIssuer) {
      enqueueSnackbar(t('USDC issuer not configured'), { variant: 'error' });
      return;
    }
    try {
      await addTrustLine('USDC', savingsUsdcIssuer);
      enqueueSnackbar(t('USDC trustline added successfully!'), { variant: 'success' });
      setAmount('');
      setNeedsTrustline(false);
      await refetchAccountStatus();
    } catch (err: any) {
      enqueueSnackbar(err.message || t('Failed to add USDC trustline'), { variant: 'error' });
    }
  }, [
    addTrustLine,
    savingsUsdcIssuer,
    enqueueSnackbar,
    t,
    setNeedsTrustline,
    refetchAccountStatus,
  ]);

  const handleTrustlineSuccess = useCallback(async () => {
    setAmount('');
    setNeedsTrustline(false);
    await refetchAccountStatus();
  }, [setNeedsTrustline, refetchAccountStatus]);

  // Savings deposits & withdrawals are Soroban transactions whose fees are paid
  // in XLM (above the account reserve). If that spendable XLM runs too low, the
  // transaction would fail on-chain — so we warn and block until they top up.
  // Most important for withdrawals: money is locked in savings and can't come
  // out without a little XLM for the fee.
  // #67 semaphore: ONE classifier drives the always-visible light AND the
  // action block, so they can never disagree — 'blocked' is exactly the old
  // lowXlmForSavings line (fee-available < MIN_XLM_FOR_SAVINGS_TX).
  const feeStatus = accountExists ? xlmFeeStatus(xlmBalance) : null;
  const feeXlmAvailable = xlmAvailableForFees(xlmBalance);
  const lowXlmForSavings = feeStatus === 'blocked';

  // While XLM is low or blocked, keep re-checking so the light clears itself
  // the moment the user tops up — same auto-detect as the setup flow.
  useEffect(() => {
    if (feeStatus === null || feeStatus === 'ok') return undefined;
    const id = setInterval(() => refetchRef.current(), 4000);
    return () => clearInterval(id);
  }, [feeStatus]);

  // ---- the review page and the journey (components/_common/flow) ----------
  // The button opens a review of every step; only the confirm button there
  // starts the deposit or withdrawal. The card stays mounted underneath and
  // runs it, reporting each step to the page.
  const [view, setView] = useState<'form' | 'flow'>('form');
  const {
    run: flowState,
    plan: frozenPlan,
    begin: beginRun,
    start: startStep,
    done: doneStep,
    fail: failRun,
    finish: finishRun,
    reset: resetRun,
  } = useFlowRun();
  const [frozen, setFrozen] = useState<{
    mode: 'deposit' | 'withdraw';
    summary: FlowSummary;
    lede: string;
  } | null>(null);

  const actingAddress = savingsTargetAddress ?? wallet.address;
  const walletLabel = savingsTargetAddress
    ? t('Your Normal wallet')
    : isExternalConnected
      ? t('Your {{wallet}} wallet', { wallet: connectedWalletLabel(wallet.walletType) })
      : undefined;
  const walletRef = {
    address: actingAddress,
    href: stellarAccountHref(actingAddress),
    label: walletLabel,
  };
  const rate = vaultInfo ? `${Number(vaultInfo.apy).toFixed(2)}% ${t('a year')}` : null;
  const commissionOwed = mode === 'withdraw' && yieldCommission > 0;
  const withdrawNet = Math.max(parsedAmount - (commissionOwed ? yieldCommission : 0), 0);

  const livePlan: FlowPlan | null =
    parsedAmount <= 0
      ? null
      : mode === 'deposit'
        ? depositPlan({
            t,
            amount: formatCoin(parsedAmount, 'USDC'),
            fee: formatCoin(depositFee, 'USDC'),
            net: formatCoin(netDepositAmount, 'USDC'),
            wallet: walletRef,
            rate,
          })
        : withdrawPlan({
            t,
            amount: formatCoin(parsedAmount, 'USDC'),
            commission: commissionOwed ? formatCoin(yieldCommission, 'USDC') : null,
            net: formatCoin(withdrawNet, 'USDC'),
            wallet: walletRef,
          });

  const fromRow = {
    key: 'from',
    label: mode === 'deposit' ? t('From') : t('To'),
    value: walletLabel ?? t('Your Stellar wallet'),
    detail: shortAddress(actingAddress),
  };
  const networkRow = {
    key: 'network',
    label: t('Network fee'),
    value: t('Usually 0.05 to 0.5 XLM'),
    detail: t('Paid in XLM by your wallet'),
  };
  const liveSummary: FlowSummary | null =
    parsedAmount <= 0
      ? null
      : mode === 'deposit'
        ? {
            rows: [
              {
                key: 'amount',
                label: t('You deposit'),
                value: formatCoin(parsedAmount, 'USDC'),
                detail: formatUsd(parsedAmount),
              },
              {
                key: 'fee',
                label: t('Normal fee (0.5%)'),
                value: formatCoin(depositFee, 'USDC'),
              },
              {
                key: 'net',
                label: t('Goes into savings'),
                value: formatCoin(netDepositAmount, 'USDC'),
              },
              ...(rate
                ? [
                    {
                      key: 'rate',
                      label: t('Earns'),
                      value: rate,
                      detail: t('About {{usd}} a year at today’s rate', {
                        usd: formatUsd((netDepositAmount * Number(vaultInfo?.apy ?? 0)) / 100),
                      }),
                    },
                  ]
                : []),
              fromRow,
              { key: 'into', label: t('Into'), value: t('Normal Savings') },
              { key: 'signatures', label: t('Signatures'), value: t('Two') },
              networkRow,
              { key: 'time', label: t('Time'), value: t('About 20 seconds') },
            ],
            note: t('The rate moves with the market, and you can withdraw at any time.'),
          }
        : {
            rows: [
              {
                key: 'amount',
                label: t('You withdraw'),
                value: formatCoin(parsedAmount, 'USDC'),
                detail: formatUsd(parsedAmount),
              },
              {
                key: 'fee',
                label: t('Commission on earnings'),
                value: commissionOwed ? formatCoin(yieldCommission, 'USDC') : t('None'),
                detail: commissionOwed
                  ? t('{{rate}}% of the earnings in this withdrawal', {
                      rate: yieldCommissionRatePct,
                    })
                  : t('No earnings in this withdrawal'),
              },
              {
                key: 'net',
                label: t('You receive'),
                value: formatCoin(withdrawNet, 'USDC'),
              },
              { key: 'source', label: t('From'), value: t('Normal Savings') },
              fromRow,
              {
                key: 'signatures',
                label: t('Signatures'),
                value: commissionOwed ? t('Two') : t('One'),
              },
              networkRow,
              { key: 'time', label: t('Time'), value: t('About 15 seconds') },
            ],
          };

  const liveLede =
    mode === 'deposit'
      ? rate
        ? t('{{amount}} into Normal Savings, earning {{rate}}.', {
            amount: formatCoin(parsedAmount, 'USDC'),
            rate,
          })
        : t('{{amount}} into Normal Savings.', { amount: formatCoin(parsedAmount, 'USDC') })
      : t('{{amount}} from Normal Savings to your wallet.', {
          amount: formatCoin(parsedAmount, 'USDC'),
        });

  const flowMode = frozen?.mode ?? mode;
  const shownPlan = flowState.phase === 'review' ? livePlan : (frozenPlan ?? livePlan);
  const shownSummary =
    flowState.phase === 'review' ? liveSummary : (frozen?.summary ?? liveSummary);

  const openFlow = useCallback(() => {
    setView('flow');
    try {
      window.history.pushState({ nfFlow: true }, '');
    } catch {
      /* the page's own Back still works */
    }
  }, []);
  const flowPhaseRef = useRef(flowState.phase);
  flowPhaseRef.current = flowState.phase;
  const leaveFlow = useCallback(() => {
    resetRun();
    setFrozen(null);
    setView('form');
  }, [resetRun]);
  const exitFlow = useCallback(() => {
    leaveFlow();
    if ((window.history.state as { nfFlow?: boolean } | null)?.nfFlow) window.history.back();
  }, [leaveFlow]);
  useEffect(() => {
    if (view !== 'flow') return undefined;
    const onPop = () => {
      if (flowPhaseRef.current === 'running') {
        window.history.pushState({ nfFlow: true }, '');
        return;
      }
      leaveFlow();
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [view, leaveFlow]);

  const handleConfirm = async () => {
    if (!livePlan || !liveSummary || parsedAmount <= 0) return;
    const acting = mode;
    const amountNow = amount;
    const parsedAmt = parsedAmount;
    setFrozen({ mode: acting, summary: liveSummary, lede: liveLede });
    beginRun(livePlan);

    const seen: {
      submitted: Extract<SavingsProgress, { type: 'submitted' }> | null;
      cancelled: boolean;
      failed: boolean;
    } = { submitted: null, cancelled: false, failed: false };
    const onProgress = (event: SavingsProgress) => {
      if (event.type === 'step') startStep(event.id, event.waiting ? { waiting: true } : undefined);
      else if (event.type === 'submitted') seen.submitted = event;
      else if (event.type === 'cancelled') seen.cancelled = true;
      else if (event.type === 'error') {
        seen.failed = true;
        failRun(event.message);
      }
    };

    const hash = await (acting === 'deposit'
      ? deposit(amountNow, onProgress)
      : withdraw(amountNow, onProgress));
    if (!hash) {
      if (seen.cancelled && !seen.failed) {
        // No 2FA code: nothing happened, so back to the review as it was.
        resetRun();
        setFrozen(null);
      } else if (!seen.failed) {
        // It stopped before its first step (no wallet, no vault): say so
        // rather than leave the page waiting on a step that never comes.
        failRun(t('This could not start. Check that your wallet is connected, then try again.'));
      }
      return;
    }
    const pair = seen.submitted;
    doneStep('submit', { links: [stellarTxLink(t, hash)] });
    if (acting === 'deposit') setSpentOnDeposits((prev) => prev + parsedAmt);
    setAmount('');

    // Which ledger it landed in, straight from Horizon (bounded).
    startStep('confirmed');
    const record = await awaitTxRecord(config.HORIZON_URL, hash).catch(() => null);
    doneStep('confirmed', { note: ledgerNote(t, record) });

    const owesFee = acting === 'deposit' || !!pair?.feeHash;
    if (owesFee) {
      if (pair?.feeSubmitted && pair.feeHash) {
        doneStep('fee', { links: [stellarTxLink(t, pair.feeHash, t('View the fee'))] });
      } else {
        doneStep('fee', {
          note: t('Normal collects it within a few minutes, as a separate small payment.'),
        });
      }
    }

    // Savings already shows the new figure (the hook wrote it the moment the
    // network confirmed); the wallet balance is refreshed here, capped so a
    // slow read never holds up a deposit that already went through.
    startStep('balance');
    await Promise.race([
      refreshFresh().catch(() => {}),
      new Promise((r) => {
        setTimeout(r, 15_000);
      }),
    ]);
    finishRun();
  };

  const isWithdrawPositionLoading = mode === 'withdraw' && positionFetching && !userPosition;
  const isActionDisabled =
    loading ||
    isWithdrawPositionLoading ||
    lowXlmForSavings ||
    isInsufficientBalance ||
    isAmountMissing;
  const actionButtonText = loading
    ? mode === 'deposit'
      ? t('Depositing...')
      : t('Withdrawing...')
    : isWithdrawPositionLoading
      ? t('Loading balance...')
      : lowXlmForSavings
        ? t('Add XLM to continue')
        : isInsufficientBalance
          ? t('Insufficient balance')
          : isAmountMissing
            ? t('Enter amount')
            : mode === 'deposit'
              ? t('Review deposit')
              : t('Review withdrawal');

  return (
    <Box
      sx={[
        (theme) => ({
          p: { xs: '20px', md: '24px' },
          borderRadius: 'var(--radius-lg)',
          textAlign: 'left',
          background: '#FFFFFF',
          border: '1px solid rgba(10,10,15,0.08)',
          ...theme.applyStyles('dark', {
            background: 'rgba(20,26,33,0.92)',
            border: '1px solid rgba(255,255,255,0.08)',
          }),
        }),
        ...(Array.isArray(sxProp) ? sxProp : [sxProp]),
      ]}
      {...other}
    >
      {/* Header */}
      {!hideHeader && (
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ mb: '18px' }}
        >
          <Typography
            sx={(theme) => ({
              fontSize: '15px',
              fontWeight: 500,
              color: '#0A0A0F',
              ...theme.applyStyles('dark', { color: '#FFFFFF' }),
            })}
          >
            {t('Normal Savings')}
          </Typography>

          {/* APY chip */}
          {vaultInfo ? (
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                background: '#F7F7F9',
                border: '1px solid rgba(10,10,15,0.08)',
                borderRadius: 'var(--radius-sm)',
                px: '10px',
                py: '5px',
              }}
            >
              <Box
                sx={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  bgcolor: '#1AB37D',
                  flexShrink: 0,
                }}
              />
              <Typography
                sx={{
                  fontSize: '12px',
                  fontWeight: 500,
                  lineHeight: 1,
                  fontVariantNumeric: 'tabular-nums',
                  color: '#0A0A0F',
                }}
              >
                {Number(vaultInfo.apy).toFixed(2)}%
              </Typography>
              <Typography
                sx={{
                  fontSize: '11px',
                  fontWeight: 500,
                  color: '#9A9AA3',
                  lineHeight: 1,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {t('a year')}
              </Typography>
            </Box>
          ) : (
            <Skeleton
              variant="rounded"
              width={80}
              height={26}
              sx={{ borderRadius: 'var(--radius-lg)' }}
            />
          )}
        </Stack>
      )}

      {/* #32: hybrid accounts pick the wallet this card operates on — the
          position, balances, fee light and the deposit/withdraw signing all
          follow the selected wallet (Normal = passkey; the external wallet
          signs in its own app). Single-wallet users never see this row. */}
      {savingsHybrid && (
        <Box sx={{ display: 'flex', gap: '6px', mb: '14px', flexWrap: 'wrap' }}>
          {(
            [
              { key: 'normal', label: t('Normal wallet') },
              { key: 'connected', label: connectedWalletLabel(wallet.walletType) },
            ] as const
          ).map((opt) => {
            const selected = activeSavingsTab === opt.key;
            return (
              <Box
                key={opt.key}
                component="button"
                onClick={() => setSavingsWalletTab(opt.key)}
                sx={{
                  appearance: 'none',
                  border: selected
                    ? '1px solid rgba(10,10,15,0.9)'
                    : '1px solid rgba(10,10,15,0.14)',
                  borderRadius: 'var(--radius-sm)',
                  px: '12px',
                  py: '6px',
                  fontSize: '12px',
                  fontWeight: 500,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  bgcolor: selected ? '#0A0A0F' : 'transparent',
                  color: selected ? '#fff' : '#6B6B76',
                  transition: 'all .15s ease',
                  '&:hover': selected ? {} : { borderColor: 'rgba(10,10,15,0.3)' },
                }}
              >
                {opt.label}
              </Box>
            );
          })}
        </Box>
      )}

      {/* Stats */}
      <Box
        sx={(theme) => ({
          borderRadius: 'var(--radius-md)',
          p: '14px 16px',
          mb: '14px',
          background: '#F7F7F9',
          ...theme.applyStyles('dark', { background: 'rgba(255,255,255,0.05)' }),
        })}
      >
        {fetching ? (
          <Box sx={{ display: 'grid', gap: '8px' }}>
            {[t('You put in'), t('Worth now'), t('Earned')].map((label) => (
              <Box
                key={label}
                sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <Typography
                  sx={{
                    fontSize: '13.5px',
                    fontWeight: 400,
                    fontVariantNumeric: 'tabular-nums',
                    color: '#6B6B76',
                  }}
                >
                  {label}
                </Typography>
                <Skeleton variant="text" width={80} height={18} />
              </Box>
            ))}
          </Box>
        ) : (
          <Box sx={{ display: 'grid', gap: '8px' }}>
            {[
              { label: t('You put in'), value: userPosition?.totalDeposited, prefix: '' },
              { label: t('Worth now'), value: userPosition?.currentValue, prefix: '' },
              { label: t('Earned'), value: userPosition?.earnings, prefix: '+' },
            ].map(({ label, value, prefix }) => (
              <Box
                key={label}
                sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <Typography
                  sx={{
                    fontSize: '13.5px',
                    fontWeight: 400,
                    fontVariantNumeric: 'tabular-nums',
                    color: '#6B6B76',
                  }}
                >
                  {label}
                </Typography>
                {positionError && !userPosition ? (
                  <Typography sx={{ fontSize: '12px', color: '#B45309' }}>
                    {t('Unavailable. Retrying…')}
                  </Typography>
                ) : !userPosition ? (
                  <Skeleton variant="text" width={80} height={18} />
                ) : (
                  <Typography
                    sx={{
                      fontSize: '13.5px',
                      fontWeight: 400,
                      fontVariantNumeric: 'tabular-nums',
                      letterSpacing: '-0.02em',
                      color: prefix === '+' ? '#1AB37D' : 'text.primary',
                    }}
                  >
                    {`${prefix}${formatUsd(parseFloat(value || '0'))}`}
                  </Typography>
                )}
              </Box>
            ))}
          </Box>
        )}
      </Box>

      {/* Mode Toggle */}
      <Box
        sx={(theme) => ({
          borderRadius: 'var(--radius-md)',
          p: '4px',
          position: 'relative',
          display: 'flex',
          mb: '14px',
          background: '#F4F4F7',
          ...theme.applyStyles('dark', { background: 'rgba(255,255,255,0.08)' }),
        })}
      >
        {/* Sliding pill */}
        <Box
          sx={(theme) => ({
            position: 'absolute',
            width: 'calc(50% - 4px)',
            height: 'calc(100% - 8px)',
            background: '#0A0A0F',
            borderRadius: 'var(--radius-sm)',
            top: '4px',
            left: '4px',
            transform: mode === 'withdraw' ? 'translateX(calc(100% + 4px))' : 'translateX(0)',
            pointerEvents: 'none',
            ...theme.applyStyles('dark', { background: '#FFFFFF' }),
          })}
        />
        {(['deposit', 'withdraw'] as const).map((m) => (
          <Button
            key={m}
            onClick={() => setMode(m)}
            disableRipple
            sx={(theme) => ({
              flex: 1,
              color: mode === m ? '#FFFFFF' : '#6B6B76',
              zIndex: 1,
              fontSize: '14px',
              fontWeight: 500,
              padding: '10px 0',
              minHeight: 'unset',
              borderRadius: 'var(--radius-md)',
              textTransform: 'none',
              transition: 'color 0.28s ease',
              '&:hover': { background: 'transparent' },
              ...theme.applyStyles('dark', {
                color: mode === m ? '#0A0A0F' : 'rgba(255,255,255,0.45)',
              }),
            })}
          >
            {m === 'deposit' ? t('Deposit') : t('Withdraw')}
          </Button>
        ))}
      </Box>

      {/* Amount Input */}
      <Box
        sx={(theme) => ({
          borderRadius: 'var(--radius-md)',
          p: '14px 16px',
          mb: '14px',
          background: '#FAFAFC',
          border: isInsufficientBalance
            ? '1px solid rgba(255,0,0,0.35)'
            : '1px solid rgba(10,10,15,0.08)',
          transition: 'border-color 0.2s ease',
          ...theme.applyStyles('dark', {
            background: 'rgba(255,255,255,0.05)',
            border: isInsufficientBalance
              ? '1px solid rgba(255,0,0,0.35)'
              : '1px solid rgba(255,255,255,0.08)',
          }),
        })}
      >
        {/* Top row: label + wallet balance + MAX */}
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ mb: '10px' }}
        >
          <Typography sx={{ fontSize: '12px', color: '#6B6B76' }}>
            {mode === 'deposit' ? t('Amount to deposit') : t('Amount to withdraw')}
          </Typography>
          <Stack direction="row" alignItems="center" spacing={0.75}>
            <Typography sx={{ fontSize: '12px', color: '#9A9AA3' }}>
              {`${mode === 'deposit' ? t('In your wallet') : t('In savings')}: ${formatUsd(parseFloat(availableBalance))}`}
            </Typography>
            <Box
              component="button"
              onClick={handleMax}
              sx={(theme) => ({
                fontSize: '10px',
                fontWeight: 500,
                letterSpacing: '0.04em',
                color: '#0A0A0F',
                background: 'transparent',
                border: '1px solid rgba(10,10,15,0.08)',
                borderRadius: 'var(--radius-sm)',
                px: '7px',
                py: '2px',
                cursor: 'pointer',
                lineHeight: 1.6,
                fontFamily: 'inherit',
                transition: 'background 0.15s ease, color 0.15s ease, border-color 0.15s ease',
                '&:hover': {
                  background: '#0A0A0F',
                  color: '#fff',
                  borderColor: '#0A0A0F',
                },
                ...theme.applyStyles('dark', {
                  color: '#FFFFFF',
                  borderColor: 'rgba(255,255,255,0.15)',
                  '&:hover': {
                    background: '#FFFFFF',
                    color: '#0A0A0F',
                    borderColor: '#FFFFFF',
                  },
                }),
              })}
            >
              MAX
            </Box>
          </Stack>
        </Stack>

        {/* Bottom row: token pill + amount input */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
          <Box
            sx={(theme) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#FFFFFF',
              border: '1px solid rgba(10,10,15,0.08)',
              borderRadius: 'var(--radius-md)',
              p: '7px 10px 7px 7px',
              flexShrink: 0,
              ...theme.applyStyles('dark', {
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.08)',
              }),
            })}
          >
            <Iconify icon="cryptocurrency-color:usdc" width={22} sx={{ flexShrink: 0 }} />
            <Typography sx={{ fontSize: '12px', fontWeight: 500, color: 'text.primary' }}>
              {availableAssetLabel}
            </Typography>
          </Box>
          <Box
            component="input"
            type="number"
            value={amount}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAmount(e.target.value)}
            placeholder="0.00"
            sx={(theme) => ({
              flex: 1,
              minWidth: 0,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: '26px',
              fontWeight: 500,
              color: '#0A0A0F',
              fontVariantNumeric: 'tabular-nums',
              textAlign: 'right',
              p: 0,
              appearance: 'textfield',
              '&::placeholder': { color: 'rgba(10,10,15,0.2)' },
              '&::-webkit-outer-spin-button, &::-webkit-inner-spin-button': {
                WebkitAppearance: 'none',
                margin: 0,
              },
              ...theme.applyStyles('dark', {
                color: '#FFFFFF',
                '&::placeholder': { color: 'rgba(255,255,255,0.2)' },
              }),
            })}
          />
        </Box>

        {isInsufficientBalance && (
          <Typography sx={{ fontSize: '11px', color: 'error.main', mt: '4px' }}>
            {t('Insufficient balance')}
          </Typography>
        )}
      </Box>

      {/* Fee Breakdown */}
      {mode === 'deposit' && parsedAmount > 0 && (
        <Box
          sx={(theme) => ({
            borderRadius: 'var(--radius-md)',
            px: '14px',
            py: '10px',
            mb: '14px',
            background: '#F7F7F9',
            ...theme.applyStyles('dark', { background: 'rgba(255,255,255,0.04)' }),
          })}
        >
          <Stack spacing={0.75}>
            <Stack direction="row" justifyContent="space-between">
              <Typography sx={{ fontSize: '12px', color: 'text.secondary' }}>
                {t('Normal fee (0.5%)')}
              </Typography>
              <Typography
                sx={{
                  fontSize: '12px',
                  fontWeight: 500,
                  color: 'text.primary',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                -{depositFee.toFixed(2)} USDC
              </Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between">
              <Typography sx={{ fontSize: '12px', color: 'text.secondary' }}>
                {t('Net deposit')}
              </Typography>
              <Typography
                sx={{
                  fontSize: '12px',
                  fontWeight: 500,
                  color: 'text.primary',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {netDepositAmount.toFixed(2)} USDC
              </Typography>
            </Stack>
            {vaultInfo && (
              <Typography sx={{ fontSize: '11px', color: 'text.disabled' }}>
                {estimatedYearlyEarningsText}
              </Typography>
            )}
          </Stack>
        </Box>
      )}

      {/* Commission Breakdown */}
      {mode === 'withdraw' && parsedAmount > 0 && yieldCommission > 0 && (
        <Box
          sx={(theme) => ({
            borderRadius: 'var(--radius-md)',
            px: '14px',
            py: '10px',
            mb: '14px',
            background: '#F7F7F9',
            ...theme.applyStyles('dark', { background: 'rgba(255,255,255,0.04)' }),
          })}
        >
          <Stack direction="row" justifyContent="space-between">
            <Typography sx={{ fontSize: '12px', color: 'text.secondary' }}>
              {t('Normal {{rate}}% yield commission', { rate: yieldCommissionRatePct })}
            </Typography>
            <Typography
              sx={{
                fontSize: '12px',
                fontWeight: 500,
                color: 'text.primary',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              -{yieldCommission.toFixed(2)} USDC
            </Typography>
          </Stack>
        </Box>
      )}

      {/* Error */}
      {error && (
        <Typography sx={{ fontSize: '12px', color: 'error.main', mb: '12px' }}>{error}</Typography>
      )}

      {/* #67 XLM fee semaphore — ALWAYS visible once the account exists.
          Savings fees are paid in XLM: green = the outflow guard's buffer is
          intact, yellow = roughly one action left, red = actions are paused
          (the disable logic keys on the same classifier, so the light and the
          buttons can never disagree). */}
      {!needsSetup && feeStatus === 'ok' && (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: '12px', px: '2px' }}>
          <Box
            sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#1AB37D', flexShrink: 0 }}
          />
          <Typography sx={{ fontSize: '12px', color: '#6B6B76', lineHeight: 1.4 }}>
            {t('XLM fee reserve healthy: deposits and withdrawals are covered.')}
          </Typography>
        </Stack>
      )}
      {!needsSetup && (feeStatus === 'low' || feeStatus === 'blocked') && (
        <Box
          sx={(theme) => ({
            display: 'flex',
            gap: '10px',
            p: '12px 14px',
            mb: '12px',
            borderRadius: 'var(--radius-md)',
            ...(feeStatus === 'blocked'
              ? {
                  bgcolor: 'rgba(220,38,38,0.06)',
                  border: '1px solid rgba(220,38,38,0.24)',
                  ...theme.applyStyles('dark', { bgcolor: 'rgba(220,38,38,0.1)' }),
                }
              : {
                  bgcolor: 'rgba(245,158,11,0.08)',
                  border: '1px solid rgba(245,158,11,0.28)',
                  ...theme.applyStyles('dark', { bgcolor: 'rgba(245,158,11,0.12)' }),
                }),
          })}
        >
          <Iconify
            icon="eva:alert-triangle-fill"
            width={18}
            sx={{
              color: feeStatus === 'blocked' ? '#B91C1C' : '#B26A00',
              mt: '1px',
              flexShrink: 0,
            }}
          />
          <Box sx={{ flex: 1 }}>
            <Typography
              sx={{
                fontSize: '13px',
                fontWeight: 500,
                color: feeStatus === 'blocked' ? '#7F1D1D' : '#7A4A00',
                lineHeight: 1.4,
              }}
            >
              {feeStatus === 'blocked'
                ? mode === 'withdraw'
                  ? t('You need a little XLM to withdraw')
                  : t('You need a little XLM to deposit')
                : t('XLM running low')}
            </Typography>
            <Typography
              sx={{
                fontSize: '12px',
                color: feeStatus === 'blocked' ? '#8A3A3A' : '#8A6A2E',
                lineHeight: 1.5,
                mt: '2px',
              }}
            >
              {feeStatus === 'blocked'
                ? t(
                    'Savings network fees are paid in XLM. Deposits and withdrawals are paused until you add a little XLM.'
                  )
                : t(
                    'About {{n}} XLM left for fees: roughly one more deposit or withdrawal. Top up a little to stay safe.',
                    { n: feeXlmAvailable.toFixed(2) }
                  )}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mt: '10px', flexWrap: 'wrap', rowGap: 1 }}>
              <Button
                onClick={() => router.push(`${paths.swap}?from=USDC`)}
                sx={{
                  bgcolor: '#0A0A0F',
                  color: '#fff',
                  fontSize: '12px',
                  fontWeight: 500,
                  textTransform: 'none',
                  borderRadius: 'var(--radius-md)',
                  px: '12px',
                  py: '6px',
                  '&:hover': { bgcolor: '#2A2A33' },
                }}
              >
                {t('Swap USDC → XLM')}
              </Button>
              <Button
                onClick={() => startFlow('buy', 'XLM')}
                sx={{
                  bgcolor: 'transparent',
                  color: feeStatus === 'blocked' ? '#7F1D1D' : '#7A4A00',
                  fontSize: '12px',
                  fontWeight: 500,
                  textTransform: 'none',
                  borderRadius: 'var(--radius-md)',
                  px: '12px',
                  py: '6px',
                  border:
                    feeStatus === 'blocked'
                      ? '1px solid rgba(220,38,38,0.35)'
                      : '1px solid rgba(245,158,11,0.4)',
                  '&:hover': {
                    bgcolor:
                      feeStatus === 'blocked' ? 'rgba(220,38,38,0.08)' : 'rgba(245,158,11,0.12)',
                  },
                }}
              >
                {t('Buy XLM')}
              </Button>
              <Button
                onClick={() => startFlow('receive', 'XLM')}
                sx={{
                  bgcolor: 'transparent',
                  color: feeStatus === 'blocked' ? '#7F1D1D' : '#7A4A00',
                  fontSize: '12px',
                  fontWeight: 500,
                  textTransform: 'none',
                  borderRadius: 'var(--radius-md)',
                  px: '12px',
                  py: '6px',
                  border:
                    feeStatus === 'blocked'
                      ? '1px solid rgba(220,38,38,0.35)'
                      : '1px solid rgba(245,158,11,0.4)',
                  '&:hover': {
                    bgcolor:
                      feeStatus === 'blocked' ? 'rgba(220,38,38,0.08)' : 'rgba(245,158,11,0.12)',
                  },
                }}
              >
                {t('Receive XLM')}
              </Button>
            </Stack>
          </Box>
        </Box>
      )}

      {/* Action Button */}
      <WalletGate buttonText={t('Connect wallet to save')} fullWidth variant="contained">
        {needsSetup ? (
          <Stack spacing={1.25}>
            <Typography
              sx={{
                fontSize: '12.5px',
                color: 'text.secondary',
                textAlign: 'center',
                px: 1,
                lineHeight: 1.55,
              }}
            >
              {accountExists
                ? t('One quick step left: add a USDC trustline to start earning.')
                : t('Activate your account and add USDC to start earning yield.')}
            </Typography>
            <Button
              fullWidth
              onClick={() => setSetupOpen(true)}
              sx={{
                background: '#0A0A0F',
                borderRadius: 'var(--radius-md)',
                padding: '14px 16px',
                fontSize: '14px',
                fontWeight: 500,
                color: '#FFFFFF',
                textTransform: 'none',
                '&:hover': { background: '#2A2A33' },
              }}
            >
              {accountExists ? t('Continue setup') : t('Set up savings')}
            </Button>
          </Stack>
        ) : (
          <Button
            fullWidth
            disabled={isActionDisabled}
            onClick={openFlow}
            sx={{
              background: '#0A0A0F',
              borderRadius: 'var(--radius-md)',
              padding: '14px 16px',
              fontSize: '14px',
              fontWeight: 500,
              color: '#FFFFFF',
              textTransform: 'none',
              transition: 'background 150ms ease',
              '&:hover': {
                background: '#2A2A33',
              },
              '&.Mui-disabled': { background: 'rgba(10,10,15,0.08)', color: '#9A9AA3' },
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1}>
              {loading && <CircularProgress size={16} sx={{ color: '#FFFFFF' }} />}
              <span>{actionButtonText}</span>
            </Stack>
          </Button>
        )}
      </WalletGate>

      {/* Every step is shown on the review page before anything moves. */}
      {!needsSetup && (
        <Typography sx={{ mt: '12px', fontSize: '12.5px', lineHeight: 1.5, color: '#6B6B76' }}>
          {mode === 'deposit'
            ? t('You see every step, the fee and where your money goes before you confirm.')
            : t('You see every step and what you receive before you confirm.')}
        </Typography>
      )}

      {view === 'flow' && shownPlan && shownSummary && (
        <FlowPortal>
          <FlowView
            plan={shownPlan}
            run={flowState}
            summary={shownSummary}
            titles={
              flowMode === 'deposit'
                ? {
                    review: t('Review your deposit'),
                    running: t('Depositing'),
                    done: t('Deposit complete'),
                    failed: t('Deposit stopped'),
                    stopped: t('Deposit ended'),
                    'handed-off': t('Deposit on its way'),
                  }
                : {
                    review: t('Review your withdrawal'),
                    running: t('Withdrawing'),
                    done: t('Withdrawal complete'),
                    failed: t('Withdrawal stopped'),
                    stopped: t('Withdrawal ended'),
                    'handed-off': t('Withdrawal on its way'),
                  }
            }
            lede={flowState.phase === 'review' ? liveLede : (frozen?.lede ?? liveLede)}
            confirm={{
              label: mode === 'deposit' ? t('Confirm deposit') : t('Confirm withdrawal'),
              onClick: handleConfirm,
              blocked: lowXlmForSavings
                ? t('Add a little XLM first: it pays the network fee.')
                : isInsufficientBalance
                  ? t('That is more than you have. Go back and change the amount.')
                  : null,
            }}
            back={{ label: t('Back to savings'), onClick: exitFlow }}
            doneActions={[
              { label: t('Back to savings'), primary: true, onClick: exitFlow },
              { label: t('See it in Activity'), href: paths.activity },
            ]}
            doneNote={
              flowMode === 'deposit'
                ? t('Your digital dollars are in Normal Savings, earning from today.')
                : t('Your digital dollars are in your wallet.')
            }
            failActions={[
              {
                label: t('Try again'),
                primary: true,
                onClick: () => {
                  resetRun();
                  setFrozen(null);
                },
              },
            ]}
            leave={
              ['check', 'prepare', 'sign-deposit', 'sign-withdraw', 'sign-fee'].includes(
                flowState.activeId ?? ''
              )
                ? {
                    safe: false,
                    message: t('Stay a few seconds until it is sent, so no prompt is left open.'),
                  }
                : {
                    safe: true,
                    message: t('Stellar finishes this in seconds, with or without this page.'),
                  }
            }
          />
        </FlowPortal>
      )}

      <TrustlineModal
        open={needsTrustline}
        onClose={() => setNeedsTrustline(false)}
        onSuccess={handleTrustlineSuccess}
      />

      {/* Guided savings setup — activate (XLM) → add USDC trustline. */}
      <SavingsSetupDialog
        open={setupOpen}
        onClose={() => setSetupOpen(false)}
        walletAddress={wallet.address || ''}
        accountExists={accountExists === true}
        hasUsdcTrustline={hasUsdcTrustline}
        trustlineRequired={!!savingsUsdcIssuer}
        isCheckingAccount={isCheckingAccount}
        onRefetch={refetchAccountStatus}
        onAddTrustline={handleAddTrustline}
        isAddingTrustline={isAddingTrustline}
      />
    </Box>
  );
};

export default SavingsCard;
