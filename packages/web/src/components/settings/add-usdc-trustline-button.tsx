'use client';

import React, { useState, useEffect } from 'react';
import { checkTrustline } from '@normalfinance/utils';

import { Button, CircularProgress } from '@mui/material';

import { Iconify } from '@/components/template/iconify';
import { useSnackbar } from '@/components/template/snackbar';
import { useStellarConfig } from '@/hooks';
import { useTrustLine } from '@/hooks/stellar/tokens/use-trustline';

// ----------------------------------------------------------------------

interface AddUsdcTrustlineButtonProps {
  walletAddress: string;
  assetIssuer: string | undefined;
  label: string;
  loadingLabel: string;
  successMessage: string;
  errorFallback: string;
}

// ----------------------------------------------------------------------

export default function AddUsdcTrustlineButton({
  walletAddress,
  assetIssuer,
  label,
  loadingLabel,
  successMessage,
  errorFallback,
}: AddUsdcTrustlineButtonProps) {
  const config = useStellarConfig();
  const { enqueueSnackbar } = useSnackbar();
  const { addTrustLine, loading } = useTrustLine();
  const [hasTrustline, setHasTrustline] = useState<boolean | null>(null);

  useEffect(() => {
    if (!assetIssuer || !walletAddress) return;

    checkTrustline(walletAddress, 'USDC', assetIssuer, config)
      .then((result) => setHasTrustline(result.exists))
      .catch(() => setHasTrustline(false));
  }, [walletAddress, assetIssuer, config]);

  if (!assetIssuer || hasTrustline === true) return null;

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
      disabled={loading || hasTrustline === null}
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
