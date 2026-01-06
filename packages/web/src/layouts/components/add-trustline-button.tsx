import type { ButtonProps } from '@mui/material';

// src/components/account/AddUsdcTrustlineButton.tsx
import React, { useState } from 'react';
import { useSnackbar } from 'notistack';
import { usePersistStore } from '@normalfinance/state';
import { addUSDCTrustline, hasUSDCTrustline } from '@/lib/mgi/trustlines';
import { detectWalletEnv, assertTestnetAndAccountMatch } from '@/lib/mgi/preflight';

import { Button } from '@mui/material';

type Props = {
  /** Forwarded to inner Button */
  fullWidth?: boolean;
  size?: ButtonProps['size'];
  variant?: ButtonProps['variant'];
  sx?: ButtonProps['sx'];
};

export default function AddUsdcTrustlineButton({
  fullWidth = true,
  size = 'large',
  variant = 'outlined',
  sx,
}: Props) {
  const { enqueueSnackbar } = useSnackbar();
  const state = usePersistStore();
  const userAddress = state.wallet.address as string | undefined;

  const [loading, setLoading] = useState(false);
  const disabled = !userAddress || loading;

  const handleClick = async () => {
    if (!userAddress) {
      enqueueSnackbar('Connect your wallet to continue', { variant: 'warning' });
      return;
    }
    setLoading(true);
    try {
      const env = await detectWalletEnv();
      assertTestnetAndAccountMatch(env, userAddress);

      if (await hasUSDCTrustline(userAddress)) {
        enqueueSnackbar('USDC trustline already exists', { variant: 'info' });
        return;
      }

      const res = await addUSDCTrustline(userAddress);
      if (res.alreadyTrusted) {
        enqueueSnackbar('USDC trustline already exists', { variant: 'info' });
        return;
      }

      enqueueSnackbar('USDC trustline added!', { variant: 'success' });
    } catch (e: any) {
      enqueueSnackbar(e?.message || 'Failed to add USDC trustline', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      fullWidth={fullWidth}
      size={size}
      variant={variant}
      onClick={handleClick}
      disabled={disabled}
      sx={{ borderRadius: 2, height: '100%', textTransform: 'none', ...sx }}
    >
      {loading ? 'Adding trustline…' : 'Add USDC trustline'}
    </Button>
  );
}
