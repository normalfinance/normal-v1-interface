'use client';

import type { VaultInfo, SavingsPosition } from '@/types/savings';
import type { SnackbarMessage, OptionsObject } from 'notistack';
import type { Dispatch, SetStateAction } from 'react';

import { useState, useEffect, useCallback } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { useTranslate } from '@/locales';
import { usePersistStore } from '@normalfinance/state';
import { constants } from '@normalfinance/utils';
import { Horizon, TransactionBuilder } from '@stellar/stellar-sdk';

import { useSnackbar } from '@/components/template/snackbar';
import { createStellarExpertUrl } from '@/utils/transactions.utils';
import { normalizeSignedXDR } from '@/utils/normalize-signed-xdr';

import { useNormalWallet } from './use-normal-wallet';
import { useStellarWalletsKit } from './use-stellar-wallets-kit';

// ----------------------------------------------------------------------

interface UseDefindexSavingsReturn {
  error: string | null;
  setError: Dispatch<SetStateAction<string | null>>;
  loading: boolean;
  vaultInfo: VaultInfo | null;
  userPosition: SavingsPosition | null;
  needsTrustline: boolean;
  setNeedsTrustline: Dispatch<SetStateAction<boolean>>;
  deposit: (amount: string) => Promise<string>;
  withdraw: (amount: string) => Promise<string>;
  refreshVaultInfo: () => Promise<void>;
}

function enqueueSuccessWithStellarExpert(
  enqueueSnackbar: (message: SnackbarMessage, options?: OptionsObject) => string | number | null,
  t: ReturnType<typeof useTranslate>['t'],
  successMessage: string,
  txHash: string
) {
  const stellarExpertUrl = createStellarExpertUrl('tx', txHash);
  enqueueSnackbar(
    <Box component="span">
      {successMessage}{' '}
      <Button
        size="small"
        onClick={() => window.open(stellarExpertUrl, '_blank', 'noopener,noreferrer')}
        sx={{
          textTransform: 'none',
          minWidth: 'auto',
          p: 0,
          textDecoration: 'underline',
          '&:hover': {
            textDecoration: 'underline',
            backgroundColor: 'transparent',
          },
        }}
      >
        {t('View More')}
      </Button>
    </Box>,
    {
      variant: 'success',
      persist: false,
      autoHideDuration: 7500,
    }
  );
}

// ----------------------------------------------------------------------

