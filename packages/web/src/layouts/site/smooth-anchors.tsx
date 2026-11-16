'use client';

import { useEffect } from 'react';
import { easeAt } from '@/theme/motion';

// ----------------------------------------------------------------------

// A link to a section of the page it is on (Security, How it works, the
// footer's sections) scrolls there on the site's one curve instead of jumping
// (Niko 2026-11-16: "it just jumps to section it dont scroll with ease").
// One listener for the whole site, ahead of the router: a link to another page
// is left to it, and so is a click with a modifier key (a new tab). The page
// lands where the section's scroll-margin says, under the sticky header. Any
// wheel, touch or key press hands the scroll back to the visitor at once, and
// people who ask for less motion get the jump.

/** Time for a scroll: longer for longer distances, never a crawl. */
const durationFor = (distance: number) => Math.min(1100, 420 + Math.abs(distance) / 6);

function scrollToSection(target: HTMLElement) {
  const startY = window.scrollY;
  const margin = parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
  const maxY = document.documentElement.scrollHeight - window.innerHeight;
  const endY = Math.max(0, Math.min(maxY, target.getBoundingClientRect().top + startY - margin));
  const distance = endY - startY;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || Math.abs(distance) < 2) {
    window.scrollTo(0, endY);
    return;
  }

  const duration = durationFor(distance);
  let frame = 0;
  let begun: number | null = null;

  const stop = () => {
    cancelAnimationFrame(frame);
    window.removeEventListener('wheel', stop);
    window.removeEventListener('touchstart', stop);
    window.removeEventListener('keydown', stop);
  };
  window.addEventListener('wheel', stop, { passive: true });
  window.addEventListener('touchstart', stop, { passive: true });
  window.addEventListener('keydown', stop);

  const step = (now: number) => {
    if (begun === null) begun = now;
    const progress = Math.min(1, (now - begun) / duration);
    window.scrollTo(0, startY + distance * easeAt(progress));
    if (progress < 1) frame = requestAnimationFrame(step);
    else stop();
  };
  frame = requestAnimationFrame(step);
}

export function SmoothAnchors() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.('a[href*="#"]');
      if (!(anchor instanceof HTMLAnchorElement) || anchor.target === '_blank') return;

      const url = new URL(anchor.href, window.location.href);
      const here = window.location;
      if (url.origin !== here.origin || url.pathname !== here.pathname || url.hash.length < 2) {
        return;
      }
      const target = document.getElementById(decodeURIComponent(url.hash.slice(1)));
      if (!target) return;

      // The router sees a handled click and stays out of it; React's own
      // handlers still run (the phone menu closes itself).
      event.preventDefault();
      scrollToSection(target);
      // The address names the section, without a new history entry.
      window.history.replaceState(window.history.state, '', url.hash);
    };

    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  return null;
}
