'use client';

import type { SwapQuote, SwapMode } from '@/types/swap';
import type { Dispatch, SetStateAction } from 'react';

import { useState, useCallback } from 'react';
import { useTranslate } from '@/locales';
import { usePersistStore } from '@normalfinance/state';
import { constants } from '@normalfinance/utils';
import { Horizon, TransactionBuilder } from '@stellar/stellar-sdk';

import { useSnackbar } from '@/components/template/snackbar';

import { useNormalWallet } from './use-normal-wallet';
import { useStellarWalletsKit } from './use-stellar-wallets-kit';

// ----------------------------------------------------------------------

interface UseAquaSwapReturn {
  error: string | null;
  setError: Dispatch<SetStateAction<string | null>>;
  loading: boolean;
  quoteLoading: boolean;
  quote: SwapQuote | null;
  getQuote: (
    tokenIn: string,
    tokenOut: string,
    amount: string,
    mode?: SwapMode
  ) => Promise<SwapQuote | null>;
  executeSwap: (quote: SwapQuote) => Promise<string>;
  clearQuote: () => void;
}

// Slippage tolerance (1%)
const SLIPPAGE_TOLERANCE = 0.01;

// ----------------------------------------------------------------------

export function useAquaSwap(): UseAquaSwapReturn {
  const { t } = useTranslate();
  const { enqueueSnackbar } = useSnackbar();
  const { wallet } = usePersistStore();

  const { signTransaction: signStellarWalletKit, publicKey: stellarPublicKey } =
    useStellarWalletsKit();
  const { signTransaction: signNormalWallet, publicKey: normalPublicKey } = useNormalWallet();

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quote, setQuote] = useState<SwapQuote | null>(null);

  const getQuote = useCallback(
    async (
      tokenIn: string,
      tokenOut: string,
      amount: string,
      mode: SwapMode = 'strict-send'
    ): Promise<SwapQuote | null> => {
      if (!amount || parseFloat(amount) <= 0) {
        setQuote(null);
        return null;
      }

      try {
        setQuoteLoading(true);
        setError(null);

        // Convert amount to stroops (7 decimals)
        const amountInStroops = Math.floor(parseFloat(amount) * 10_000_000).toString();

        const response = await fetch('/api/swap/quote', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token_in_address: tokenIn,
            token_out_address: tokenOut,
            amount: amountInStroops,
            mode,
          }),
        });

        const data = await response.json();

        if (!data.success) {
          setError(data.error || 'Failed to get quote');
          setQuote(null);
          return null;
        }

        // Convert amounts back from stroops
        const amountOut = (parseInt(data.amount_out, 10) / 10_000_000).toString();
        const minAmountOut = (
          (parseInt(data.amount_out, 10) * (1 - SLIPPAGE_TOLERANCE)) /
          10_000_000
        ).toString();

        const newQuote: SwapQuote = {
          path: data.path,
          amountIn: amount,
          amountOut,
          estimatedAmountOut: amountOut,
          priceImpact: 0, // TODO: Calculate price impact
          fee: '0', // TODO: Calculate fee
          xdr: data.xdr,
        };

        setQuote(newQuote);
        return newQuote;
      } catch (err: any) {
        console.error('Error getting swap quote:', err);
        setError(err.message || 'Failed to get quote');
        setQuote(null);
        return null;
      } finally {
        setQuoteLoading(false);
      }
    },
    []
  );

  const executeSwap = useCallback(
    async (swapQuote: SwapQuote): Promise<string> => {
      if (!wallet.address) {
        enqueueSnackbar(t('Please connect your wallet first'), { variant: 'error' });
        return '';
      }

      if (!swapQuote.xdr) {
        enqueueSnackbar(t('Invalid swap quote'), { variant: 'error' });
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

        // Sign the XDR from Aqua
        const signedXDR = isNormalWallet
          ? await signTransaction(swapQuote.xdr, constants.StellarConfig.NETWORK_PASSPHRASE)
          : await signTransaction(swapQuote.xdr);

        if (!signedXDR) {
          enqueueSnackbar(t('Transaction signing cancelled'), { variant: 'warning' });
          return '';
        }

        // Submit to Horizon
        const horizonServer = new Horizon.Server(constants.StellarConfig.HORIZON_URL, {
          allowHttp: constants.StellarConfig.HORIZON_URL.startsWith('http://'),
        });

        const transaction = TransactionBuilder.fromXDR(
          signedXDR,
          constants.StellarConfig.NETWORK_PASSPHRASE
        );

        const result = await horizonServer.submitTransaction(transaction);

        enqueueSnackbar(t('Swap successful!'), { variant: 'success' });
        setQuote(null);
        return result.hash;
      } catch (err: any) {
        console.error('Error executing swap:', err);
        const errorMessage = err.message || 'Swap failed';
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
      normalPublicKey,
      stellarPublicKey,
      signNormalWallet,
      signStellarWalletKit,
      enqueueSnackbar,
      t,
    ]
  );

  const clearQuote = useCallback(() => {
    setQuote(null);
    setError(null);
  }, []);

  return {
    error,
    setError,
    loading,
    quoteLoading,
    quote,
    getQuote,
    executeSwap,
    clearQuote,
  };
}
