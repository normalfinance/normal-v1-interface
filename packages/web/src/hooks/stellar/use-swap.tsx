'use client';

import type { Dispatch, SetStateAction } from 'react';
import type { SwapMode, SwapQuote, SwapDisplayMeta } from '@/types/swap';

import { useTranslate } from '@/locales';
import { useStellarConfig } from '@/hooks';
import { useState, useCallback } from 'react';
import { buildAuthHeaders } from '@/utils/http';
import { usePersistStore } from '@normalfinance/state';
import { getSwapFeeAmount } from '@/utils/normal-fees';
import { normalizeSignedXDR } from '@/utils/normalize-signed-xdr';
import { FEE_PAIR_TIMEOUT_SECONDS } from '@/lib/build-fee-payment';
import { createStellarExpertUrl } from '@/utils/transactions.utils';
import { submitFeePair, getTransactionSequence } from '@/lib/stellar/fee-pair';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';

import { useSnackbar } from '@/components/template/snackbar';

import { useStellarWalletsKit } from './use-stellar-wallets-kit';
import { useWalletReconnect, WalletSessionExpiredError } from './use-wallet-reconnect';
import { useNormalWallet, NORMAL_WALLET_REIMPORT_REQUIRED_MESSAGE } from './use-normal-wallet';

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

/**
 * #32 chunk 4f: `targetAddress` retargets the whole swap — build, both
 * signatures, fee caller — to that wallet (the hybrid case: external wallet in
 * the slot, swap runs from the companion Normal wallet). Same contract as
 * `useDefindexSavings(targetAddress)`: the override is EXPLICIT, never a
 * silent fallback, and the universal signer routes by the tx's source account
 * (Turnkey-managed target → passkey prompt).
 */
