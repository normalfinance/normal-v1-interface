import { useCallback, useEffect, useState } from 'react';
import { isWalletVerifiedForSession } from '@/utils/wallet-proof';

export function useWalletOwnership(address?: string | null) {
  const [verified, setVerified] = useState<boolean>(() => isWalletVerifiedForSession(address));

  useEffect(() => {
    setVerified(isWalletVerifiedForSession(address));
  }, [address]);

  const markVerified = useCallback(() => setVerified(true), []);
  const resetVerified = useCallback(() => setVerified(false), []);

  return { verified, markVerified, resetVerified };
}
