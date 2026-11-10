'use client';

import type { ReactNode } from 'react';
import type { Theme, SxProps } from '@mui/material/styles';

import { useRef, useState, useLayoutEffect } from 'react';

import Box from '@mui/material/Box';

// ----------------------------------------------------------------------

/**
 * Fades its children in the first time they scroll into view. Opacity only:
 * nothing slides (DESIGN.md). Honours prefers-reduced-motion, and content that
 * is already on screen never blinks. Without JavaScript the page shows
 * everything (the noscript rule in HomeView).
 */
export function Reveal({
  children,
  delay = 0,
  sx,
}: {
  children: ReactNode;
  delay?: number;
  sx?: SxProps<Theme>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const inView = el.getBoundingClientRect().top < window.innerHeight * 0.9;
    if (still || inView) {
      setShown(true);
      return undefined;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          observer.disconnect();
        }
      },
      { rootMargin: '0px 0px -10% 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Box
      ref={ref}
      data-reveal=""
      sx={[
        {
          opacity: shown ? 1 : 0,
          transition: `opacity 800ms cubic-bezier(0.2, 0.8, 0.2, 1) ${delay}ms`,
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {children}
    </Box>
  );
}
