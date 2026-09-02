'use client';

import { useStellarConfig } from '@/hooks';
import { useState, useEffect, useCallback } from 'react';
import { logger, checkTrustline, fetchAccountStrict } from '@normalfinance/utils';

export interface AccountStatus {
  isLoading: boolean;
  accountExists: boolean | null; // null = unknown (check failed/loading)
  xlmBalance: string;
  hasUsdcTrustline: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

interface AccountStatusOptions {
  assetCode?: string;
  assetIssuer?: string;
}

/**
 * Hook to check account status on Stellar network
 * - Checks if account exists (funded with XLM)
 * - Gets XLM balance
 * - Checks if the requested asset trustline exists
 */
export function useAccountStatus(
  walletAddress: string | undefined,
  options: AccountStatusOptions = {}
): AccountStatus {
  const config = useStellarConfig();
  const assetCode = options.assetCode || 'USDC';
  const assetIssuer = options.assetIssuer || config.USDC_ISSUER;
  const [isLoading, setIsLoading] = useState(true);
  const [accountExists, setAccountExists] = useState<boolean | null>(null);
  const [xlmBalance, setXlmBalance] = useState('0');
  const [hasUsdcTrustline, setHasUsdcTrustline] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const checkAccountStatus = useCallback(async () => {
    if (!walletAddress) {
      setIsLoading(false);
      setAccountExists(false);
      setXlmBalance('0');
      setHasUsdcTrustline(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Strict fetch: a Horizon 404 (unfunded) is `null`; a FAILED lookup
      // throws and lands in `error` below — so "not activated" is only ever
      // asserted from a real answer, never from a network blip. (The lenient
      // fetchAccount maps failures to undefined, which readers would show as
      // a confident "account doesn't exist".)
      const account = await fetchAccountStrict(walletAddress, config);

      if (!account) {
        // Account doesn't exist on the network
        setAccountExists(false);
        setXlmBalance('0');
        setHasUsdcTrustline(false);
        setIsLoading(false);
        return;
      }

      // Account exists
      setAccountExists(true);

      // Get XLM balance
      const nativeBalance = account.balances.find((b) => b.asset_type === 'native');
      const xlmAmount = nativeBalance ? nativeBalance.balance : '0';
      setXlmBalance(xlmAmount);

      // Check requested asset trustline
      if (assetIssuer) {
        const trustlineResult = await checkTrustline(walletAddress, assetCode, assetIssuer, config);
        setHasUsdcTrustline(trustlineResult.exists);
      } else {
        logger.warn(`[useAccountStatus] ${assetCode}_ISSUER not configured`);
        setHasUsdcTrustline(false);
      }
    } catch (err: any) {
      logger.error('[useAccountStatus] Error checking account status:', err);
      setError(err);
      // Doc 90 W3: a Horizon blip is NOT "this account does not exist" —
      // keep the last known answer (or null = unknown on first load) instead
      // of flipping a set-up account into the "Activate your account" nag
      // and silently disarming the XLM fee semaphore.
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress, assetCode, assetIssuer, config]);

  // Check status on mount and when wallet address changes
  useEffect(() => {
    checkAccountStatus();
  }, [checkAccountStatus]);

  return {
    isLoading,
    accountExists,
    xlmBalance,
    hasUsdcTrustline,
    error,
    refetch: checkAccountStatus,
  };
}
