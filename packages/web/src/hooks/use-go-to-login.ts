'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { loginHrefFrom } from '@/lib/auth/auth-routes';

/** Sends a logged-out visitor to /login and back here once they're signed in. */
export function useGoToLogin() {
  const router = useRouter();
  return useCallback(() => {
    router.push(loginHrefFrom(window.location.pathname, window.location.search));
  }, [router]);
}
