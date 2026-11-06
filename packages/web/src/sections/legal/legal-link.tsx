'use client';

import type { ReactNode } from 'react';

import { TYPE } from '@/theme/type-scale';
import { RouterLink } from '@/routes/components';
import { INK, MUTED } from '@/theme/brand-colors';

import Box from '@mui/material/Box';

// ----------------------------------------------------------------------

// The legal pages render their text on the server; these are the only parts
// that need the router, so they live in this small client file.

const linkProps = (href: string) =>
  href.startsWith('/')
    ? { component: RouterLink, href }
    : href.startsWith('http')
      ? { component: 'a' as const, href, target: '_blank', rel: 'noopener noreferrer' }
      : { component: 'a' as const, href };

/** A link inside the document: ink, underlined. */
export function LegalLink({ href = '', children }: { href?: string; children: ReactNode }) {
  return (
    <Box
      {...linkProps(href)}
      sx={{
        color: INK,
        textDecoration: 'underline',
        textDecorationThickness: '1px',
        textUnderlineOffset: '0.18em',
        overflowWrap: 'anywhere',
        '&:hover': { textDecorationThickness: '2px' },
      }}
    >
      {children}
    </Box>
  );
}

/** One of the legal documents, in the rail beside the text. */
export function LegalNavLink({
  href,
  current,
  children,
}: {
  href: string;
  current: boolean;
  children: ReactNode;
}) {
  return (
    <Box
      component={RouterLink}
      href={href}
      aria-current={current ? 'page' : undefined}
      sx={{
        ...TYPE.small,
        display: 'block',
        py: 0.5,
        fontWeight: current ? 500 : 400,
        color: current ? INK : MUTED,
        textDecoration: 'none',
        '&:hover': { color: INK },
      }}
    >
      {children}
    </Box>
  );
}
