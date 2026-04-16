'use client';

import { useState, useEffect, useCallback } from 'react';
import { logger, fetchAccount, checkTrustline } from '@normalfinance/utils';
import { useStellarConfig } from '@/hooks';

export interface AccountStatus {
  isLoading: boolean;
  accountExists: boolean;
  xlmBalance: string;
  hasUsdcTrustline: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to check account status on Stellar network
 * - Checks if account exists (funded with XLM)
 * - Gets XLM balance
 * - Checks if USDC trustline exists
 */
export function useAccountStatus(walletAddress: string | undefined): AccountStatus {
  const config = useStellarConfig();
  const [isLoading, setIsLoading] = useState(true);
  const [accountExists, setAccountExists] = useState(false);
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
      // Fetch account from Horizon
      const account = await fetchAccount(walletAddress, config);

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

      // Check USDC trustline
      const usdcIssuer = config.USDC_ISSUER;
      if (usdcIssuer) {
        const trustlineResult = await checkTrustline(walletAddress, 'USDC', usdcIssuer, config);
        setHasUsdcTrustline(trustlineResult.exists);
      } else {
        logger.warn('[useAccountStatus] USDC_ISSUER not configured');
        setHasUsdcTrustline(false);
      }
    } catch (err: any) {
      logger.error('[useAccountStatus] Error checking account status:', err);
      setError(err);
      setAccountExists(false);
      setXlmBalance('0');
      setHasUsdcTrustline(false);
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress, config]);

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
