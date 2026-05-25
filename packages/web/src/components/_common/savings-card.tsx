'use client';

import type { BoxProps } from '@mui/material';

import { useTranslate } from '@/locales';
import { useStellarConfig } from '@/hooks';
import React, { useState, useCallback } from 'react';
import { usePersistStore } from '@normalfinance/state';
import { keyframes } from '@mui/system';
import { useTrustLine } from '@/hooks/stellar/tokens/use-trustline';
import { useAccountStatus } from '@/hooks/stellar/use-account-status';
import { useDefindexSavings } from '@/hooks/stellar/use-defindex-savings';
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

import {
  Box,
  Stack,
  Button,
  Skeleton,
  Typography,
  CircularProgress,
} from '@mui/material';

import { WalletGate } from './wallet-gate';
import { Iconify } from '../template/iconify';
import { useSnackbar } from '../template/snackbar';
import { TrustlineModal } from './trustline-modal';

// ----------------------------------------------------------------------

const txDotsAnim = keyframes`
  0%   { width: 0; }
  100% { width: 1.2em; }
`;

interface SavingsCardProps extends BoxProps {}

// ----------------------------------------------------------------------

const SavingsCard: React.FC<SavingsCardProps> = ({ sx: sxProp, ...other }) => {
  const { t } = useTranslate();
  const { enqueueSnackbar } = useSnackbar();
  const { tokenState, wallet, getAllTokens } = usePersistStore();
  const config = useStellarConfig();
  const savingsUsdcIssuer = getSavingsUsdcIssuer(config);

  const {
    isLoading: isCheckingAccount,
    accountExists,
    hasUsdcTrustline,
    refetch: refetchAccountStatus,
  } = useAccountStatus(wallet.address, { assetIssuer: savingsUsdcIssuer });
  const { addTrustLine, txBroadcasting: isAddingTrustline } = useTrustLine();

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
    refreshVaultInfo,
  } = useDefindexSavings();

  const [mode, setMode] = useState<'deposit' | 'withdraw'>('deposit');
  const [amount, setAmount] = useState('');
  const [spentOnDeposits, setSpentOnDeposits] = useState(0);

  const rawDepositBalance = getTokenBalance(getSavingsDepositToken(tokenState.tokens, config));
  const rawDepositBalanceNum = parseFloat(rawDepositBalance);
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
  const showAddTrustlineAction = accountExists && !hasUsdcTrustline && !!savingsUsdcIssuer;

  const depositSteps = [
    { id: 'checking', label: t('Checking balance'), sub: t('Verifying USDC on Stellar') },
    { id: 'fee_sign', label: t('Signing fee payment'), sub: t('Approve in your wallet · 1 of 2') },
    { id: 'fee_broadcast', label: t('Broadcasting to Stellar'), sub: 'horizon.stellar.org' },
    { id: 'deposit_sign', label: t('Signing deposit'), sub: t('Approve in your wallet · 2 of 2') },
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
          id: 'commission_sign',
          label: t('Signing yield commission'),
          sub: t('Approve in your wallet · 1 of 2'),
        },
        { id: 'commission_broadcast', label: t('Broadcasting to Stellar'), sub: 'horizon.stellar.org' },
        {
          id: 'withdraw_sign',
          label: t('Signing withdrawal'),
          sub: t('Approve in your wallet · 2 of 2'),
        },
        { id: 'withdraw_broadcast', label: t('Processing withdrawal'), sub: 'horizon.stellar.org' },
      ]
    : [
        { id: 'withdraw_sign', label: t('Signing withdrawal'), sub: t('Approve in your wallet') },
        { id: 'withdraw_broadcast', label: t('Broadcasting to Stellar'), sub: 'horizon.stellar.org' },
      ];
  const txSteps = mode === 'deposit' ? depositSteps : withdrawSteps;
  const activeStepIdx = txStep ? txSteps.findIndex((s) => s.id === txStep) : -1;
  const stepsTiming =
    mode === 'deposit' ? '~30s' : hasWithdrawCommission ? '~20s' : '~10s';

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
  }, [addTrustLine, savingsUsdcIssuer, enqueueSnackbar, t, setNeedsTrustline, refetchAccountStatus]);

  const handleTrustlineSuccess = useCallback(async () => {
    setAmount('');
    setNeedsTrustline(false);
    await refetchAccountStatus();
  }, [setNeedsTrustline, refetchAccountStatus]);

  const isWithdrawPositionLoading = mode === 'withdraw' && positionFetching && !userPosition;
  const isActionDisabled =
    loading || isWithdrawPositionLoading || isInsufficientBalance || isAmountMissing;
  const actionButtonText = loading
    ? mode === 'deposit'
      ? t('Depositing...')
      : t('Withdrawing...')
    : isWithdrawPositionLoading
      ? t('Loading balance...')
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
        <Typography sx={{ fontSize: '12px', color: 'error.main', mb: '12px' }}>
          {error}
        </Typography>
      )}

      {/* Action Button */}
      <WalletGate buttonText={t('Connect wallet to save')} fullWidth variant="contained">
        {showAddTrustlineAction ? (
          <Button
            fullWidth
            disabled={isAddingTrustline}
            onClick={handleAddTrustline}
            sx={{
              background: 'linear-gradient(120deg, #0A0A0F 0%, #1A1A28 100%)',
              borderRadius: '14px',
              padding: '14px 16px',
              fontSize: '14px',
              fontWeight: 600,
              color: '#FFFFFF',
              textTransform: 'none',
              boxShadow: '0 8px 22px rgba(10,10,15,0.22)',
              transition: 'transform 0.18s ease, box-shadow 0.18s ease',
              '&:hover': {
                background: 'linear-gradient(120deg, #1A1A22 0%, #252535 100%)',
                transform: 'translateY(-1px)',
                boxShadow: '0 12px 30px rgba(10,10,15,0.28)',
              },
              '&.Mui-disabled': {
                opacity: 0.5,
                color: '#FFFFFF',
                background: 'linear-gradient(120deg, #0A0A0F 0%, #1A1A28 100%)',
              },
            }}
            startIcon={
              isAddingTrustline ? (
                <CircularProgress size={18} sx={{ color: '#FFFFFF' }} />
              ) : (
                <Iconify icon="solar:add-circle-bold" sx={{ color: '#FFFFFF' }} />
              )
            }
          >
            {isAddingTrustline ? t('Adding trustline...') : t('Add USDC trustline')}
          </Button>
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
    </Box>
  );
};

export default SavingsCard;
