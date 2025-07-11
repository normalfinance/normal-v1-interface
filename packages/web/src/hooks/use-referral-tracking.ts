'use client';

import type { ReferralQueryParams } from '@/types/query-params';

import { useEffect } from 'react';
import { usePersistStore } from '@normalfinance/state';

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
}

export function useReferralTracking(): UseReferralTrackingReturn {
  const { params } = useQueryParams<ReferralQueryParams>();
  const {
    referralState,
    setReferralCode,
    clearReferralCode,
    markReferralUsed,
    getReferralFromCookie,
  } = usePersistStore();

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

  const hasUnusedReferral = referralState.hasReferral && !referralState.referralUsed;

  const hasUsedAction = (action: string): boolean => referralState.usedActions.includes(action);

  return {
    referralCode: referralState.referralCode,
    referralTimestamp: referralState.referralTimestamp,
    hasReferral: referralState.hasReferral,
    hasUnusedReferral,
    hasUsedAction,
    setReferralCode,
    clearReferralCode,
    markReferralUsed,
  };
}
