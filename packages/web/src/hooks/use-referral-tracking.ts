'use client';

import type { ReferralQueryParams } from '@/types/query-params';

import { useEffect, useState } from 'react';
import { usePersistStore } from '@normalfinance/state';
import { ReferralAPI, getReferralAPIErrorMessage } from '@/lib/referral-api';

import { useQueryParams } from './use-query-params';

export interface UseReferralTrackingReturn {
  referralCode: string | null;
  referralTimestamp: number | null;
  hasReferral: boolean;
  hasUnusedReferral: boolean;
  hasUsedAction: (action: string) => boolean;
  setReferralCode: (code: string) => void;
  clearReferralCode: () => void;
  markReferralUsed: (action?: string) => void;

  syncWithDatabase: () => Promise<void>;
  recordAction: (
    action: string,
    metadata?: { amount?: string; tokenSymbol?: string }
  ) => Promise<boolean>;
  getUserStats: () => Promise<any>;
  isLoading: boolean;
  error: string | null;
}

export function useReferralTracking(): UseReferralTrackingReturn {
  const { params } = useQueryParams<ReferralQueryParams>();
  const {
    referralState,
    setReferralCode,
    clearReferralCode,
    markReferralUsed,
    getReferralFromCookie,
    wallet,
  } = usePersistStore();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const urlReferralCode = params.ref || params.referral || params.referrer || params.invite;

    if (urlReferralCode && !referralState.hasReferral) {
      console.log('[referral] New referral code detected:', urlReferralCode);
      setReferralCode(urlReferralCode);
    }
  }, [params, referralState.hasReferral, setReferralCode]);

  useEffect(() => {
    const cookieReferralData = getReferralFromCookie();
    if (cookieReferralData.hasReferral && !referralState.hasReferral) {
      console.log('[referral] Syncing referral from cookies:', cookieReferralData);
      setReferralCode(cookieReferralData.referralCode!);
    }
  }, [getReferralFromCookie, referralState.hasReferral, setReferralCode]);

  const syncWithDatabase = async (): Promise<void> => {
    if (!wallet.address || !referralState.referralCode) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await ReferralAPI.createUser({ walletAddress: wallet.address });

      const referralData = await ReferralAPI.getReferralByCode(referralState.referralCode);

      if (referralData.referral) {
        if (!referralData.referral.isUsed && wallet.address) {
          await ReferralAPI.activateReferral({
            code: referralState.referralCode,
            refereeWalletAddress: wallet.address,
          });
          console.log('[referral] Activated referral in database');
        }

        const actionsData = await ReferralAPI.getUserActions(
          wallet.address,
          referralState.referralCode
        );

        actionsData.actions.forEach((action: any) => {
          if (!hasUsedAction(action.action)) {
            markReferralUsed(action.action);
          }
        });
      }
    } catch (err) {
      console.error('[referral] Database sync error:', err);
      setError(getReferralAPIErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (wallet.address && referralState.hasReferral && referralState.referralCode) {
      syncWithDatabase();
    }
  }, [wallet.address, referralState.hasReferral, referralState.referralCode]);

  const hasUnusedReferral = referralState.hasReferral && !referralState.referralUsed;

  const hasUsedAction = (action: string): boolean => referralState.usedActions.includes(action);

  const recordAction = async (
    action: string,
    metadata?: { amount?: string; tokenSymbol?: string }
  ): Promise<boolean> => {
    if (!wallet.address || !referralState.referralCode) {
      console.warn('[referral] Cannot record action: no wallet or referral code');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      await ReferralAPI.recordAction({
        userWalletAddress: wallet.address,
        referralCode: referralState.referralCode,
        action,
        metadata,
      });

      markReferralUsed(action);

      console.log('[referral] Action recorded:', action);
      return true;
    } catch (err) {
      console.error('[referral] Error recording action:', err);
      setError(getReferralAPIErrorMessage(err));
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const getUserStats = async () => {
    if (!wallet.address) {
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const statsData = await ReferralAPI.getReferralStats(wallet.address);
      return statsData.stats;
    } catch (err) {
      console.error('[referral] Error fetching stats:', err);
      setError(getReferralAPIErrorMessage(err));
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    referralCode: referralState.referralCode,
    referralTimestamp: referralState.referralTimestamp,
    hasReferral: referralState.hasReferral,
    hasUnusedReferral,
    hasUsedAction,
    setReferralCode,
    clearReferralCode,
    markReferralUsed,

    syncWithDatabase,
    recordAction,
    getUserStats,
    isLoading,
    error,
  };
}
