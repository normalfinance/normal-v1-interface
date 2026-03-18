'use client';

import type { VaultInfo, SavingsPosition } from '@/types/savings';
import type { Dispatch, SetStateAction } from 'react';

import { useState, useEffect, useCallback } from 'react';
import { useTranslate } from '@/locales';
import { usePersistStore } from '@normalfinance/state';
import { constants } from '@normalfinance/utils';
import { Horizon, TransactionBuilder } from '@stellar/stellar-sdk';

import { useSnackbar } from '@/components/template/snackbar';

import { useNormalWallet } from './use-normal-wallet';
import { useStellarWalletsKit } from './use-stellar-wallets-kit';

// ----------------------------------------------------------------------

interface UseDefindexSavingsReturn {
  error: string | null;
  setError: Dispatch<SetStateAction<string | null>>;
  loading: boolean;
  vaultInfo: VaultInfo | null;
  userPosition: SavingsPosition | null;
  deposit: (amount: string) => Promise<string>;
  withdraw: (amount: string) => Promise<string>;
  refreshVaultInfo: () => Promise<void>;
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

        // TODO: Implement actual DeFindex deposit
        // For now, show a message that this feature is coming soon
        enqueueSnackbar(t('Deposit feature coming soon!'), { variant: 'info' });

        return '';
      } catch (err: any) {
        console.error('Error depositing:', err);
        const errorMessage = err.message || 'Deposit failed';
        setError(errorMessage);
        enqueueSnackbar(errorMessage, { variant: 'error' });
        return '';
      } finally {
        setLoading(false);
      }
    },
    [wallet.address, vaultInfo, enqueueSnackbar, t]
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

        // TODO: Implement actual DeFindex withdraw
        // For now, show a message that this feature is coming soon
        enqueueSnackbar(t('Withdraw feature coming soon!'), { variant: 'info' });

        return '';
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
    [wallet.address, vaultInfo, enqueueSnackbar, t]
  );

  return {
    error,
    setError,
    loading,
    vaultInfo,
    userPosition,
    deposit,
    withdraw,
    refreshVaultInfo,
  };
}
