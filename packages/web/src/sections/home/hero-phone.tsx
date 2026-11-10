'use client';

import type { ReactNode } from 'react';
import type { Point } from '@/utils/homography';

import { cdn } from '@/utils/cdn';
import { matrix3dOnto } from '@/utils/homography';
import { useRef, useState, useEffect } from 'react';
import { FIXED, HUE_PALETTE } from '@/theme/brand-colors';

import Box from '@mui/material/Box';
import HomeIcon from '@mui/icons-material/Home';
import Typography from '@mui/material/Typography';
import AddRounded from '@mui/icons-material/AddRounded';
import SyncAltRounded from '@mui/icons-material/SyncAltRounded';
import SavingsOutlined from '@mui/icons-material/SavingsOutlined';
import NorthEastRounded from '@mui/icons-material/NorthEastRounded';
import SouthWestRounded from '@mui/icons-material/SouthWestRounded';
import SwapHorizRounded from '@mui/icons-material/SwapHorizRounded';
import DonutSmallOutlined from '@mui/icons-material/DonutSmallOutlined';
import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded';
import ReceiptLongOutlined from '@mui/icons-material/ReceiptLongOutlined';
import AccountBalanceWalletOutlined from '@mui/icons-material/AccountBalanceWalletOutlined';

import { MarketingPhoto } from '@/components/_common/marketing-photo';

// ----------------------------------------------------------------------

// The hero photo (public/marketing/hero-wide*.jpg, every size the same
// shape): its size and the four corners of the phone's blank screen in its own
// pixels, found by edge detection. The page crops it (object-fit: cover) at a
// focus that moves with the screen width, HERO_FOCUS: centred on wide screens,
// where the words sit to the phone's left, and on the phone itself on narrow
// ones, where the words go under the photo. The Home screen below is drawn at
// phone size and mapped onto the corners wherever the crop puts them, so it is
// crisp at any width. For a new photo, redo the four corners.
const PHOTO = { width: 3456, height: 1440 };
const SCREEN_CORNERS: readonly Point[] = [
  [2028.5, 143.5],
  [2534.4, 143.3],
  [2527.5, 1232.7],
  [2028.5, 1226.9],
];
const HERO_FOCUS = { xs: '73% 50%', sm: '78% 50%', md: '50% 50%' };
/** The Home screen's drawing size: an iPhone's, in CSS pixels. */
export const SCREEN = { width: 390, height: 844 };

// The app is drawn as it looks today, whatever mode the page is in: it is on a
// phone in a photo, not part of the page.
const {
  ink: INK,
  inkSoft: INK_SOFT,
  muted: MUTED,
  paper: PAPER,
  canvas: CANVAS,
  hairline: HAIRLINE_COLOR,
  hairlineStrong: HAIRLINE_STRONG,
} = FIXED.app;
const MINT = HUE_PALETTE.mint;

// The story the screen tells: Ana's $50 arrives, the balance counts up.
const BALANCE_BEFORE = 4280.5;
const BALANCE_AFTER = 4330.5;