export function useSwap(targetAddress?: string): UseSwapReturn {
  const { t } = useTranslate();
  const { enqueueSnackbar } = useSnackbar();
  const { wallet } = usePersistStore();
  const config = useStellarConfig();

  const { publicKey: stellarPublicKey } = useStellarWalletsKit();
  const { signOrReconnect } = useWalletReconnect();
  const {
    signTransaction: signNormalWallet,
    publicKey: normalPublicKey,
    canSign: normalCanSign,
  } = useNormalWallet();

  const connectedAddress =
    wallet.walletType === 'normal-wallet'
      ? normalPublicKey || wallet.address
      : stellarPublicKey || wallet.address;
  const overrideActive = !!targetAddress && targetAddress !== connectedAddress;

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
          headers: { ...(await buildAuthHeaders()), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token_in_address: tokenIn,
            token_out_address: tokenOut,
            amount: amountInStroops,
            // #33: full amount for the embedded-fee path — the server skims
            // the fee inside the quote when SOROSWAP_EMBEDDED_FEE is on.
            gross_amount: Math.floor(parsedAmount * 10_000_000).toString(),
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

        // Embedded fee: the API already skimmed our bps inside the quote —
        // display ITS fee figure; nothing is subtracted client-side.
        const embedded = !!data.embedded_fee;
        const embeddedFeeTokens = embedded
          ? (parseInt(data.embedded_fee.feeAmount || '0', 10) / 10_000_000).toFixed(7)
          : null;
        const newQuote: SwapQuote = {
          path: data.path || [],
          tokenIn,
          tokenOut,
          amountIn: parsedAmount.toFixed(7),
          amountOut,
          estimatedAmountOut: amountOut,
          minAmountOut,
          priceImpact: 0,
          fee: embedded ? (embeddedFeeTokens ?? '0') : feeAmount.toFixed(7),
          xdr: data.xdr || '',
          embedded,
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
        // Under an override the target signs via the universal signer below —
        // the slot wallet's local-key state is irrelevant to this swap.
        if (!overrideActive && isNormalWallet && !normalCanSign) {
          throw new Error(NORMAL_WALLET_REIMPORT_REQUIRED_MESSAGE);
        }
        // #32: with an active override every transaction is BUILT for and
        // SIGNED BY the target wallet — sender, fee caller and both
        // signatures all follow it, so the swap can never mix wallets.
        const walletAddress = overrideActive
          ? targetAddress!
          : isNormalWallet
            ? normalPublicKey || wallet.address
            : stellarPublicKey || wallet.address;
        const signTransaction = isNormalWallet ? signNormalWallet : signOrReconnect;

        // Sign WITHOUT submitting — submission happens server-side as a pair
        // (#26 sign-both-first, see lib/stellar/fee-pair.ts).
        // Lazy import: kit-signer pulls the wallets-kit ESM graph, which jsdom
        // test suites can't parse — same pattern as normal-wallet-setup.
        const signOnly = async (xdr: string) => {
          const signResult = overrideActive
            ? await (
                await import('@/lib/mgi/kit-signer')
              ).signStellarTxForMgi(xdr, config.NETWORK_PASSPHRASE, walletAddress)
            : await signTransaction(xdr, config.NETWORK_PASSPHRASE);
          const signed = normalizeSignedXDR(signResult);
          if (!signed) throw new Error('Transaction signing failed — no signed XDR returned');
          return signed;
        };

        // #33 Stage 1 — embedded fee: ONE build, ONE signature, ONE tx.
        // Record-before-broadcast lives inside /api/swap/submit-single.
        // DEGRADES, never dies: the one-signature path runs ONLY when the
        // response provably carries our fee (embedded_fee present). If the
        // server signals embedded_unavailable (upstream fee-build defect,
        // doc 76 §7) — or returns any shape without the fee — we fall
        // through to the fee-pair path below: two signatures, fee intact.
        if (swapQuote.embedded) {
          const buildRes = await fetch('/api/swap/quote', {
            method: 'POST',
            headers: { ...(await buildAuthHeaders()), 'Content-Type': 'application/json' },
            body: JSON.stringify({
              token_in_address: swapQuote.tokenIn,
              token_out_address: swapQuote.tokenOut,
              amount: Math.floor(parseFloat(swapQuote.amountIn) * 10_000_000).toString(),
              gross_amount: Math.floor(parseFloat(swapQuote.amountIn) * 10_000_000).toString(),
              sender: walletAddress,
            }),
          });
          const buildData = await buildRes.json();
          // Real failure (not the degrade signal) still surfaces as an error.
          if (!buildData.success && !buildData.embedded_unavailable)
            throw new Error(buildData.error || 'Failed to build swap transaction');
          const oneSignature = !!buildData.success && !!buildData.xdr && !!buildData.embedded_fee;
          if (oneSignature) {
            const signedSwap = await signOnly(buildData.xdr);
            const submitRes = await fetch('/api/swap/submit-single', {
              method: 'POST',
              headers: { ...(await buildAuthHeaders()), 'Content-Type': 'application/json' },
              body: JSON.stringify({
                signedXdr: signedSwap,
                record: {
                  tokenInAddress: swapQuote.tokenIn,
                  tokenOutAddress: swapQuote.tokenOut,
                  tokenInSymbol: display?.tokenInSymbol,
                  tokenOutSymbol: display?.tokenOutSymbol,
                  amountIn: swapQuote.amountIn,
                  amountOut: swapQuote.amountOut,
                  feeAmount: swapQuote.fee,
                },
              }),
            });
            const submitData = await submitRes.json();
            if (!submitData.success || !submitData.hash)
              throw new Error(submitData.error || 'Swap submission failed');
            const url1 = createStellarExpertUrl('tx', submitData.hash);
            enqueueSnackbar(
              <Box component="span">
                {t('Swap successful!')}{' '}
                <Button
                  size="small"
                  onClick={() => window.open(url1, '_blank', 'noopener,noreferrer')}
                  sx={{
                    textTransform: 'none',
                    minWidth: 'auto',
                    p: 0,
                    textDecoration: 'underline',
                  }}
                >
                  {t('View More')}
                </Button>
              </Box>,
              { variant: 'success', persist: false, autoHideDuration: 7500 }
            );
            setQuote(null);
            return submitData.hash;
          }
          // Degraded: any success without embedded_fee (e.g. a tripped server
          // breaker built the GROSS amount) is discarded unsigned — the
          // fee-pair path below re-quotes the NET amount itself.
        }

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

        // 1. Build the Soroswap swap tx with sender and NET amount — it
        // carries the account's next sequence; the fee tx chains behind it.
        const netAmountIn = parseFloat(swapQuote.amountIn) - feeAmount;
        const amountInStroops = Math.floor(netAmountIn * 10_000_000).toString();

        const quoteResponse = await fetch('/api/swap/quote', {
          method: 'POST',
          headers: { ...(await buildAuthHeaders()), 'Content-Type': 'application/json' },
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
            'Swap aggregator did not return a transaction. Ensure SOROSWAP_API_KEY is set on the server.'
          );
        }

        // 2. Build the Normal fee payment directly behind the swap (#26:
        // consecutive sequences — the fee can only apply if the swap did).
        const feeResponse = await fetch('/api/fees/build-payment', {
          method: 'POST',
          headers: { ...(await buildAuthHeaders()), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            caller: walletAddress,
            amount: feeAmount.toFixed(7),
            assetCode: feeAssetCode,
            sourceSequence: getTransactionSequence(quoteData.xdr, config.NETWORK_PASSPHRASE),
            timeoutSeconds: FEE_PAIR_TIMEOUT_SECONDS,
          }),
        });
        const feeData = await feeResponse.json();
        if (!feeData.success || !feeData.xdr) {
          throw new Error(feeData.error || 'Failed to build Normal fee transaction');
        }

        // 3. Collect BOTH signatures before anything is submitted — rejecting
        // either prompt aborts the whole swap with nothing charged.
        const signedSwapXdr = await signOnly(quoteData.xdr);
        const signedFeeXdr = await signOnly(feeData.xdr);

        // 4. Server submits the pair: it records the swap BEFORE broadcasting
        // (#27 — no client-side logging anymore), then swap first, fee
        // escrowed + collected after it (cron sweeper as backstop).
        const pair = await submitFeePair({
          signedServiceXdr: signedSwapXdr,
          signedFeeXdr,
          kind: 'swap',
          record: {
            tokenInAddress: swapQuote.tokenIn,
            tokenOutAddress: swapQuote.tokenOut,
            tokenInSymbol: display?.tokenInSymbol,
            tokenOutSymbol: display?.tokenOutSymbol,
            amountIn: netAmountIn.toFixed(7),
            amountOut: swapQuote.amountOut,
            feeAmount: feeAmount.toFixed(7),
          },
          config,
        });

        const stellarExpertUrl = createStellarExpertUrl('tx', pair.serviceHash);

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
        return pair.serviceHash;
      } catch (err: any) {
        if (err instanceof WalletSessionExpiredError) return '';
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
      normalCanSign,
      normalPublicKey,
      stellarPublicKey,
      signNormalWallet,
      signOrReconnect,
      overrideActive,
      targetAddress,
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
