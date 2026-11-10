'use client';

import type { ReactNode } from 'react';

import { cdn } from '@/utils/cdn';
import { useState, useEffect } from 'react';
import { SITE_THEME_ATTR } from '@/theme/site-theme';
import { INK, MUTED, PAPER, CANVAS, BRAND_COLORS } from '@/theme/brand-colors';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import KeyRounded from '@mui/icons-material/KeyRounded';
import CheckRounded from '@mui/icons-material/CheckRounded';
import CloseRounded from '@mui/icons-material/CloseRounded';
import GroupsOutlined from '@mui/icons-material/GroupsOutlined';
import PersonOutlineRounded from '@mui/icons-material/PersonOutlineRounded';

import { HAIRLINE } from '@/components/_common/brand';

// ----------------------------------------------------------------------

// The Security section's demos: dialogs from the real app, played on a loop.
// Every change is a fade or a word swapped in place; nothing moves (DESIGN.md).
// Each claim is one the product makes today: the wallet's keys are used only
// with the owner's passkey (Terms 1.2), and Halborn audited Normal Savings.

/**
 * Plays a demo on a timer: the step goes 1, 2, 3, ... at the given times (ms
 * from the start), then the demo starts over after `loopMs`. With reduced
 * motion it rests on the last step. Pass a module-level array, so it stays
 * the same between renders.
 */
export function useDemoStep(times: readonly number[], loopMs: number): number {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setStep(times.length);
      return undefined;
    }
    let timers: ReturnType<typeof setTimeout>[] = [];
    const run = () => {
      setStep(0);
      timers = [
        ...times.map((ms, index) => setTimeout(() => setStep(index + 1), ms)),
        setTimeout(run, loopMs),
      ];
    };
    run();
    return () => timers.forEach(clearTimeout);
  }, [times, loopMs]);

  return step;
}

/** Shown, or faded out in place. */
export const fade = (visible: boolean) => ({
  opacity: visible ? 1 : 0,
  transition: 'opacity 300ms ease',
});

/** The card every demo is drawn on, like a dialog in the app. Decorative. */
export function DemoCard({ children }: { children: ReactNode }) {
  return (
    <Box
      aria-hidden="true"
      sx={{
        width: '100%',
        maxWidth: 420,
        p: { xs: 3, md: 3.5 },
        border: HAIRLINE,
        borderRadius: 'var(--radius-site)',
        color: INK,
        bgcolor: PAPER,
      }}
    >
      {children}
    </Box>
  );
}

/** A dialog's top: an icon square, the title and one line under it. */
export function DemoHeader({
  icon,
  title,
  text,
}: {
  icon: ReactNode;
  title: string;
  text: string;
}) {
  return (
    <>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 48,
          height: 48,
          border: HAIRLINE,
          borderRadius: 'var(--radius-site)',
          bgcolor: CANVAS,
          '& svg': { fontSize: 24 },
        }}
      >
        {icon}
      </Box>
      <Typography sx={{ mt: 2.5, fontSize: 21, fontWeight: 500, letterSpacing: '-0.02em' }}>
        {title}
      </Typography>
      <Typography sx={{ mt: 0.75, fontSize: 14, lineHeight: 1.5, color: MUTED }}>{text}</Typography>
    </>
  );
}

/** A yes (green check) or a no (grey cross) in a circle. */
function Verdict({ yes }: { yes: boolean }) {
  const mint = BRAND_COLORS.mint;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        width: 28,
        height: 28,
        borderRadius: '50%',
        color: yes ? mint.deep : MUTED,
        bgcolor: yes ? mint.tint : CANVAS,
        '& svg': { fontSize: 18 },
      }}
    >
      {yes ? <CheckRounded /> : <CloseRounded />}
    </Box>
  );
}

/** A round avatar: an initial, an icon or a mark. */
function Avatar({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        width: 36,
        height: 36,
        borderRadius: '50%',
        fontSize: 15,
        fontWeight: 500,
        bgcolor: CANVAS,
        '& svg': { fontSize: 20 },
      }}
    >
      {children}
    </Box>
  );
}

// ----------------------------------------------------------------------

const CUSTODY_STEPS = [600, 1300, 2000, 2900];

const WHO = [
  {
    name: 'You',
    note: 'Approve with your face or fingerprint',
    yes: true,
    avatar: <PersonOutlineRounded />,
  },
  {
    name: 'Normal',
    note: 'Can’t see your keys or move your money',
    yes: false,
    avatar: (
      <Box
        component="img"
        src={cdn('logo/logo-single.svg')}
        alt=""
        sx={{ display: 'block', width: 20, height: 20 }}
      />
    ),
  },
  {
    name: 'Anyone else',
    note: 'Can’t move it without your approval',
    yes: false,
    avatar: <GroupsOutlined />,
  },
];

/** Your wallet, your money: who can move it, answered one row at a time. */
export function CustodyDemo() {
  const step = useDemoStep(CUSTODY_STEPS, 7000);

  return (
    <DemoCard>
      <DemoHeader
        icon={<KeyRounded />}
        title="Who can move your money?"
        text="Your wallet is in your name, not ours."
      />
      <Box sx={{ mt: 3, borderTop: HAIRLINE }}>
        {WHO.map((who, index) => (
          <Box
            key={who.name}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              py: 1.5,
              borderBottom: HAIRLINE,
              ...fade(step > index),
            }}
          >
            <Avatar>{who.avatar}</Avatar>
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: 15, fontWeight: 500 }}>{who.name}</Typography>
              <Typography sx={{ fontSize: 13, lineHeight: 1.45, color: MUTED }}>
                {who.note}
              </Typography>
            </Box>
            <Verdict yes={who.yes} />
          </Box>
        ))}
      </Box>
      <Typography sx={{ mt: 2, fontSize: 14, fontWeight: 500, ...fade(step > WHO.length) }}>
        Only you can use your keys.
      </Typography>
    </DemoCard>
  );
}