const money = (n: number) =>
  `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const ACTIONS = [
  { label: 'Add money', icon: <AddRounded /> },
  { label: 'Send', icon: <NorthEastRounded /> },
  { label: 'Receive', icon: <SouthWestRounded /> },
  { label: 'Swap', icon: <SwapHorizRounded /> },
];

// Home's "Your money", as the app lists it: Savings first, then the coins, a
// line under each. The digital dollars arrive with Ana's payment.
const HOLDINGS = [
  {
    name: 'Savings',
    icon: cdn('logo/logo-single.svg'),
    sub: 'Earning every day',
    value: '$2,500.00',
  },
  {
    name: 'Bitcoin',
    icon: cdn('tokens/bitcoin.webp'),
    sub: '0.0142 BTC',
    value: '$1,240.18',
    change: -0.8,
  },
  {
    name: 'Ethereum',
    icon: cdn('tokens/ethereum.webp'),
    sub: '0.13 ETH',
    value: '$330.32',
    change: 0.5,
  },
  {
    name: 'Solana',
    icon: cdn('tokens/solana.webp'),
    sub: '1.4 SOL',
    value: '$210.00',
    change: 2.1,
  },
];

// The phone's tabs: places only, the current one filled (no black button).
const TABS = [
  { label: 'Home', icon: <HomeIcon /> },
  { label: 'Assets', icon: <AccountBalanceWalletOutlined /> },
  { label: 'Indexes', icon: <DonutSmallOutlined /> },
  { label: 'Savings', icon: <SavingsOutlined /> },
  { label: 'Activity', icon: <ReceiptLongOutlined /> },
];

function HoldingRow({
  icon,
  name,
  sub,
  value,
  change,
  sx,
}: {
  icon: string;
  name: string;
  sub: string;
  value: string;
  change?: number;
  sx?: object;
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        minHeight: 60,
        py: '10px',
        borderBottom: `1px solid ${HAIRLINE_COLOR}`,
        ...sx,
      }}
    >
      <Box component="img" src={icon} alt="" sx={{ width: 40, height: 40, borderRadius: '50%' }} />
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: 15, fontWeight: 500, color: INK }}>{name}</Typography>
        <Typography sx={{ mt: '2px', fontSize: 13.5, color: MUTED }}>{sub}</Typography>
      </Box>
      <Box sx={{ textAlign: 'right' }}>
        <Typography sx={{ fontSize: 15, fontWeight: 500, color: INK }}>{value}</Typography>
        {change !== undefined && (
          <Typography
            sx={{ mt: '2px', fontSize: 13.5, color: change > 0 ? MINT.light.deep : MUTED }}
          >
            {`${change > 0 ? '+' : '−'}${Math.abs(change).toFixed(2)}%`}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

/** The top of every drawn screen: the time, the signal and the notch. */
export function PhoneStatusBar() {
  return (
    <>
      <Box
        sx={{
          position: 'absolute',
          top: 16,
          left: 34,
          right: 30,
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 16,
          fontWeight: 500,
          color: INK,
        }}
      >
        <span>9:41</span>
        <Box component="span" sx={{ fontSize: 11, letterSpacing: '1px' }}>
          ●●● ▮
        </Box>
      </Box>
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: '50%',
          width: 156,
          height: 32,
          ml: '-78px',
          bgcolor: INK,
          // Part of the phone drawing, like the screen's corners.
          borderBottomLeftRadius: 16,
          borderBottomRightRadius: 16,
        }}
      />
    </>
  );
}

/**
 * The app's Home, at phone size (390 × 844), as it looks today: the top bar
 * (the mark, Move money, the account), the balance and its four tiles with a
 * line under them, "Your money" as an open list, and the tabs. Also drawn in
 * the closing carousel (HomeCta) and on the sign-in page.
 */
export function PhoneHomeScreen({
  balance,
  showToast,
  showPayment,
}: {
  balance: number;
  showToast: boolean;
  showPayment: boolean;
}) {
  return (
    <Box
      // The phone in the photo has round screen corners; this matches them. It
      // is a measurement of the photo, not a design token.
      style={{ borderRadius: 38 }}
      sx={{
        position: 'relative',
        width: SCREEN.width,
        height: SCREEN.height,
        overflow: 'hidden',
        px: '16px',
        pt: '50px',
        color: INK,
        bgcolor: PAPER,
      }}
    >
      <PhoneStatusBar />

      {/* Ana's payment lands */}
      <Box
        sx={{
          position: 'absolute',
          zIndex: 1,
          top: 50,
          left: 14,
          right: 14,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          p: '10px 12px',
          border: `1px solid ${HAIRLINE_COLOR}`,
          borderRadius: 'var(--radius-lg)',
          bgcolor: PAPER,
          opacity: showToast ? 1 : 0,
          transition: 'opacity 450ms ease',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 34,
            height: 34,
            borderRadius: '50%',
            fontSize: 14,
            fontWeight: 500,
            bgcolor: CANVAS,
          }}
        >
          A
        </Box>
        <Box sx={{ flexGrow: 1 }}>
          <Typography sx={{ fontSize: 14.5, fontWeight: 500 }}>Ana sent you $50.00</Typography>
          <Typography sx={{ fontSize: 12.5, color: MUTED }}>Just now · Digital dollars</Typography>
        </Box>
      </Box>

      {/* The app's top bar on a phone: the mark, Move money, the account */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          height: 60,
          mx: '-16px',
          px: '16px',
          borderBottom: `1px solid ${HAIRLINE_COLOR}`,
        }}
      >
        <Box
          component="img"
          src={cdn('logo/logo-single.svg')}
          alt=""
          sx={{ width: 28, height: 28 }}
        />
        <Box sx={{ flexGrow: 1 }} />
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            height: 34,
            px: '11px',
            fontSize: 13.5,
            fontWeight: 500,
            border: `1px solid ${HAIRLINE_STRONG}`,
            '& svg': { fontSize: 17 },
          }}
        >
          <SyncAltRounded />
          Move money
        </Box>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 36,
            height: 36,
            borderRadius: '50%',
            fontSize: 14,
            fontWeight: 500,
            border: `1px solid ${HAIRLINE_COLOR}`,
          }}
        >
          M
        </Box>
      </Box>

      {/* The balance and its four tiles, a line under them */}
      <Box sx={{ pt: '22px', pb: '20px', borderBottom: `1px solid ${HAIRLINE_COLOR}` }}>
        <Typography sx={{ fontSize: 14, color: MUTED }}>Total balance</Typography>
        <Typography sx={{ mt: '4px', fontSize: 40, fontWeight: 500, letterSpacing: '-0.035em' }}>
          {money(balance)}
        </Typography>
        <Typography sx={{ mt: '2px', fontSize: 14, color: MUTED }}>
          +$12.40 in the last 24 hours
        </Typography>
        <Box
          sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', mt: '18px' }}
        >
          {ACTIONS.map((action) => (
            <Box
              key={action.label}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                py: '12px',
                bgcolor: CANVAS,
                '& svg': { fontSize: 21 },
              }}
            >
              {action.icon}
              <Typography component="span" sx={{ fontSize: 12.5, fontWeight: 500 }}>
                {action.label}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Your money: an open list, a line under each row */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 40,
          mt: '12px',
        }}
      >
        <Typography sx={{ fontSize: 15, fontWeight: 500, color: INK_SOFT }}>Your money</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', fontSize: 14, fontWeight: 500 }}>
          All assets
          <ChevronRightRounded sx={{ fontSize: 18 }} />
        </Box>
      </Box>
      {HOLDINGS.map((holding) => (
        <HoldingRow key={holding.name} {...holding} />
      ))}
      <HoldingRow
        icon={cdn('tokens/USDC.webp')}
        name="Digital dollars"
        sub="50 USDC"
        value="$50.00"
        sx={{ opacity: showPayment ? 1 : 0, transition: 'opacity 600ms ease' }}
      />

      <Box
        sx={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          height: 84,
          pt: '10px',
          px: '6px',
          borderTop: `1px solid ${HAIRLINE_COLOR}`,
          bgcolor: PAPER,
        }}
      >
        {TABS.map((tab, index) => (
          <Box
            key={tab.label}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              fontSize: 11,
              fontWeight: 500,
              color: index === 0 ? INK : MUTED,
              '& svg': { fontSize: 22 },
            }}
          >
            {tab.icon}
            {tab.label}
          </Box>
        ))}
      </Box>
    </Box>
  );
}

/**
 * The hero photo with the live Home screen laid over the phone in it. Fills
 * its box, reads where the page's crop puts the photo, and maps the screen onto
 * the phone's corners. `focus` sets the crop for another box: the sign-in
 * page's panel is portrait, so it keeps the phone in the middle (Niko
 * 2026-11-10: real people using the phone app, not the laptop mockup).
 */
export function HeroPhone({
  focus = HERO_FOCUS,
}: {
  focus?: string | Record<string, string>;
} = {}): ReactNode {
  const ref = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState<string | null>(null);
  const [stage, setStage] = useState(0);
  const [balance, setBalance] = useState(BALANCE_BEFORE);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const fit = () => {
      const { width, height } = el.getBoundingClientRect();
      const photo = el.querySelector('img');
      if (!width || !height || !photo) return;
      // The focus the page applied at this width, e.g. "73% 50%".
      const [focusX, focusY] = getComputedStyle(photo)
        .objectPosition.split(' ')
        .map((value) => parseFloat(value) / 100);
      const scale = Math.max(width / PHOTO.width, height / PHOTO.height);
      const offsetX = (width - PHOTO.width * scale) * focusX;
      const offsetY = (height - PHOTO.height * scale) * focusY;
      const corners = SCREEN_CORNERS.map(
        ([x, y]) => [x * scale + offsetX, y * scale + offsetY] as const
      );
      setTransform(matrix3dOnto(SCREEN.width, SCREEN.height, corners));
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Once, on arrival: the toast, the payment, then the toast goes. With reduced
  // motion the screen simply shows the end.
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setStage(3);
      setBalance(BALANCE_AFTER);
      return undefined;
    }
    const timers = [
      setTimeout(() => setStage(1), 1600),
      setTimeout(() => setStage(2), 2100),
      setTimeout(() => setStage(3), 6000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (stage !== 2) return undefined;
    const started = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - started) / 900);
      const eased = 1 - (1 - progress) ** 3;
      setBalance(BALANCE_BEFORE + (BALANCE_AFTER - BALANCE_BEFORE) * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [stage]);

  return (
    <Box ref={ref} sx={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <MarketingPhoto slot="hero" sx={{ position: 'absolute', inset: 0, objectPosition: focus }} />
      <Box
        aria-hidden="true"
        style={{ transform: transform ?? undefined }}
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: SCREEN.width,
          height: SCREEN.height,
          pointerEvents: 'none',
          transformOrigin: '0 0',
          opacity: transform ? 1 : 0,
          transition: 'opacity 250ms ease',
        }}
      >
        <PhoneHomeScreen
          balance={balance}
          showToast={stage === 1 || stage === 2}
          showPayment={stage >= 2}
        />
      </Box>
    </Box>
  );
}
