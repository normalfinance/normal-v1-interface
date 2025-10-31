'use client';

import { useEffect } from 'react';
import { logger } from '@normalfinance/utils';
import { useReferralTracking } from '@/hooks/use-referral-tracking';

interface ReferralProviderProps {
  children: React.ReactNode;
}

export function ReferralProvider({ children }: ReferralProviderProps) {
  const { hasReferral, referralCode, hasUnusedReferral } = useReferralTracking();

  useEffect(() => {
    if (hasReferral) {
      logger.log('[referral] User has referral:', referralCode);

      if (hasUnusedReferral) {
        logger.log('[referral] New referral detected');
      }
    }
  }, [hasReferral, referralCode, hasUnusedReferral]);

  return <>{children}</>;
}

export { useReferralTracking } from '@/hooks/use-referral-tracking';