// ----------------------------------------------------------------------

// The face-scan mark: four corners around a face. Drawn here, in ink.
function FaceGlyph() {
  return (
    <Box
      component="svg"
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      sx={{ display: 'block', width: 64, height: 64 }}
    >
      <path d="M6 20v-8a6 6 0 0 1 6-6h8M44 6h8a6 6 0 0 1 6 6v8M58 44v8a6 6 0 0 1-6 6h-8M20 58h-8a6 6 0 0 1-6-6v-8" />
      <path d="M23 25v4M41 25v4M32 25v9h-3M24 42c4.5 4 11.5 4 16 0" />
    </Box>
  );
}

const APPROVE_STEPS = [1000, 2300, 3100];

/** Approve with your face: a payment waits for a face scan, then goes. */
export function ApproveDemo() {
  const step = useDemoStep(APPROVE_STEPS, 6500);
  const mint = BRAND_COLORS.mint;
  const approved = step >= 2;

  return (
    <DemoCard>
      <Typography sx={{ fontSize: 14, color: MUTED }}>You’re sending</Typography>
      <Typography sx={{ mt: 0.5, fontSize: 40, fontWeight: 500, letterSpacing: '-0.035em' }}>
        $50.00
      </Typography>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
          mt: 1.5,
          pb: 3,
          borderBottom: HAIRLINE,
        }}
      >
        <Avatar>A</Avatar>
        <Box>
          <Typography sx={{ fontSize: 15, fontWeight: 500 }}>Ana</Typography>
          <Typography sx={{ fontSize: 13, color: MUTED }}>Digital dollars</Typography>
        </Box>
      </Box>

      <Box
        sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, py: 3.5 }}
      >
        <Box sx={{ position: 'relative', width: 64, height: 64 }}>
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              opacity: approved ? 0 : step >= 1 ? 1 : 0.35,
              transition: 'opacity 300ms ease',
            }}
          >
            <FaceGlyph />
          </Box>
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              color: mint.deep,
              bgcolor: mint.tint,
              ...fade(approved),
            }}
          >
            <CheckRounded sx={{ fontSize: 36 }} />
          </Box>
        </Box>
        <Typography sx={{ fontSize: 14, fontWeight: 500, color: approved ? mint.deep : INK }}>
          {approved
            ? 'Approved with your face'
            : step >= 1
              ? 'Looking for your face…'
              : 'Confirm with your face'}
        </Typography>
      </Box>

      <Box
        sx={{
          py: '13px',
          fontSize: 15,
          fontWeight: 500,
          textAlign: 'center',
          borderRadius: 'var(--radius-site)',
          color: PAPER,
          bgcolor: INK,
        }}
      >
        {step >= 3 ? 'Sent to Ana' : 'Send $50.00'}
      </Box>
    </DemoCard>
  );
}

// ----------------------------------------------------------------------

const AUDIT_STEPS = [600, 1000, 1400, 1800, 2600];

// The report's lines, drawn as bars: the demo shows that there is a report,
// not what it says.
const REPORT_LINES = ['100%', '93%', '97%', '64%'];

/** Independently audited: the report's pages fill in, then the verdict. */
export function AuditDemo() {
  const step = useDemoStep(AUDIT_STEPS, 6500);

  return (
    <DemoCard>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
        <Typography
          sx={{
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: MUTED,
          }}
        >
          Audit report
        </Typography>
        <Box
          component="img"
          src={cdn('homepage/halborn-logo.webp')}
          alt=""
          sx={{
            display: 'block',
            height: 14,
            width: 'auto',
            [`html[${SITE_THEME_ATTR}="dark"] &`]: { filter: 'brightness(0) invert(1)' },
          }}
        />
      </Box>
      <Typography sx={{ mt: 2.5, fontSize: 21, fontWeight: 500, letterSpacing: '-0.02em' }}>
        Normal Savings
      </Typography>
      <Typography sx={{ mt: 0.5, fontSize: 14, color: MUTED }}>
        Smart contract security audit
      </Typography>

      <Box sx={{ display: 'grid', gap: 1.25, mt: 3, pt: 3, borderTop: HAIRLINE }}>
        {REPORT_LINES.map((width, index) => (
          <Box key={width} sx={{ width, height: 10, bgcolor: CANVAS, ...fade(step > index) }} />
        ))}
      </Box>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          mt: 3,
          pt: 2.5,
          borderTop: HAIRLINE,
          ...fade(step > REPORT_LINES.length),
        }}
      >
        <Verdict yes />
        <Box>
          <Typography sx={{ fontSize: 15, fontWeight: 500 }}>Audit complete</Typography>
          <Typography sx={{ fontSize: 13, color: MUTED }}>
            By Halborn, an independent security firm
          </Typography>
        </Box>
      </Box>
    </DemoCard>
  );
}
