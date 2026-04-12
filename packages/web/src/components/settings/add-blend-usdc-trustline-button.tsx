'use client';

import React, { useState, useEffect } from 'react';
import { constants, checkTrustline } from '@normalfinance/utils';

import { Button, CircularProgress } from '@mui/material';

import { Iconify } from '@/components/template/iconify';
import { useSnackbar } from '@/components/template/snackbar';
import { useTrustLine } from '@/hooks/stellar/tokens/use-trustline';

// ----------------------------------------------------------------------

interface AddBlendUsdcTrustlineButtonProps {
  walletAddress: string;
}

// ----------------------------------------------------------------------

export default function AddBlendUsdcTrustlineButton({
  walletAddress,
}: AddBlendUsdcTrustlineButtonProps) {
  const { enqueueSnackbar } = useSnackbar();
  const { addTrustLine, loading } = useTrustLine();
  const [hasTrustline, setHasTrustline] = useState<boolean | null>(null);

  const blendUsdcIssuer = constants.StellarConfig.BLEND_USDC_ISSUER;

  useEffect(() => {
    if (!blendUsdcIssuer || !walletAddress) return;

    checkTrustline(walletAddress, 'USDC', blendUsdcIssuer)
      .then((result) => setHasTrustline(result.exists))
      .catch(() => setHasTrustline(false));
  }, [walletAddress, blendUsdcIssuer]);

  // Don't render if Blend USDC is not configured or trustline already exists
  if (!blendUsdcIssuer || hasTrustline === true) return null;

  const handleClick = async () => {
    try {
      await addTrustLine('USDC', blendUsdcIssuer);
      setHasTrustline(true);
      enqueueSnackbar('Blend USDC trustline added!', { variant: 'success' });
    } catch (e: any) {
      enqueueSnackbar(e?.message || 'Failed to add Blend USDC trustline', { variant: 'error' });
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
      {loading ? 'Adding trustline...' : 'Add Blend USDC Trustline'}
    </Button>
  );
}
