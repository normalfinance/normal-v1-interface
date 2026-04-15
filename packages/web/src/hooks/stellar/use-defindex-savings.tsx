'use client';

import type { Dispatch, SetStateAction } from 'react';
import type { OptionsObject, SnackbarMessage } from 'notistack';
import type { VaultInfo, SavingsPosition } from '@/types/savings';

import { useTranslate } from '@/locales';
import { constants } from '@normalfinance/utils';
import { usePersistStore } from '@normalfinance/state';
import { useState, useEffect, useCallback } from 'react';
import { normalizeSignedXDR } from '@/utils/normalize-signed-xdr';
import { Horizon, TransactionBuilder } from '@stellar/stellar-sdk';
import { createStellarExpertUrl } from '@/utils/transactions.utils';
import { getYieldCommission, getSavingsDepositFee } from '@/utils/normal-fees';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';

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

  // Deposit to vault — two transactions: (1) classic USDC fee payment,
  // (2) DeFindex deposit for the net amount. Fee goes first so if the
  // Soroban deposit fails the user only loses the small flat fee.
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

      const parsedAmount = parseFloat(amount);
      if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        enqueueSnackbar(t('Enter a valid amount'), { variant: 'error' });
        return '';
      }

      const feeAmount = getSavingsDepositFee(parsedAmount);
      if (parsedAmount <= feeAmount) {
        const msg = t('Deposit must exceed the Normal fee of ${{fee}}', {
          fee: feeAmount.toFixed(2),
        });
        setError(msg);
        enqueueSnackbar(msg, { variant: 'error' });
        return '';
      }

      const netAmount = +(parsedAmount - feeAmount).toFixed(7);

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

        const horizonServer = new Horizon.Server(constants.StellarConfig.HORIZON_URL, {
          allowHttp: constants.StellarConfig.HORIZON_URL.startsWith('http://'),
        });

        const signAndSubmit = async (xdr: string) => {
          const signResult = isNormalWallet
            ? await signTransaction(xdr, constants.StellarConfig.NETWORK_PASSPHRASE)
            : await signTransaction(xdr);
          const signedXDR = normalizeSignedXDR(signResult);
          if (!signedXDR) throw new Error('Transaction signing failed — no signed XDR returned');
          const signedTx = TransactionBuilder.fromXDR(
            signedXDR,
            constants.StellarConfig.NETWORK_PASSPHRASE
          );
          return horizonServer.submitTransaction(signedTx);
        };

        // 1. Build + sign + submit the Normal fee payment first
        const feeResponse = await fetch('/api/fees/build-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            caller: walletAddress,
            amount: feeAmount.toFixed(7),
            assetCode: 'USDC',
          }),
        });
        const feeData = await feeResponse.json();
        if (!feeData.success || !feeData.xdr) {
          throw new Error(feeData.error || 'Failed to build Normal fee transaction');
        }

        let feeResult: Awaited<ReturnType<Horizon.Server['submitTransaction']>>;
        try {
          feeResult = await signAndSubmit(feeData.xdr);
        } catch (feeErr: any) {
          throw new Error(
            feeErr?.message
              ? `Fee payment failed: ${feeErr.message}`
              : 'Fee payment failed — deposit not submitted'
          );
        }

        // 2. Build the DeFindex deposit XDR for the NET amount (fresh sequence)
        const depositResponse = await fetch('/api/savings/deposit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: netAmount.toFixed(7), caller: walletAddress }),
        });
        const depositData = await depositResponse.json();
        if (!depositData.success) {
          throw new Error(
            `${depositData.error || 'Failed to build deposit transaction'} (fee was already charged — please contact support with tx ${feeResult.hash})`
          );
        }
        if (!depositData.xdr) {
          throw new Error('No transaction XDR returned from DeFindex');
        }

        // 3. Sign + submit the deposit
        let depositResult: Awaited<ReturnType<Horizon.Server['submitTransaction']>>;
        try {
          depositResult = await signAndSubmit(depositData.xdr);
        } catch (depositErr: any) {
          throw new Error(
            depositErr?.message
              ? `${depositErr.message} (Normal fee already charged — tx ${feeResult.hash})`
              : 'Deposit failed after fee was charged'
          );
        }

        // Log deposit to DB (fire-and-forget)
        fetch('/api/savings/log-transaction', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            walletAddress,
            vaultAddress: vaultInfo.address,
            type: 'deposit',
            amount: netAmount.toFixed(7),
            txHash: depositResult.hash,
            feeAmount: feeAmount.toFixed(2),
            feeTxHash: feeResult.hash,
          }),
        }).catch(console.error);

        enqueueSuccessWithStellarExpert(
          enqueueSnackbar,
          t,
          t('Deposit successful!'),
          depositResult.hash
        );

        // 4. Refresh vault info to show updated balance
        await refreshVaultInfo();

        return depositResult.hash;
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

  // Withdraw from vault — two transactions: (1) DeFindex withdraw to the
  // user, (2) classic USDC payment for the 7% yield commission. Withdraw
  // goes first because the commission is paid FROM the withdrawn funds.
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

      const parsedAmount = parseFloat(amount);
      if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        enqueueSnackbar(t('Enter a valid amount'), { variant: 'error' });
        return '';
      }

      // Compute yield commission up-front from the current userPosition.
      const currentValue = parseFloat(userPosition?.currentValue || '0');
      const earnings = parseFloat(userPosition?.earnings || '0');
      const commissionAmount = getYieldCommission({
        withdrawAmount: parsedAmount,
        currentValue,
        earnings,
      });

      try {
        setLoading(true);
        setError(null);

        const walletType = wallet.walletType;
        const isNormalWallet = walletType === 'normal-wallet';
        const walletAddress = isNormalWallet
          ? normalPublicKey || wallet.address
          : stellarPublicKey || wallet.address;
        const signTransaction = isNormalWallet ? signNormalWallet : signStellarWalletKit;

        const horizonServer = new Horizon.Server(constants.StellarConfig.HORIZON_URL, {
          allowHttp: constants.StellarConfig.HORIZON_URL.startsWith('http://'),
        });

        const signAndSubmit = async (xdr: string) => {
          const signResult = isNormalWallet
            ? await signTransaction(xdr, constants.StellarConfig.NETWORK_PASSPHRASE)
            : await signTransaction(xdr);
          const signedXDR = normalizeSignedXDR(signResult);
          if (!signedXDR) throw new Error('Transaction signing failed — no signed XDR returned');
          const signedTx = TransactionBuilder.fromXDR(
            signedXDR,
            constants.StellarConfig.NETWORK_PASSPHRASE
          );
          return horizonServer.submitTransaction(signedTx);
        };

        // 1. Build + sign + submit the DeFindex withdraw
        const withdrawResponse = await fetch('/api/savings/withdraw', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount, caller: walletAddress }),
        });
        const withdrawData = await withdrawResponse.json();
        if (!withdrawData.success) {
          throw new Error(withdrawData.error || 'Failed to build withdraw transaction');
        }
        if (!withdrawData.xdr) {
          throw new Error('No transaction XDR returned from DeFindex');
        }

        const withdrawResult = await signAndSubmit(withdrawData.xdr);

        // 2. If there's a yield commission owed, build + sign + submit it
        let commissionTxHash: string | null = null;
        if (commissionAmount > 0) {
          try {
            const commissionResponse = await fetch('/api/fees/build-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                caller: walletAddress,
                amount: commissionAmount.toFixed(7),
                assetCode: 'USDC',
              }),
            });
            const commissionData = await commissionResponse.json();
            if (!commissionData.success || !commissionData.xdr) {
              throw new Error(commissionData.error || 'Failed to build commission transaction');
            }
            const commissionResult = await signAndSubmit(commissionData.xdr);
            commissionTxHash = commissionResult.hash;
          } catch (commissionErr: any) {
            // Withdraw already succeeded — surface commission failure but don't rethrow.
            console.error('Yield commission tx failed:', commissionErr);
            enqueueSnackbar(
              t('Withdrawal successful, but yield commission payment failed.'),
              { variant: 'warning' }
            );
          }
        }

        // Log withdrawal to DB (fire-and-forget)
        fetch('/api/savings/log-transaction', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            walletAddress,
            vaultAddress: vaultInfo.address,
            type: 'withdraw',
            amount,
            txHash: withdrawResult.hash,
            feeAmount: commissionAmount > 0 ? commissionAmount.toFixed(7) : null,
            feeTxHash: commissionTxHash,
          }),
        }).catch(console.error);

        enqueueSuccessWithStellarExpert(
          enqueueSnackbar,
          t,
          t('Withdrawal successful!'),
          withdrawResult.hash
        );

        await refreshVaultInfo();

        return withdrawResult.hash;
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
      userPosition,
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
