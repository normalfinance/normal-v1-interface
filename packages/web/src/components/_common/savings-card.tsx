'use client';

import type { BoxProps } from '@mui/material';

import { useTranslate } from '@/locales';
import { useStellarConfig } from '@/hooks';
import { useRouter } from 'next/navigation';
import { chainOfActivityEvent } from '@/lib/tx-events';
import { usePersistStore } from '@normalfinance/state';
import { useTrustLine } from '@/hooks/stellar/tokens/use-trustline';
import { useAccountStatus } from '@/hooks/stellar/use-account-status';
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useDefindexSavings } from '@/hooks/stellar/use-defindex-savings';
import { useAssetActionsContext } from '@/providers/AssetActionsProvider';
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

import { keyframes } from '@mui/system';
import { Box, Stack, Button, Skeleton, Typography, CircularProgress } from '@mui/material';

import { WalletGate } from './wallet-gate';
import { Iconify } from '../template/iconify';
import { useSnackbar } from '../template/snackbar';
import { TrustlineModal } from './trustline-modal';
import { SavingsSetupDialog } from './savings-setup-dialog';

// ----------------------------------------------------------------------

const txDotsAnim = keyframes`
  0%   { width: 0; }
  100% { width: 1.2em; }
`;

interface SavingsCardProps extends BoxProps {}

// ----------------------------------------------------------------------