export function useDefindexSavings(): UseDefindexSavingsReturn {
  const { t } = useTranslate();
  const { enqueueSnackbar } = useSnackbar();
  const { wallet } = usePersistStore();

  const { signTransaction: signStellarWalletKit, publicKey: stellarPublicKey } =
    useStellarWalletsKit();
  const { signTransaction: signNormalWallet, publicKey: normalPublicKey } = useNormalWallet();

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [needsTrustline, setNeedsTrustline] = useState(false);
  const [vaultInfo, setVaultInfo] = useState<VaultInfo | null>(null);
  const [userPosition, setUserPosition] = useState<SavingsPosition | null>(null);

  // Fetch vault info
  const refreshVaultInfo = useCallback(async () => {
    try {
      setError(null);

      const userParam = wallet.address ? `?user=${wallet.address}` : '';
      const response = await fetch(`/api/savings/vault-info${userParam}`);
      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Failed to fetch vault info');
        return;
      }

      setVaultInfo(data.vault);
      if (data.userPosition) {
        setUserPosition(data.userPosition);
      }
    } catch (err: any) {
      console.error('Error fetching vault info:', err);
      setError(err.message || 'Failed to fetch vault info');
    }
  }, [wallet.address]);

  // Fetch vault info on mount and when wallet changes
  useEffect(() => {
    refreshVaultInfo();
  }, [refreshVaultInfo]);

  // Deposit to vault
  const deposit = useCallback(
    async (amount: string): Promise<string> => {
      if (!wallet.address) {
        enqueueSnackbar(t('Please connect your wallet first'), { variant: 'error' });
        return '';
      }

      if (!vaultInfo?.address) {
        enqueueSnackbar(t('Vault not configured'), { variant: 'error' });
        return '';
      }

      try {
        setLoading(true);
        setError(null);
        setNeedsTrustline(false);

        const walletType = wallet.walletType;
        const isNormalWallet = walletType === 'normal-wallet';
        const walletAddress = isNormalWallet
          ? normalPublicKey || wallet.address
          : stellarPublicKey || wallet.address;
        const signTransaction = isNormalWallet ? signNormalWallet : signStellarWalletKit;

        // 1. Build deposit XDR via API
        const response = await fetch('/api/savings/deposit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount, caller: walletAddress }),
        });

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Failed to build deposit transaction');
        }

        if (!data.xdr) {
          throw new Error('No transaction XDR returned from DeFindex');
        }

        // 2. Sign the XDR with the user's wallet
        const signResult = isNormalWallet
          ? await signTransaction(data.xdr, constants.StellarConfig.NETWORK_PASSPHRASE)
          : await signTransaction(data.xdr);

        const signedXDR = normalizeSignedXDR(signResult);

        if (!signedXDR) {
          throw new Error('Transaction signing failed — no signed XDR returned');
        }

        // 3. Submit signed transaction to Horizon
        const horizonServer = new Horizon.Server(constants.StellarConfig.HORIZON_URL, {
          allowHttp: constants.StellarConfig.HORIZON_URL.startsWith('http://'),
        });

        const signedTx = TransactionBuilder.fromXDR(
          signedXDR,
          constants.StellarConfig.NETWORK_PASSPHRASE
        );

        const result = await horizonServer.submitTransaction(signedTx);

        // Log deposit to DB (fire-and-forget)
        fetch('/api/savings/log-transaction', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            walletAddress: walletAddress,
            vaultAddress: vaultInfo.address,
            type: 'deposit',
            amount,
            txHash: result.hash,
          }),
        }).catch(console.error);

        enqueueSuccessWithStellarExpert(enqueueSnackbar, t, t('Deposit successful!'), result.hash);

        // 4. Refresh vault info to show updated balance
        await refreshVaultInfo();

        return result.hash;
      } catch (err: any) {
        console.error('Error depositing:', err);
        const errorMessage = err.message || 'Deposit failed';
        if (errorMessage.toLowerCase().includes('trustline')) {
          setNeedsTrustline(true);
        }
        setError(errorMessage);
        enqueueSnackbar(errorMessage, { variant: 'error' });
        return '';
      } finally {
        setLoading(false);
      }
    },
    [
      wallet.address,
      wallet.walletType,
      vaultInfo,
      normalPublicKey,
      stellarPublicKey,
      signNormalWallet,
      signStellarWalletKit,
      enqueueSnackbar,
      t,
      refreshVaultInfo,
    ]
  );

  // Withdraw from vault
  const withdraw = useCallback(
    async (amount: string): Promise<string> => {
      if (!wallet.address) {
        enqueueSnackbar(t('Please connect your wallet first'), { variant: 'error' });
        return '';
      }

      if (!vaultInfo?.address) {
        enqueueSnackbar(t('Vault not configured'), { variant: 'error' });
        return '';
      }

      try {
        setLoading(true);
        setError(null);

        const walletType = wallet.walletType;
        const isNormalWallet = walletType === 'normal-wallet';
        const walletAddress = isNormalWallet
          ? normalPublicKey || wallet.address
          : stellarPublicKey || wallet.address;
        const signTransaction = isNormalWallet ? signNormalWallet : signStellarWalletKit;

        // 1. Build withdraw XDR via API
        const response = await fetch('/api/savings/withdraw', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount, caller: walletAddress }),
        });

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Failed to build withdraw transaction');
        }

        if (!data.xdr) {
          throw new Error('No transaction XDR returned from DeFindex');
        }

        // 2. Sign the XDR with the user's wallet
        const signResult = isNormalWallet
          ? await signTransaction(data.xdr, constants.StellarConfig.NETWORK_PASSPHRASE)
          : await signTransaction(data.xdr);

        const signedXDR = normalizeSignedXDR(signResult);

        if (!signedXDR) {
          throw new Error('Transaction signing failed — no signed XDR returned');
        }

        // 3. Submit signed transaction to Horizon
        const horizonServer = new Horizon.Server(constants.StellarConfig.HORIZON_URL, {
          allowHttp: constants.StellarConfig.HORIZON_URL.startsWith('http://'),
        });

        const signedTx = TransactionBuilder.fromXDR(
          signedXDR,
          constants.StellarConfig.NETWORK_PASSPHRASE
        );

        const result = await horizonServer.submitTransaction(signedTx);

        // Log withdrawal to DB (fire-and-forget)
        fetch('/api/savings/log-transaction', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            walletAddress: walletAddress,
            vaultAddress: vaultInfo.address,
            type: 'withdraw',
            amount,
            txHash: result.hash,
          }),
        }).catch(console.error);

        enqueueSuccessWithStellarExpert(
          enqueueSnackbar,
          t,
          t('Withdrawal successful!'),
          result.hash
        );

        // 4. Refresh vault info to show updated balance
        await refreshVaultInfo();

        return result.hash;
      } catch (err: any) {
        console.error('Error withdrawing:', err);
        const errorMessage = err.message || 'Withdraw failed';
        setError(errorMessage);
        enqueueSnackbar(errorMessage, { variant: 'error' });
        return '';
      } finally {
        setLoading(false);
      }
    },
    [
      wallet.address,
      wallet.walletType,
      vaultInfo,
      normalPublicKey,
      stellarPublicKey,
      signNormalWallet,
      signStellarWalletKit,
      enqueueSnackbar,
      t,
      refreshVaultInfo,
    ]
  );

  return {
    error,
    setError,
    loading,
    vaultInfo,
    userPosition,
    needsTrustline,
    setNeedsTrustline,
    deposit,
    withdraw,
    refreshVaultInfo,
  };
}
