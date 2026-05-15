'use client';

import type { CardProps } from '@mui/material';

import { useTranslate } from '@/locales';
import { useStellarConfig } from '@/hooks';
import React, { useState, useCallback } from 'react';
import { usePersistStore } from '@normalfinance/state';
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
  Card,
  Chip,
  Stack,
  Button,
  Divider,
  Skeleton,
  TextField,
  Typography,
  InputAdornment,
  CircularProgress,
} from '@mui/material';

import { WalletGate } from './wallet-gate';
import { Iconify } from '../template/iconify';
import { useSnackbar } from '../template/snackbar';
import { TrustlineModal } from './trustline-modal';

// ----------------------------------------------------------------------

interface SavingsCardProps extends CardProps {}

// ----------------------------------------------------------------------

const SavingsCard: React.FC<SavingsCardProps> = ({ ...other }) => {
  const { t } = useTranslate();
  const { enqueueSnackbar } = useSnackbar();
  const { tokenState, wallet } = usePersistStore();
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
    deposit,
    withdraw,
    refreshVaultInfo,
  } = useDefindexSavings();

  const [mode, setMode] = useState<'deposit' | 'withdraw'>('deposit');
  const [amount, setAmount] = useState('');

  const savingsDepositBalance = getTokenBalance(getSavingsDepositToken(tokenState.tokens, config));
  const savingsDepositLabel = getSavingsDepositTokenLabel(config);

  // Truncate to 2 decimal places (no rounding up) so MAX never exceeds actual balance
  const truncateToTwoDecimals = (value: number): string =>
    (Math.floor(value * 100) / 100).toFixed(2);

  // Handle max button
  const handleMax = useCallback(() => {
    if (mode === 'deposit') {
      setAmount(truncateToTwoDecimals(parseFloat(savingsDepositBalance)));
    } else if (userPosition) {
      setAmount(truncateToTwoDecimals(parseFloat(userPosition.currentValue)));
    }
  }, [mode, savingsDepositBalance, userPosition]);

  // Handle action
  const handleAction = useCallback(async () => {
    if (!amount || parseFloat(amount) <= 0) return;

    if (mode === 'deposit') {
      await deposit(amount);
    } else {
      await withdraw(amount);
    }
    setAmount('');
  }, [mode, amount, deposit, withdraw]);

  const availableBalance =
    mode === 'deposit' ? savingsDepositBalance : userPosition?.currentValue || '0';
  const availableAssetLabel = mode === 'deposit' ? savingsDepositLabel : 'USDC';
  const estimatedYearlyEarningsText = `${t('Estimated yearly earnings')}: $${(
    (parseFloat(amount || '0') * (vaultInfo?.apy || 0)) /
    100
  ).toFixed(2)} ${availableAssetLabel}`;

  const isInsufficientBalance = parseFloat(amount) > parseFloat(availableBalance);

  // Normal Finance fee preview
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

  const isActionDisabled =
    isCheckingAccount || loading || isInsufficientBalance || isAmountMissing;
  const actionButtonText = loading
    ? mode === 'deposit'
      ? t('Depositing...')
      : t('Withdrawing...')
    : isInsufficientBalance
      ? t('Insufficient balance')
      : isAmountMissing
        ? t('Enter amount')
        : mode === 'deposit'
          ? t('Deposit')
          : t('Withdraw');

  return (
    <Card
      sx={{
        p: 3,
        borderRadius: 2,
        bgcolor: 'background.paper',
        ...other.sx,
      }}
      {...other}
    >
      {/* Header with APY */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h6">{t('Normal Savings')}</Typography>
        <Chip
          label={`${vaultInfo?.apy || 0}% APY`}
          color="success"
          size="medium"
          icon={<Iconify icon="solar:graph-up-bold" width={16} />}
        />
      </Stack>

      {/* User Position Summary */}
      <Box
        sx={{
          p: 2,
          mb: 3,
          borderRadius: 1,
          bgcolor: 'action.hover',
        }}
      >
        {fetching ? (
          <Stack spacing={1}>
            {[t('Your Deposits'), t('Current Value'), t('Earnings')].map((label) => (
              <Stack key={label} direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" color="text.secondary">{label}</Typography>
                <Skeleton variant="text" width={100} height={20} />
              </Stack>
            ))}
          </Stack>
        ) : (
          <Stack spacing={1}>
            {[
              { label: t('Your Deposits'), value: userPosition?.totalDeposited, prefix: '' },
              { label: t('Current Value'), value: userPosition?.currentValue, prefix: '' },
              { label: t('Earnings'), value: userPosition?.earnings, prefix: '+' },
            ].map(({ label, value, prefix }) => (
              <Stack key={label} direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" color="text.secondary">
                  {label}
                </Typography>
                {positionFetching && !userPosition ? (
                  <Skeleton variant="text" width={100} height={20} />
                ) : (
                  <Typography
                    variant="body2"
                    fontWeight="bold"
                    color={prefix === '+' ? 'success.main' : 'text.primary'}
                  >
                    {`${prefix}${parseFloat(value || '0').toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} USDC`}
                  </Typography>
                )}
              </Stack>
            ))}
          </Stack>
        )}
      </Box>

      <Divider sx={{ mb: 3 }} />

      {/* Mode Toggle */}
      <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
        <Button
          variant={mode === 'deposit' ? 'contained' : 'outlined'}
          color="primary"
          onClick={() => setMode('deposit')}
          fullWidth
        >
          {t('Deposit')}
        </Button>
        <Button
          variant={mode === 'withdraw' ? 'contained' : 'outlined'}
          color="primary"
          onClick={() => setMode('withdraw')}
          fullWidth
        >
          {t('Withdraw')}
        </Button>
      </Stack>

      {/* Amount Input */}
      <Stack spacing={2}>
        <Box>
          <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography variant="caption" color="text.secondary">
              {mode === 'deposit' ? t('Amount to deposit') : t('Amount to withdraw')}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t('Available')}: {parseFloat(availableBalance).toFixed(2)} {availableAssetLabel}
            </Typography>
          </Stack>
          <TextField
            fullWidth
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Iconify icon="cryptocurrency-color:usdc" width={24} />
                    <Typography variant="subtitle2">{availableAssetLabel}</Typography>
                  </Stack>
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <Button size="small" onClick={handleMax} sx={{ minWidth: 'auto' }}>
                    {t('MAX')}
                  </Button>
                </InputAdornment>
              ),
            }}
            error={isInsufficientBalance}
            helperText={isInsufficientBalance ? t('Insufficient balance') : ''}
          />
        </Box>

        {/* Fee Breakdown (deposit) */}
        {mode === 'deposit' && parsedAmount > 0 && (
          <Box
            sx={{
              px: 1.5,
              py: 1,
              borderRadius: 1,
              bgcolor: 'action.hover',
            }}
          >
            <Stack spacing={0.5}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="caption" color="text.secondary">
                  {t('Normal fee (0.5%)')}
                </Typography>
                <Typography variant="caption" fontWeight="medium">
                  -${depositFee.toFixed(2)} USDC
                </Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="caption" color="text.secondary">
                  {t('Net deposit')}
                </Typography>
                <Typography variant="caption" fontWeight="medium">
                  ${netDepositAmount.toFixed(2)} USDC
                </Typography>
              </Stack>
              {vaultInfo && (
                <Typography variant="caption" color="text.secondary">
                  {estimatedYearlyEarningsText}
                </Typography>
              )}
            </Stack>
          </Box>
        )}

        {/* Commission Breakdown (withdraw) */}
        {mode === 'withdraw' && parsedAmount > 0 && yieldCommission > 0 && (
          <Box
            sx={{
              px: 1.5,
              py: 1,
              borderRadius: 1,
              bgcolor: 'action.hover',
            }}
          >
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="caption" color="text.secondary">
                {t('Normal {{rate}}% yield commission', { rate: yieldCommissionRatePct })}
              </Typography>
              <Typography variant="caption" fontWeight="medium">
                -${yieldCommission.toFixed(2)} USDC
              </Typography>
            </Stack>
          </Box>
        )}

        {/* Two-signature notice */}
        {parsedAmount > 0 && (mode === 'deposit' || yieldCommission > 0) && (
          <Typography variant="caption" color="text.secondary" sx={{ px: 1 }}>
            {t("You'll sign two transactions: the Normal fee and your {{action}}.", {
              action: mode === 'deposit' ? t('deposit') : t('withdrawal'),
            })}
          </Typography>
        )}

        {/* Error Display */}
        {error && (
          <Typography variant="caption" color="error.main">
            {error}
          </Typography>
        )}

        {/* Action Button */}
        <WalletGate buttonText={t('Connect wallet to save')} fullWidth variant="contained">
          {showAddTrustlineAction ? (
            <Button
              variant="contained"
              color="primary"
              fullWidth
              size="large"
              disabled={isAddingTrustline}
              onClick={handleAddTrustline}
              startIcon={
                isAddingTrustline ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  <Iconify icon="solar:add-circle-bold" />
                )
              }
            >
              {isAddingTrustline ? t('Adding trustline...') : t('Add USDC trustline')}
            </Button>
          ) : (
            <Button
              variant="contained"
              color={mode === 'deposit' ? 'success' : 'primary'}
              fullWidth
              size="large"
              disabled={isActionDisabled}
              onClick={handleAction}
              startIcon={
                loading ? (
                  <CircularProgress size={20} color="inherit" />
                ) : mode === 'deposit' ? (
                  <Iconify icon="solar:add-circle-bold" />
                ) : (
                  <Iconify icon="solar:minus-circle-bold" />
                )
              }
            >
              {actionButtonText}
            </Button>
          )}
        </WalletGate>
      </Stack>

      {/* Vault Info Footer */}
      <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: 'divider' }}>
        <Stack direction="row" justifyContent="space-between">
          <Typography variant="caption" color="text.secondary">
            {t('Total vault deposits')}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {parseFloat(vaultInfo?.totalDeposits || '0').toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} USDC
          </Typography>
        </Stack>
      </Box>

      {/* Trustline Modal — shown when a savings action fails due to a missing trustline */}
      <TrustlineModal
        open={needsTrustline}
        onClose={() => setNeedsTrustline(false)}
        onSuccess={handleTrustlineSuccess}
      />
    </Card>
  );
};

export default SavingsCard;
