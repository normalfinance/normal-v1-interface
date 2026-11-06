'use client';

import NProgress from 'nprogress';
import { useRef, useEffect } from 'react';
import { useAppStore } from '@normalfinance/state';

// ----------------------------------------------------------------------

/**
 * The app pages' "loading" flag (assets, savings, swap) drives the same top
 * bar as page navigation. It lives in the app's frame, not the root layout:
 * the store package brings the Stellar wallet kit, which the marketing site
 * must not download.
 */
export function AppLoadingProgress() {
  const { globalIsLoading } = useAppStore();
  const prevIsLoading = useRef(globalIsLoading);

  useEffect(() => {
    if (globalIsLoading && !prevIsLoading.current) {
      NProgress.start();
    }
    if (!globalIsLoading && prevIsLoading.current) {
      NProgress.done();
    }
    prevIsLoading.current = globalIsLoading;
  }, [globalIsLoading]);

  return null;
}