const SavingsCard: React.FC<SavingsCardProps> = ({ sx: sxProp, ...other }) => {
  const { t } = useTranslate();
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const { tokenState, wallet, getAllTokens } = usePersistStore();
  const config = useStellarConfig();
  const savingsUsdcIssuer = getSavingsUsdcIssuer(config);

  const {
    isLoading: isCheckingAccount,
    accountExists,
    xlmBalance,
    hasUsdcTrustline,
    refetch: refetchAccountStatus,
  } = useAccountStatus(wallet.address, { assetIssuer: savingsUsdcIssuer });
  const { addTrustLine, txBroadcasting: isAddingTrustline } = useTrustLine();
  const { startFlow } = useAssetActionsContext();

  const {
    vaultInfo,
    userPosition,
    loading,
    fetching,
    positionFetching,
    error,
    needsTrustline,
    setNeedsTrustline,
    txStep,
    deposit,
    withdraw,
  } = useDefindexSavings();

  const [mode, setMode] = useState<'deposit' | 'withdraw'>('deposit');
  const [amount, setAmount] = useState('');
  const [spentOnDeposits, setSpentOnDeposits] = useState(0);
  const [setupOpen, setSetupOpen] = useState(false);
  const setupAutoOpened = useRef(false);

  const rawDepositBalance = getTokenBalance(getSavingsDepositToken(tokenState.tokens, config));
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

  const handleAction = useCallback(async () => {
    if (!amount || parseFloat(amount) <= 0) return;
    const parsedAmt = parseFloat(amount);

    if (mode === 'deposit') {
      const hash = await deposit(amount);
      if (hash) {
        setSpentOnDeposits((prev) => prev + parsedAmt);
      }
    } else {
      await withdraw(amount);
      getAllTokens(true);
    }
    setAmount('');
  }, [mode, amount, deposit, withdraw, getAllTokens]);

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
    (!accountExists || (trustlineRequired && !hasUsdcTrustline));
  const setupComplete =
    hasCheckedOnce && !!wallet.address && accountExists && (!trustlineRequired || hasUsdcTrustline);

  // Auto-open the guided setup once when it's first needed (the user can reopen
  // it later via the "Set up savings" button).
  useEffect(() => {
    if (needsSetup && !setupAutoOpened.current) {
      setupAutoOpened.current = true;
      setSetupOpen(true);
    }
  }, [needsSetup]);

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
    if (!setupOpen || accountExists) return undefined;
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

  // #26 sign-both-first: both signatures are collected BEFORE anything is
  // submitted, then the pair is submitted server-side in one phase.
  const depositSteps = [
    { id: 'checking', label: t('Checking balance'), sub: t('Verifying USDC on Stellar') },
    { id: 'deposit_sign', label: t('Signing deposit'), sub: t('Approve in your wallet · 1 of 2') },
    { id: 'fee_sign', label: t('Signing fee payment'), sub: t('Approve in your wallet · 2 of 2') },
    {
      id: 'deposit_broadcast',
      label: t('Crediting savings vault'),
      sub: `Blend USDC pool · ${vaultInfo?.apy || 0}% APY`,
    },
  ];
  const hasWithdrawCommission =
    parsedAmount > 0 ? yieldCommission > 0 : parseFloat(userPosition?.earnings || '0') > 0;
  const withdrawSteps = hasWithdrawCommission
    ? [
        {
          id: 'withdraw_sign',
          label: t('Signing withdrawal'),
          sub: t('Approve in your wallet · 1 of 2'),
        },
        {
          id: 'commission_sign',
          label: t('Signing yield commission'),
          sub: t('Approve in your wallet · 2 of 2'),
        },
        {
          id: 'withdraw_broadcast',
          label: t('Processing withdrawal'),
          sub: 'horizon.stellar.org',
        },
      ]
    : [
        { id: 'withdraw_sign', label: t('Signing withdrawal'), sub: t('Approve in your wallet') },
        {
          id: 'withdraw_broadcast',
          label: t('Broadcasting to Stellar'),
          sub: 'horizon.stellar.org',
        },
      ];
  const txSteps = mode === 'deposit' ? depositSteps : withdrawSteps;
  const activeStepIdx = txStep ? txSteps.findIndex((s) => s.id === txStep) : -1;
  const stepsTiming = mode === 'deposit' ? '~30s' : hasWithdrawCommission ? '~20s' : '~10s';

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
              ? t('Deposit')
              : t('Withdraw');

  return (
    <Box
      sx={[
        (theme) => ({
          p: '22px',
          borderRadius: '22px',
          textAlign: 'left',
          background: 'rgba(255,255,255,0.88)',
          backdropFilter: 'blur(20px) saturate(140%)',
          border: '1px solid rgba(10,10,15,0.08)',
          boxShadow:
            '0 1px 0 rgba(255,255,255,0.6) inset, 0 24px 60px rgba(10,10,15,0.10), 0 2px 8px rgba(10,10,15,0.06)',
          ...theme.applyStyles('dark', {
            background: 'rgba(20,26,33,0.92)',
            border: '1px solid rgba(255,255,255,0.07)',
            boxShadow: '0 24px 60px rgba(0,0,0,0.35)',
          }),
        }),
        ...(Array.isArray(sxProp) ? sxProp : [sxProp]),
      ]}
      {...other}
    >
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: '18px' }}>
        <Typography
          sx={(theme) => ({
            fontSize: '15px',
            fontWeight: 600,
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
              border: '1px solid rgba(10,10,15,0.07)',
              borderRadius: '20px',
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
                boxShadow: '0 0 0 2px rgba(26,179,125,0.18)',
              }}
            />
            <Typography
              sx={{
                fontSize: '12px',
                fontWeight: 700,
                lineHeight: 1,
                fontFamily: '"Geist Mono", "Courier New", monospace',
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
                fontFamily: '"Geist Mono", "Courier New", monospace',
              }}
            >
              APY
            </Typography>
          </Box>
        ) : (
          <Skeleton variant="rounded" width={80} height={26} sx={{ borderRadius: '20px' }} />
        )}
      </Stack>

      {/* Stats */}
      <Box
        sx={(theme) => ({
          borderRadius: '14px',
          p: '14px 16px',
          mb: '14px',
          background: '#F7F7F9',
          ...theme.applyStyles('dark', { background: 'rgba(255,255,255,0.05)' }),
        })}
      >
        {fetching ? (
          <Box sx={{ display: 'grid', gap: '8px' }}>
            {[t('Your Deposits'), t('Current Value'), t('Current Earnings')].map((label) => (
              <Box
                key={label}
                sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <Typography
                  sx={{
                    fontSize: '13.5px',
                    fontWeight: 400,
                    fontFamily: '"Geist Mono", "Courier New", monospace',
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
              { label: t('Your Deposits'), value: userPosition?.totalDeposited, prefix: '' },
              { label: t('Current Value'), value: userPosition?.currentValue, prefix: '' },
              { label: t('Current Earnings'), value: userPosition?.earnings, prefix: '+' },
            ].map(({ label, value, prefix }) => (
              <Box
                key={label}
                sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <Typography
                  sx={{
                    fontSize: '13.5px',
                    fontWeight: 400,
                    fontFamily: '"Geist Mono", "Courier New", monospace',
                    color: '#6B6B76',
                  }}
                >
                  {label}
                </Typography>
                {!userPosition ? (
                  <Skeleton variant="text" width={80} height={18} />
                ) : (
                  <Typography
                    sx={{
                      fontSize: '13.5px',
                      fontWeight: 400,
                      fontFamily: '"Geist Mono", "Courier New", monospace',
                      fontFeatureSettings: '"ss01","ss02","zero"',
                      fontVariantNumeric: 'tabular-nums',
                      letterSpacing: '-0.02em',
                      color: prefix === '+' ? '#1AB37D' : 'text.primary',
                    }}
                  >
                    {`${prefix}${parseFloat(value || '0').toLocaleString('en-US', { minimumFractionDigits: 7, maximumFractionDigits: 7 })} USDC`}
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
          borderRadius: '12px',
          p: '4px',
          position: 'relative',
          display: 'flex',
          mb: '14px',
          background: '#F0F0F4',
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
            borderRadius: '9px',
            top: '4px',
            left: '4px',
            transform: mode === 'withdraw' ? 'translateX(calc(100% + 4px))' : 'translateX(0)',
            transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
            pointerEvents: 'none',
            boxShadow: '0 2px 8px rgba(10,10,15,0.2)',
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
              fontWeight: 600,
              padding: '10px 0',
              minHeight: 'unset',
              borderRadius: '9px',
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
          borderRadius: '14px',
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
              {`Wallet: ${parseFloat(availableBalance).toFixed(7)} USDC`}
            </Typography>
            <Box
              component="button"
              onClick={handleMax}
              sx={(theme) => ({
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.04em',
                color: '#0A0A0F',
                background: 'transparent',
                border: '1px solid rgba(10,10,15,0.08)',
                borderRadius: '6px',
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
              borderRadius: '20px',
              p: '7px 10px 7px 7px',
              flexShrink: 0,
              ...theme.applyStyles('dark', {
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.1)',
              }),
            })}
          >
            <Iconify icon="cryptocurrency-color:usdc" width={22} sx={{ flexShrink: 0 }} />
            <Typography sx={{ fontSize: '12px', fontWeight: 600, color: 'text.primary' }}>
              {availableAssetLabel}
            </Typography>
          </Box>
          <Box
            component="input"
            type="number"
            value={amount}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAmount(e.target.value)}
            placeholder="0.0000000"
            sx={(theme) => ({
              flex: 1,
              minWidth: 0,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: '26px',
              fontWeight: 700,
              color: '#0A0A0F',
              fontFamily: '"Geist Mono", "Courier New", monospace',
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
            borderRadius: '10px',
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
                  fontFamily: '"Geist Mono", "Courier New", monospace',
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
                  fontFamily: '"Geist Mono", "Courier New", monospace',
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
            borderRadius: '10px',
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
                fontFamily: '"Geist Mono", "Courier New", monospace',
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
          <Typography sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.5)', lineHeight: 1.4 }}>
            {t('XLM fee reserve healthy — deposits & withdrawals covered.')}
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
            borderRadius: '14px',
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
                fontWeight: 600,
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
                    'About {{n}} XLM left for fees — roughly one more deposit or withdrawal. Top up a little to stay safe.',
                    { n: feeXlmAvailable.toFixed(2) }
                  )}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mt: '10px', flexWrap: 'wrap', rowGap: 1 }}>
              <Button
                onClick={() => router.push('/swap?from=USDC')}
                sx={{
                  bgcolor: '#0A0A0F',
                  color: '#fff',
                  fontSize: '12px',
                  fontWeight: 600,
                  textTransform: 'none',
                  borderRadius: '10px',
                  px: '12px',
                  py: '6px',
                  '&:hover': { bgcolor: '#1A1A28' },
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
                  fontWeight: 600,
                  textTransform: 'none',
                  borderRadius: '10px',
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
                  fontWeight: 600,
                  textTransform: 'none',
                  borderRadius: '10px',
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
                ? t('One quick step left — add a USDC trustline to start earning.')
                : t('Activate your account and add USDC to start earning yield.')}
            </Typography>
            <Button
              fullWidth
              onClick={() => setSetupOpen(true)}
              sx={{
                background: '#0A0A0F',
                borderRadius: '14px',
                padding: '14px 16px',
                fontSize: '14px',
                fontWeight: 600,
                color: '#FFFFFF',
                textTransform: 'none',
                '&:hover': { background: '#1A1A28' },
              }}
            >
              {accountExists ? t('Continue setup') : t('Set up savings')}
            </Button>
          </Stack>
        ) : (
          <Button
            fullWidth
            disabled={isActionDisabled}
            onClick={handleAction}
            sx={{
              background: '#0A0A0F',
              borderRadius: '14px',
              padding: '14px 16px',
              fontSize: '14px',
              fontWeight: 600,
              color: '#FFFFFF',
              textTransform: 'none',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 8px 22px rgba(10,10,15,0.22)',
              transition: 'transform 0.18s ease, box-shadow 0.18s ease',
              '&:hover': {
                background: '#0A0A0F',
                transform: 'translateY(-1px)',
                boxShadow: '0 12px 30px rgba(10,10,15,0.28)',
              },
              '&:hover .btn-shine': { opacity: 0.9 },
              '&.Mui-disabled': {
                opacity: 0.5,
                color: '#FFFFFF',
                background: '#0A0A0F',
              },
            }}
          >
            <Box
              className="btn-shine"
              sx={{
                position: 'absolute',
                inset: 0,
                background:
                  'linear-gradient(90deg, #5BCFFF 0%, #6E8BFF 28%, #B17BFF 55%, #FF7BC5 78%, #FFB060 100%)',
                opacity: 0,
                transition: 'opacity 0.35s ease',
                pointerEvents: 'none',
              }}
            />
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{ position: 'relative', zIndex: 1 }}
            >
              {loading && <CircularProgress size={16} sx={{ color: '#FFFFFF' }} />}
              <span>{actionButtonText}</span>
            </Stack>
          </Button>
        )}
      </WalletGate>

      {/* TX Log */}
      <Box
        sx={(theme) => ({
          mt: '14px',
          pt: '14px',
          borderTop: '1px dashed rgba(10,10,15,0.12)',
          ...theme.applyStyles('dark', { borderTop: '1px dashed rgba(255,255,255,0.1)' }),
        })}
      >
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ mb: '10px' }}
        >
          <Typography
            sx={{
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.14em',
              color: 'text.disabled',
            }}
          >
            {mode === 'deposit'
              ? t('What happens when you deposit')
              : t('What happens when you withdraw')}
          </Typography>
          <Typography sx={{ fontSize: '10px', color: 'text.disabled' }}>{stepsTiming}</Typography>
        </Stack>

        <Stack>
          {txSteps.map((step, idx) => {
            const isDone = activeStepIdx >= 0 && idx < activeStepIdx;
            const isActive = idx === activeStepIdx;
            const isPending = !isDone && !isActive;
            return (
              <Box
                key={step.id}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '22px 1fr',
                  alignItems: 'center',
                  gap: '10px',
                  py: '6px',
                  opacity: isPending ? 0.4 : 1,
                  transition: 'opacity 0.3s ease',
                }}
              >
                {/* Step icon */}
                <Box
                  sx={(theme) => ({
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    background: isDone ? '#1AB37D' : isActive ? '#0A0A0F' : '#F0F0F4',
                    border: isPending ? '1px dashed rgba(10,10,15,0.2)' : 'none',
                    transition: 'background 0.4s ease',
                    ...theme.applyStyles('dark', {
                      background: isDone
                        ? '#1AB37D'
                        : isActive
                          ? '#FFFFFF'
                          : 'rgba(255,255,255,0.1)',
                      border: isPending ? '1px dashed rgba(255,255,255,0.2)' : 'none',
                    }),
                  })}
                >
                  {isDone ? (
                    <svg width="10" height="10" viewBox="0 0 12 12" style={{ display: 'block' }}>
                      <path
                        d="M2 6 L5 9 L10 3"
                        stroke="#fff"
                        strokeWidth="2"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : isActive ? (
                    <CircularProgress
                      size={8}
                      sx={(theme) => ({
                        color: '#FFFFFF',
                        display: 'block',
                        ...theme.applyStyles('dark', { color: '#0A0A0F' }),
                      })}
                    />
                  ) : (
                    <Box
                      sx={{
                        width: 5,
                        height: 5,
                        borderRadius: '50%',
                        flexShrink: 0,
                        background: 'rgba(10,10,15,0.25)',
                      }}
                    />
                  )}
                </Box>

                {/* Step text */}
                <Box>
                  <Typography
                    component="span"
                    sx={(theme) => ({
                      fontSize: '13px',
                      fontWeight: 500,
                      display: 'block',
                      color: isDone ? '#1AB37D' : isActive ? 'text.primary' : 'text.secondary',
                      transition: 'color 0.3s ease',
                      ...(isActive && {
                        '&::after': {
                          content: '"..."',
                          display: 'inline-block',
                          overflow: 'hidden',
                          verticalAlign: 'bottom',
                          width: 0,
                          animation: `${txDotsAnim} 1.2s steps(4, end) infinite`,
                        },
                      }),
                    })}
                  >
                    {step.label}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: '11px',
                      color: 'text.disabled',
                      fontFamily: '"Geist Mono", "Courier New", monospace',
                      letterSpacing: '-0.01em',
                      mt: '1px',
                      display: 'block',
                    }}
                  >
                    {step.sub}
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Stack>
      </Box>

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
        accountExists={accountExists}
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
