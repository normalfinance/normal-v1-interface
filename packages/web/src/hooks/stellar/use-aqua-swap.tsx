'use client';

import type { SwapQuote, SwapMode, SwapDisplayMeta } from '@/types/swap';
import type { Dispatch, SetStateAction } from 'react';

import { useState, useCallback } from 'react';
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
  executeSwap: (quote: SwapQuote, display?: SwapDisplayMeta) => Promise<string>;
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
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token_in_address: tokenIn,
            token_out_address: tokenOut,
            amount: amountInStroops,
            mode,
            // No sender here — quote is just for display
          }),
        });

        const data = await response.json();

        if (!data.success) {
          setError(data.error || 'Failed to get quote');
          setQuote(null);
          return null;
        }

        // Convert amounts back from stroops
        const amountOutRaw = parseInt(data.amount_out, 10);
        const amountOut = (amountOutRaw / 10_000_000).toFixed(7);
        const minAmountOut = ((amountOutRaw * (1 - SLIPPAGE_TOLERANCE)) / 10_000_000).toFixed(7);

        const newQuote: SwapQuote = {
          path: data.path || [],
          tokenIn,
          tokenOut,
          amountIn: parseFloat(amount).toFixed(7),
          amountOut,
          estimatedAmountOut: amountOut,
          minAmountOut,
          priceImpact: 0,
          fee: '0',
          xdr: data.xdr || '',
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
    async (swapQuote: SwapQuote, display?: SwapDisplayMeta): Promise<string> => {
      if (!wallet.address) {
        enqueueSnackbar(t('Please connect your wallet first'), { variant: 'error' });
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

        // Re-fetch the quote with sender so Aqua builds the Soroban router XDR
        // with the correct source account and a fresh sequence number
        const amountInStroops = Math.floor(parseFloat(swapQuote.amountIn) * 10_000_000).toString();

        const quoteResponse = await fetch('/api/swap/quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token_in_address: swapQuote.tokenIn,
            token_out_address: swapQuote.tokenOut,
            amount: amountInStroops,
            sender: walletAddress,
          }),
        });

        const quoteData = await quoteResponse.json();

        if (!quoteData.success) {
          throw new Error(quoteData.error || 'Failed to build swap transaction');
        }

        if (!quoteData.xdr) {
          throw new Error(
            'Aqua did not return a transaction. Ensure NEXT_PUBLIC_{TESTNET|MAINNET}_AQUA_API_BASE_URL is set correctly.'
          );
        }

        // Sign the Soroban router XDR built by Aqua
        const signResult = isNormalWallet
          ? await signTransaction(quoteData.xdr, constants.StellarConfig.NETWORK_PASSPHRASE)
          : await signTransaction(quoteData.xdr);

        // Normalize — wallet kits return different shapes ({ signedXDR } vs plain string)
        const signedXDR = normalizeSignedXDR(signResult);

        if (!signedXDR) {
          throw new Error('Transaction signing failed — no signed XDR returned');
        }

        // Submit to Horizon
        const horizonServer = new Horizon.Server(constants.StellarConfig.HORIZON_URL, {
          allowHttp: constants.StellarConfig.HORIZON_URL.startsWith('http://'),
        });

        const signedTx = TransactionBuilder.fromXDR(
          signedXDR,
          constants.StellarConfig.NETWORK_PASSPHRASE
        );

        const result = await horizonServer.submitTransaction(signedTx);

        fetch('/api/swap/log-transaction', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            walletAddress,
            tokenInAddress: swapQuote.tokenIn,
            tokenOutAddress: swapQuote.tokenOut,
            tokenInSymbol: display?.tokenInSymbol,
            tokenOutSymbol: display?.tokenOutSymbol,
            amountIn: swapQuote.amountIn,
            amountOut: swapQuote.amountOut,
            txHash: result.hash,
          }),
        }).catch(console.error);

        const stellarExpertUrl = createStellarExpertUrl('tx', result.hash);

        enqueueSnackbar(
          <Box component="span">
            {t('Swap successful!')}{' '}
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
