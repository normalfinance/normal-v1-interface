'use client';

import { useTranslate } from '@/locales';
import { useStellarConfig } from '@/hooks';
import React, { useState, useEffect } from 'react';
import { checkTrustline } from '@normalfinance/utils';
import { useTrustLine } from '@/hooks/stellar/tokens/use-trustline';
import { useAccountStatus } from '@/hooks/stellar/use-account-status';

import { Button, Typography, CircularProgress } from '@mui/material';

import { Iconify } from '@/components/template/iconify';
import { useSnackbar } from '@/components/template/snackbar';

// ----------------------------------------------------------------------

interface AddUsdcTrustlineButtonProps {
  walletAddress: string;
  assetIssuer: string | undefined;
  label: string;
  loadingLabel: string;
  successMessage: string;
  errorFallback: string;
  showInactiveAccountHelper?: boolean;
}

// ----------------------------------------------------------------------

export default function AddUsdcTrustlineButton({
  walletAddress,
  assetIssuer,
  label,
  loadingLabel,
  successMessage,
  errorFallback,
  showInactiveAccountHelper = true,
}: AddUsdcTrustlineButtonProps) {
  const { t } = useTranslate();
  const config = useStellarConfig();
  const { enqueueSnackbar } = useSnackbar();
  const { addTrustLine, loading } = useTrustLine();
  const { isLoading: isCheckingAccount, accountExists } = useAccountStatus(walletAddress);
  const [hasTrustline, setHasTrustline] = useState<boolean | null>(null);

  useEffect(() => {
    if (!assetIssuer || !walletAddress) return undefined;

    if (isCheckingAccount) {
      setHasTrustline(null);
      return undefined;
    }

    if (!accountExists) {
      setHasTrustline(false);
      return undefined;
    }

    let isMounted = true;

    checkTrustline(walletAddress, 'USDC', assetIssuer, config)
      .then((result) => {
        if (isMounted) {
          setHasTrustline(result.exists);
        }
      })
      .catch(() => {
        if (isMounted) {
          setHasTrustline(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [walletAddress, assetIssuer, config, accountExists, isCheckingAccount]);

  if (!assetIssuer || hasTrustline === true) return null;

  if (!isCheckingAccount && !accountExists) {
    if (!showInactiveAccountHelper) {
      return null;
    }

    return (
      <Typography variant="caption" color="text.secondary">
        {t(
          'Fund this account with at least 1 XLM to activate Stellar before adding a USDC trustline.'
        )}
      </Typography>
    );
  }

  const handleClick = async () => {
    try {
      await addTrustLine('USDC', assetIssuer);
      setHasTrustline(true);
      enqueueSnackbar(successMessage, { variant: 'success' });
    } catch (e: any) {
      enqueueSnackbar(e?.message || errorFallback, { variant: 'error' });
    }
  };

  return (
    <Button
      variant="soft"
      color="primary"
      size="small"
      disabled={loading || hasTrustline === null || isCheckingAccount}
      startIcon={
        loading ? (
          <CircularProgress size={16} color="inherit" />
        ) : (
          <Iconify icon="solar:add-circle-bold" />
        )
      }
      onClick={handleClick}
    >
      {loading ? loadingLabel : label}
    </Button>
  );
}
