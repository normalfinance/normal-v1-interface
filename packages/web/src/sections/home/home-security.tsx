'use client';

import type { BrandHue } from '@/theme/brand-colors';
import type { ReactNode, ComponentType, KeyboardEvent } from 'react';

import { useRef, useState } from 'react';
import { TYPE } from '@/theme/type-scale';
import { TWO_FACTOR_ENABLED } from '@/lib/auth/two-factor';
import { INK, HOVER, MUTED, CANVAS, INK_SOFT, BRAND_COLORS } from '@/theme/brand-colors';

import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import FingerprintRounded from '@mui/icons-material/FingerprintRounded';
import VerifiedUserOutlined from '@mui/icons-material/VerifiedUserOutlined';
import PhonelinkLockOutlined from '@mui/icons-material/PhonelinkLockOutlined';
import AccountBalanceWalletOutlined from '@mui/icons-material/AccountBalanceWalletOutlined';

import { IconTile } from '@/components/_common/icon-tile';
import {
  HAIRLINE,
  COLUMN_SX,
  GUTTER_SX,
  SectionHeader,
  VISUALLY_HIDDEN_SX,
} from '@/components/_common/brand';

import { TwoFactorDemo } from './two-factor-demo';
import { AuditDemo, ApproveDemo, CustodyDemo } from './security-demos';

// ----------------------------------------------------------------------

type Point = {
  id: string;
  icon: ReactNode;
  title: string;
  body: string;
  /** What the demo shows, for screen readers: the demo itself is a drawing. */
  caption: string;
  Demo: ComponentType;
  /** The wash behind the demo. */
  hue: BrandHue;
};

// Only what the product does today. The 2FA tab appears with the feature
// itself (NEXT_PUBLIC_TWO_FACTOR_ENABLED), so the page never promises it early.
// Each demo has its own wash, in the logo's order: sky, violet, magenta, yellow.
const POINTS: Point[] = [
  {
    id: 'wallet',
    icon: <AccountBalanceWalletOutlined />,
    title: 'Your wallet, your money',
    body: 'Your money sits in a wallet in your name, not in a Normal account.',
    caption: 'Who can move the money in your wallet: you can; Normal and anyone else cannot.',
    Demo: CustodyDemo,
    hue: 'sky',
  },
  {
    id: 'face',
    icon: <FingerprintRounded />,
    title: 'Approve with your face',
    body: 'Payments from your wallet are approved with your face or fingerprint.',
    caption: 'A $50 payment to Ana waits for a face scan, is approved, and is sent.',
    Demo: ApproveDemo,
    hue: 'violet',
  },
  ...(TWO_FACTOR_ENABLED
    ? [
        {
          id: 'code',
          icon: <PhonelinkLockOutlined />,
          title: 'Two-factor authentication',
          body: 'A code from your authenticator app at sign-in, and before money moves.',
          caption: 'A six-digit code from an authenticator app is entered and verified.',
          Demo: TwoFactorDemo,
          hue: 'magenta' as const,
        },
      ]
    : []),
  {
    id: 'audit',
    icon: <VerifiedUserOutlined />,
    title: 'Independently audited',
    body: 'Normal Savings was audited by Halborn, an independent security firm.',
    caption: 'The audit report for Normal Savings, completed by Halborn.',
    Demo: AuditDemo,
    hue: 'yellow',
  },
];

/**
 * Each safeguard is a tab; its demo plays on the right, on its own wash, which
 * fills that half of the section between the frame lines and changes colour
 * with the tab. The chosen row is light grey, its icon ink. Arrow keys move
 * between tabs.
 */
