'use client';

import type { CardProps } from '@mui/material';

import React, { useState, useCallback } from 'react';
import { useTranslate } from '@/locales';
import { usePersistStore } from '@normalfinance/state';

import {
  Box,
  Card,
  Stack,
  Button,
  TextField,
  Typography,
  InputAdornment,
  CircularProgress,
  Divider,
  Chip,
} from '@mui/material';

import { constants } from '@normalfinance/utils';

import { WalletGate } from './wallet-gate';
import { Iconify } from '../template/iconify';
import { useDefindexSavings } from '@/hooks/stellar/use-defindex-savings';

// ----------------------------------------------------------------------

interface SavingsCardProps extends CardProps {}

// ----------------------------------------------------------------------

const SavingsCard: React.FC<SavingsCardProps> = ({ ...other }) => {
  const { t } = useTranslate();
  const { tokenState } = usePersistStore();

  const { vaultInfo, userPosition, loading, error, deposit, withdraw, refreshVaultInfo } =
    useDefindexSavings();

  const [mode, setMode] = useState<'deposit' | 'withdraw'>('deposit');
  const [amount, setAmount] = useState('');

  // Get user USDC balance — match by contract address to avoid stale duplicates in persisted state
  const usdcBalance =
    tokenState.tokens.find((t) => t.contract === constants.StellarConfig.USDC_ADDRESS)?.balance ||
    '0';

  // Handle max button
  const handleMax = useCallback(() => {
    if (mode === 'deposit') {
      setAmount(parseFloat(usdcBalance).toFixed(2));
    } else if (userPosition) {
      setAmount(parseFloat(userPosition.currentValue).toFixed(2));
    }
  }, [mode, usdcBalance, userPosition]);

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
    mode === 'deposit' ? usdcBalance : userPosition?.currentValue || '0';

  const isInsufficientBalance = parseFloat(amount) > parseFloat(availableBalance);

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
              {t('Available')}: {parseFloat(availableBalance).toFixed(2)} USDC
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
                    <Typography variant="subtitle2">USDC</Typography>
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

        {/* Estimated Earnings (for deposit) */}
        {mode === 'deposit' && amount && parseFloat(amount) > 0 && vaultInfo && (
          <Box sx={{ px: 1 }}>
            <Typography variant="caption" color="text.secondary">
              {t('Estimated yearly earnings')}: $
              {((parseFloat(amount) * vaultInfo.apy) / 100).toFixed(2)} USDC
            </Typography>
          </Box>
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
              loading || isInsufficientBalance || !amount || parseFloat(amount) <= 0
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
    </Card>
  );
};

export default SavingsCard;
