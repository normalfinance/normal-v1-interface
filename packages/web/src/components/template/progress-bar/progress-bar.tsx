'use client';

import './styles.css';

import NProgress from 'nprogress';
import { Suspense, useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from '@/routes/hooks';
import { useAppStore } from '@normalfinance/state';

// ----------------------------------------------------------------------

const handleAnchorClick = (event: MouseEvent) => {
  const targetUrl = (event.currentTarget as HTMLAnchorElement).href;
  const currentUrl = window.location.href;
  if (targetUrl !== currentUrl) {
    NProgress.start();
  }
};

const handleMutation = () => {
  const anchorElements: NodeListOf<HTMLAnchorElement> = document.querySelectorAll('a[href]');
  const filteredAnchors = Array.from(anchorElements).filter((element) => {
    const rel = element.getAttribute('rel');
    const href = element.getAttribute('href');
    const target = element.getAttribute('target');
    return href?.startsWith('/') && target !== '_blank' && rel !== 'noopener';
  });
  filteredAnchors.forEach((anchor) => anchor.addEventListener('click', handleAnchorClick));
};

export function ProgressBar() {
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

  useEffect(() => {
    NProgress.configure({ showSpinner: false });

    const mutationObserver = new MutationObserver(handleMutation);
    mutationObserver.observe(document, { childList: true, subtree: true });

    // Cleanup function to remove event listeners and observer
    return () => {
      mutationObserver.disconnect();
      const anchorElements: NodeListOf<HTMLAnchorElement> = document.querySelectorAll('a[href]');
      anchorElements.forEach((anchor) => anchor.removeEventListener('click', handleAnchorClick));
    };
  }, []);

  return (
    <Suspense fallback={null}>
      <NProgressDone />
    </Suspense>
  );
}

// ----------------------------------------------------------------------

function NProgressDone() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    NProgress.done();
  }, [pathname, searchParams]);

  return null;
}
