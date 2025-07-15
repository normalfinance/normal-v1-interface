'use client';

import { useEffect } from 'react';
import { useReferralTracking } from '@/hooks/use-referral-tracking';

interface ReferralProviderProps {
  children: React.ReactNode;
}

export function ReferralProvider({ children }: ReferralProviderProps) {
  const { hasReferral, referralCode, hasUnusedReferral } = useReferralTracking();

  useEffect(() => {
    if (hasReferral) {
      console.log('[referral] User has referral:', referralCode);

      if (hasUnusedReferral) {
        console.log('[referral] New referral detected');
      }
    }
  }, [hasReferral, referralCode, hasUnusedReferral]);

  return <>{children}</>;
}

export { useReferralTracking } from '@/hooks/use-referral-tracking';