export function HomeSecurity() {
  const [active, setActive] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const point = POINTS[active];

  const onKeyDown = (event: KeyboardEvent) => {
    const last = POINTS.length - 1;
    const moves: Record<string, number> = {
      ArrowDown: active === last ? 0 : active + 1,
      ArrowUp: active === 0 ? last : active - 1,
      Home: 0,
      End: last,
    };
    const target = moves[event.key];
    if (target === undefined) return;
    event.preventDefault();
    setActive(target);
    tabs.current[target]?.focus();
  };

  return (
    <Box
      component="section"
      id="security"
      aria-labelledby="security-title"
      sx={{ scrollMarginTop: 72, borderTop: HAIRLINE }}
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          ...COLUMN_SX,
        }}
      >
        <Box sx={{ py: 'var(--section-y)' }}>
          <Box sx={{ ...GUTTER_SX, pr: { md: 8 } }}>
            <SectionHeader
              id="security-title"
              eyebrow="Security"
              title="Safe by design."
              subtitle="Your money stays in your own wallet. Easy to use, hard to lose."
              sx={{ mb: 4 }}
            />
          </Box>

          {/* The rows run from the frame line to the demo. */}
          <Box
            role="tablist"
            aria-orientation="vertical"
            aria-labelledby="security-title"
            sx={{ borderTop: HAIRLINE, borderBottom: HAIRLINE }}
          >
            {POINTS.map((item, index) => {
              const selected = index === active;
              return (
                <ButtonBase
                  key={item.id}
                  ref={(element: HTMLButtonElement | null) => {
                    tabs.current[index] = element;
                  }}
                  role="tab"
                  id={`security-tab-${item.id}`}
                  aria-selected={selected}
                  aria-controls="security-panel"
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setActive(index)}
                  onKeyDown={onKeyDown}
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'flex-start',
                    gap: 2,
                    width: '100%',
                    ...GUTTER_SX,
                    pr: { md: 8 },
                    py: 2.5,
                    textAlign: 'left',
                    borderTop: index > 0 ? HAIRLINE : 'none',
                    bgcolor: selected ? CANVAS : 'transparent',
                    transition: 'background-color 200ms ease',
                    '&:hover': { bgcolor: selected ? CANVAS : HOVER },
                    '&.Mui-focusVisible': { outline: `2px solid ${INK}`, outlineOffset: -2 },
                  }}
                >
                  <IconTile tone={selected ? 'ink' : 'soft'}>{item.icon}</IconTile>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography component="span" sx={{ ...TYPE.h4, display: 'block', color: INK }}>
                      {item.title}
                    </Typography>
                    <Typography
                      component="span"
                      sx={{
                        ...TYPE.small,
                        display: 'block',
                        mt: 0.5,
                        color: selected ? INK_SOFT : MUTED,
                      }}
                    >
                      {item.body}
                    </Typography>
                  </Box>
                </ButtonBase>
              );
            })}
          </Box>

          <Box sx={{ ...GUTTER_SX, pr: { md: 8 }, display: 'flex', gap: 1, mt: 3 }}>
            <InfoOutlined sx={{ mt: '3px', fontSize: 18, color: INK_SOFT }} />
            <Typography sx={{ ...TYPE.small, maxWidth: 460, color: INK_SOFT }}>
              Normal will never ask for your recovery code or password. Only sign in at
              normalfinance.io.
            </Typography>
          </Box>
        </Box>

        <Box
          role="tabpanel"
          id="security-panel"
          aria-labelledby={`security-tab-${point.id}`}
          tabIndex={0}
          sx={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: { xs: 540, md: 'auto' },
            p: { xs: 3, md: 8 },
            borderTop: { xs: HAIRLINE, md: 'none' },
            borderLeft: { md: HAIRLINE },
            bgcolor: BRAND_COLORS[point.hue].tint,
            transition: 'background-color 300ms ease',
            '&:focus-visible': { outline: `2px solid ${INK}`, outlineOffset: -2 },
          }}
        >
          <Box component="p" sx={VISUALLY_HIDDEN_SX}>
            {point.caption}
          </Box>
          {/* A new demo fades in; keyed so it starts from its first step. */}
          <Box
            key={point.id}
            sx={{
              display: 'flex',
              justifyContent: 'center',
              width: '100%',
              animation: 'nf-demo-in 400ms ease',
              '@keyframes nf-demo-in': { from: { opacity: 0 }, to: { opacity: 1 } },
              '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
            }}
          >
            <point.Demo />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
