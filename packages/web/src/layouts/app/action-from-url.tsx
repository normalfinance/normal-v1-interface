'use client';

import { useRef, useEffect } from 'react';
import { appActionFrom } from '@/lib/app-action-url';
import { useRouter, usePathname } from '@/routes/hooks';
import { useAssetActionsContext } from '@/providers/AssetActionsProvider';

// ----------------------------------------------------------------------

/**
 * Opens the money action a link asks for (`?action=buy`, `send`, ...) once the
 * person is signed in, then drops it from the address so a reload or Back does
 * not open it again. The site's Product menu links here (Niko 2026-11-10: the
 * product links take you into the app); a signed-out visitor comes through
 * login first and lands back on the same address (`next`).
 */
export function ActionFromUrl() {
  const router = useRouter();
  const pathname = usePathname();
  const { startAction } = useAssetActionsContext();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    // Read directly: useSearchParams would need a Suspense boundary around the shell.
    const action = appActionFrom(window.location.search);
    if (!action) return;
    done.current = true;
    router.replace(pathname);
    startAction(action);
  }, [pathname, router, startAction]);

  return null;
}
