import React, { useState } from 'react';
import { Button } from '@mui/material';
import { useSnackbar } from 'notistack';
import { addUSDCTrustline, hasUSDCTrustline } from '@/lib/mgi/trustlines';
import { usePersistStore } from '@normalfinance/state';
import { detectWalletEnv, assertTestnetAndAccountMatch } from '@/lib/mgi/preflight';

export default function AddUsdcTrustlineButton() {
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
      variant="outlined"
      onClick={handleClick}
      disabled={disabled}
      sx={{ textTransform: 'none' }}
    >
      {loading ? 'Adding trustline…' : 'Add USDC trustline'}
    </Button>
  );
}
