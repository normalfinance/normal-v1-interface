'use client';

import type { CardProps } from '@mui/material';

import { useTranslate } from '@/locales';
import React, { useState, useCallback } from 'react';
import { usePersistStore } from '@normalfinance/state';
import { useStellarConfig } from '@/hooks';
import { useDefindexSavings } from '@/hooks/stellar/use-defindex-savings';
import { getYieldCommission, getSavingsDepositFee } from '@/utils/normal-fees';
import {
  getTokenBalance,
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
  TextField,
  Typography,
  InputAdornment,
  CircularProgress,
} from '@mui/material';

import { WalletGate } from './wallet-gate';
import { Iconify } from '../template/iconify';
import { TrustlineModal } from './trustline-modal';

// ----------------------------------------------------------------------

interface SavingsCardProps extends CardProps {}

// ----------------------------------------------------------------------

const SavingsCard: React.FC<SavingsCardProps> = ({ ...other }) => {
  const { t } = useTranslate();
  const { tokenState } = usePersistStore();
  const config = useStellarConfig();

  const {
    vaultInfo,
    userPosition,
    loading,
    error,
    needsTrustline,
    setNeedsTrustline,
    deposit,
    withdraw,
    refreshVaultInfo,
  } = useDefindexSavings();

  const [mode, setMode] = useState<'deposit' | 'withdraw'>('deposit');
  const [amount, setAmount] = useState('');

  const savingsDepositBalance = getTokenBalance(
    getSavingsDepositToken(tokenState.tokens, config)
  );
  const savingsDepositLabel = getSavingsDepositTokenLabel(config);

  // Truncate to 2 decimal places (no rounding up) so MAX never exceeds actual balance
  const truncateToTwoDecimals = (value: number): string =>
    (Math.floor(value * 100) / 100).toFixed(2);

  // Handle max button
  const handleMax = useCallback(() => {
    if (mode === 'deposit') {
      setAmount(parseFloat(savingsDepositBalance).toFixed(2));
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
    await refreshVaultInfo();
  }, [mode, amount, deposit, withdraw, refreshVaultInfo]);

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
  const isBelowMinimumDeposit = mode === 'deposit' && parsedAmount > 0 && parsedAmount <= depositFee;

  const yieldCommission =
    mode === 'withdraw' && parsedAmount > 0
      ? getYieldCommission({
          withdrawAmount: parsedAmount,
          currentValue: parseFloat(userPosition?.currentValue || '0'),
          earnings: parseFloat(userPosition?.earnings || '0'),
        })
      : 0;

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
        <Stack spacing={1}>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">
              {t('Your Deposits')}
            </Typography>
            <Typography variant="body2" fontWeight="bold">
              ${parseFloat(userPosition?.totalDeposited || '0').toLocaleString()} USDC
            </Typography>
          </Stack>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">
              {t('Current Value')}
            </Typography>
            <Typography variant="body2" fontWeight="bold">
              ${parseFloat(userPosition?.currentValue || '0').toLocaleString()} USDC
            </Typography>
          </Stack>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">
              {t('Earnings')}
            </Typography>
            <Typography variant="body2" fontWeight="bold" color="success.main">
              +${parseFloat(userPosition?.earnings || '0').toLocaleString()} USDC
            </Typography>
          </Stack>
        </Stack>
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
              {t('Available')}: {parseFloat(availableBalance).toFixed(2)}{' '}
              {availableAssetLabel}
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
                  {t('Normal fee')}
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
                {t('Normal 7% yield commission')}
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
        <WalletGate
          buttonText={t('Connect wallet to save')}
          fullWidth
          variant="contained"
        >
          <Button
            variant="contained"
            color={mode === 'deposit' ? 'success' : 'primary'}
            fullWidth
            size="large"
            disabled={
              loading ||
              isInsufficientBalance ||
              isBelowMinimumDeposit ||
              !amount ||
              parseFloat(amount) <= 0
            }
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
            {loading
              ? mode === 'deposit'
                ? t('Depositing...')
                : t('Withdrawing...')
              : isInsufficientBalance
                ? t('Insufficient balance')
                : isBelowMinimumDeposit
                  ? t('Amount must exceed ${{fee}} fee', { fee: depositFee.toFixed(2) })
                  : !amount || parseFloat(amount) <= 0
                    ? t('Enter amount')
                    : mode === 'deposit'
                      ? t('Deposit')
                      : t('Withdraw')}
          </Button>
        </WalletGate>
      </Stack>

      {/* Vault Info Footer */}
      <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: 'divider' }}>
        <Stack direction="row" justifyContent="space-between">
          <Typography variant="caption" color="text.secondary">
            {t('Total vault deposits')}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            ${parseFloat(vaultInfo?.totalDeposits || '0').toLocaleString()} USDC
          </Typography>
        </Stack>
      </Box>

      {/* Trustline Modal — shown when deposit fails due to missing trustline */}
      <TrustlineModal
        open={needsTrustline}
        onClose={() => setNeedsTrustline(false)}
        onSuccess={() => setNeedsTrustline(false)}
      />
    </Card>
  );
};

export default SavingsCard;
