'use client';

import type { ReactNode } from 'react';
import type { Point } from '@/utils/homography';

import { cdn } from '@/utils/cdn';
import { matrix3dOnto } from '@/utils/homography';
import { useRef, useState, useEffect } from 'react';
import { FIXED, HUE_PALETTE } from '@/theme/brand-colors';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import AddRounded from '@mui/icons-material/AddRounded';
import HomeOutlined from '@mui/icons-material/HomeOutlined';
import SyncAltRounded from '@mui/icons-material/SyncAltRounded';
import SavingsOutlined from '@mui/icons-material/SavingsOutlined';
import NorthEastRounded from '@mui/icons-material/NorthEastRounded';
import SouthWestRounded from '@mui/icons-material/SouthWestRounded';
import SwapHorizRounded from '@mui/icons-material/SwapHorizRounded';
import ReceiptLongOutlined from '@mui/icons-material/ReceiptLongOutlined';
import NotificationsNoneRounded from '@mui/icons-material/NotificationsNoneRounded';
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
  muted: MUTED,
  paper: PAPER,
  canvas: CANVAS,
  hairline: HAIRLINE_COLOR,
} = FIXED.app;
const MINT = HUE_PALETTE.mint;

// The story the screen tells: Ana's $50 arrives, the balance counts up.
const BALANCE_BEFORE = 4280.5;
const BALANCE_AFTER = 4330.5;

const money = (n: number) =>
  `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const ACTIONS = [
  { label: 'Add', icon: <AddRounded /> },
  { label: 'Send', icon: <NorthEastRounded /> },
  { label: 'Swap', icon: <SwapHorizRounded /> },
  { label: 'Receive', icon: <SouthWestRounded /> },
];

const ASSETS = [
  { name: 'Bitcoin', icon: cdn('tokens/bitcoin.webp'), amount: '0.0142 BTC', value: '$1,240.18' },
  { name: 'Ethereum', icon: cdn('tokens/ethereum.webp'), amount: '0.13 ETH', value: '$330.32' },
  { name: 'Solana', icon: cdn('tokens/solana.webp'), amount: '1.40 SOL', value: '$210.00' },
];

const TABS = [
  { label: 'Home', icon: <HomeOutlined /> },
  { label: 'Assets', icon: <AccountBalanceWalletOutlined /> },
  { label: 'Move', icon: <SyncAltRounded /> },
  { label: 'Savings', icon: <SavingsOutlined /> },
  { label: 'Activity', icon: <ReceiptLongOutlined /> },
];

function AssetRow({
  icon,
  name,
  amount,
  value,
  sx,
}: {
  icon: string;
  name: string;
  amount: string;
  value: string;
  sx?: object;
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        py: '9px',
        borderTop: `1px solid ${HAIRLINE_COLOR}`,
        ...sx,
      }}
    >
      <Box component="img" src={icon} alt="" sx={{ width: 38, height: 38, borderRadius: '50%' }} />
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: 16, fontWeight: 500, color: INK }}>{name}</Typography>
        <Typography sx={{ fontSize: 13, color: MUTED }}>{amount}</Typography>
      </Box>
      <Typography sx={{ fontSize: 16, fontWeight: 500, color: INK }}>{value}</Typography>
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

/** The app's Home, at phone size (390 × 844). Also drawn in the closing carousel (HomeCta). */
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
        px: '22px',
        pt: '58px',
        color: INK,
        bgcolor: PAPER,
      }}
    >
      <PhoneStatusBar />

      {/* Ana's payment lands */}
      <Box
        sx={{
          position: 'absolute',
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

      <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px', mt: '6px', mb: '22px' }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 36,
            height: 36,
            borderRadius: '50%',
            fontSize: 15,
            fontWeight: 500,
            color: PAPER,
            bgcolor: INK,
          }}
        >
          M
        </Box>
        <Typography sx={{ flexGrow: 1, fontSize: 16, fontWeight: 500 }}>Hi, Maya</Typography>
        <NotificationsNoneRounded sx={{ fontSize: 24 }} />
      </Box>

      <Typography sx={{ fontSize: 14, color: MUTED }}>Total balance</Typography>
      <Typography sx={{ mt: '4px', fontSize: 42, fontWeight: 500, letterSpacing: '-0.035em' }}>
        {money(balance)}
      </Typography>
      <Typography sx={{ mt: '2px', fontSize: 14, color: MINT.light.deep }}>
        +$12.40 today
      </Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', my: '18px' }}>
        {ACTIONS.map((action) => (
          <Box
            key={action.label}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px',
              py: '10px',
              borderRadius: 'var(--radius-md)',
              bgcolor: CANVAS,
              '& svg': { fontSize: 22 },
            }}
          >
            {action.icon}
            <Typography component="span" sx={{ fontSize: 12.5, fontWeight: 500 }}>
              {action.label}
            </Typography>
          </Box>
        ))}
      </Box>

      <Box sx={{ p: '16px', borderRadius: 'var(--radius-lg)', color: PAPER, bgcolor: INK }}>
        <Typography sx={{ fontSize: 14, color: 'rgba(255,255,255,0.72)' }}>Savings</Typography>
        <Typography sx={{ my: '4px', fontSize: 28, fontWeight: 500, letterSpacing: '-0.02em' }}>
          $2,500.00
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: MINT.fill }} />
          <Typography sx={{ fontSize: 14, color: 'rgba(255,255,255,0.72)' }}>
            Earning daily
          </Typography>
        </Box>
      </Box>

      <Typography sx={{ mt: '16px', mb: '2px', fontSize: 14, color: MUTED }}>Assets</Typography>
      {ASSETS.map((asset, index) => (
        <AssetRow
          key={asset.name}
          {...asset}
          sx={index === 0 ? { borderTop: 'none' } : undefined}
        />
      ))}
      <AssetRow
        icon={cdn('tokens/USDC.webp')}
        name="Digital dollars"
        amount="50.00 USDC"
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
            {tab.label === 'Move' ? (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 44,
                  height: 30,
                  borderRadius: 'var(--radius-md)',
                  color: PAPER,
                  bgcolor: INK,
                  '& svg': { fontSize: 20 },
                }}
              >
                {tab.icon}
              </Box>
            ) : (
              tab.icon
            )}
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
 * the phone's corners.
 */
export function HeroPhone(): ReactNode {
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
      <MarketingPhoto
        slot="hero"
        sx={{ position: 'absolute', inset: 0, objectPosition: HERO_FOCUS }}
      />
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
