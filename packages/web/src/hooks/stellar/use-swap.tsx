'use client';

import type { Dispatch, SetStateAction } from 'react';
import type { SwapMode, SwapQuote, SwapDisplayMeta } from '@/types/swap';

import { useTranslate } from '@/locales';
import { useState, useCallback } from 'react';
import { usePersistStore } from '@normalfinance/state';
import { useStellarConfig } from '@/hooks';
import { getSwapFeeAmount } from '@/utils/normal-fees';
import { normalizeSignedXDR } from '@/utils/normalize-signed-xdr';
import { Horizon, TransactionBuilder } from '@stellar/stellar-sdk';
import { createStellarExpertUrl } from '@/utils/transactions.utils';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';

import { useSnackbar } from '@/components/template/snackbar';

import { useNormalWallet } from './use-normal-wallet';
import { useStellarWalletsKit } from './use-stellar-wallets-kit';

// ----------------------------------------------------------------------

interface UseSwapReturn {
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

// ----------------------------------------------------------------------

export function useSwap(): UseSwapReturn {
  const { t } = useTranslate();
  const { enqueueSnackbar } = useSnackbar();
  const { wallet } = usePersistStore();
  const config = useStellarConfig();

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
      const parsedAmount = parseFloat(amount);
      if (!amount || parsedAmount <= 0) {
        setQuote(null);
        return null;
      }

      try {
        setQuoteLoading(true);
        setError(null);

        // Deduct the 0.5% Normal fee up-front and route the NET amount
        // through Soroswap so the displayed amountOut reflects reality.
        const feeAmount = getSwapFeeAmount(parsedAmount);
        const netAmountIn = parsedAmount - feeAmount;
        const amountInStroops = Math.floor(netAmountIn * 10_000_000).toString();

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
        const amountOut = (parseInt(data.amount_out, 10) / 10_000_000).toFixed(7);
        const minAmountOut = (parseInt(data.min_amount_out || '0', 10) / 10_000_000).toFixed(7);

        const newQuote: SwapQuote = {
          path: data.path || [],
          tokenIn,
          tokenOut,
          amountIn: parsedAmount.toFixed(7),
          amountOut,
          estimatedAmountOut: amountOut,
          minAmountOut,
          priceImpact: 0,
          fee: feeAmount.toFixed(7),
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

        const horizonServer = new Horizon.Server(config.HORIZON_URL, {
          allowHttp: config.HORIZON_URL.startsWith('http://'),
        });

        const signAndSubmit = async (xdr: string) => {
          const signResult = isNormalWallet
            ? await signTransaction(xdr, config.NETWORK_PASSPHRASE)
            : await signTransaction(xdr);
          const signed = normalizeSignedXDR(signResult);
          if (!signed) throw new Error('Transaction signing failed — no signed XDR returned');
          const signedTx = TransactionBuilder.fromXDR(
            signed,
            config.NETWORK_PASSPHRASE
          );
          return horizonServer.submitTransaction(signedTx);
        };

        // Resolve the fee asset from the swap quote's tokenIn contract address
        const xlmAddress = config.XLM_ADDRESS;
        const usdcAddress = config.USDC_ADDRESS;
        let feeAssetCode: 'XLM' | 'USDC' | null = null;
        if (swapQuote.tokenIn === xlmAddress || swapQuote.tokenIn === 'native') {
          feeAssetCode = 'XLM';
        } else if (swapQuote.tokenIn === usdcAddress) {
          feeAssetCode = 'USDC';
        } else if (display?.tokenInSymbol === 'XLM' || display?.tokenInSymbol === 'USDC') {
          feeAssetCode = display.tokenInSymbol as 'XLM' | 'USDC';
        }
        if (!feeAssetCode) {
          throw new Error(
            'Unable to determine fee asset for this swap. Only XLM and USDC are supported.'
          );
        }

        const feeAmount = parseFloat(swapQuote.fee || '0');
        if (feeAmount <= 0) {
          throw new Error('Swap fee was not computed — please refresh the quote');
        }

        // 1. Build + sign + submit the Normal fee payment first
        const feeResponse = await fetch('/api/fees/build-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            caller: walletAddress,
            amount: feeAmount.toFixed(7),
            assetCode: feeAssetCode,
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
              : 'Fee payment failed — swap not submitted'
          );
        }

        // 2. Re-fetch the Soroswap quote with sender and NET amount (fresh seq)
        const netAmountIn = parseFloat(swapQuote.amountIn) - feeAmount;
        const amountInStroops = Math.floor(netAmountIn * 10_000_000).toString();

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
          throw new Error(
            `${quoteData.error || 'Failed to build swap transaction'} (Normal fee already charged — tx ${feeResult.hash})`
          );
        }

        if (!quoteData.xdr) {
          throw new Error(
            'Swap aggregator did not return a transaction. Ensure SOROSWAP_API_KEY is set on the server.'
          );
        }

        // 3. Sign + submit the Soroban swap
        let result: Awaited<ReturnType<Horizon.Server['submitTransaction']>>;
        try {
          result = await signAndSubmit(quoteData.xdr);
        } catch (swapErr: any) {
          throw new Error(
            swapErr?.message
              ? `${swapErr.message} (Normal fee already charged — tx ${feeResult.hash})`
              : 'Swap failed after fee was charged'
          );
        }

        fetch('/api/swap/log-transaction', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            walletAddress,
            tokenInAddress: swapQuote.tokenIn,
            tokenOutAddress: swapQuote.tokenOut,
            tokenInSymbol: display?.tokenInSymbol,
            tokenOutSymbol: display?.tokenOutSymbol,
            amountIn: netAmountIn.toFixed(7),
            amountOut: swapQuote.amountOut,
            txHash: result.hash,
            feeAmount: feeAmount.toFixed(7),
            feeTxHash: feeResult.hash,
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
      config,
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
