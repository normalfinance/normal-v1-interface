'use client';

import type { ReactNode } from 'react';

import { cdn } from '@/utils/cdn';
import { FIXED, HUE_PALETTE } from '@/theme/brand-colors';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import AddRounded from '@mui/icons-material/AddRounded';
import CheckRounded from '@mui/icons-material/CheckRounded';
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import SouthWestRounded from '@mui/icons-material/SouthWestRounded';
import CreditCardRounded from '@mui/icons-material/CreditCardRounded';
import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded';
import ArrowDownwardRounded from '@mui/icons-material/ArrowDownwardRounded';
import VerifiedUserOutlined from '@mui/icons-material/VerifiedUserOutlined';
import AccountBalanceOutlined from '@mui/icons-material/AccountBalanceOutlined';

import { SCREEN, PhoneStatusBar } from './hero-phone';

// ----------------------------------------------------------------------

// The app as it looks today, whatever mode the page is in, like the hero's
// Home screen: these are drawings of a phone, not part of the page. Figures are
// examples, the same ones the product cards use.
const {
  ink: INK,
  muted: MUTED,
  paper: PAPER,
  canvas: CANVAS,
  hairline: HAIRLINE_COLOR,
} = FIXED.app;
const MINT = HUE_PALETTE.mint;
const BTC = cdn('tokens/bitcoin.webp');
const USDC = cdn('tokens/USDC.webp');

const BEZEL = 10;

/**
 * A drawn screen in a phone, rising from the foot of its cell and cut off by
 * it. A drawing of a device, so it keeps the phone's own corners, like the hero
 * phone's screen (DESIGN.md). Scaled to fit the cell at each width.
 */
export function PhoneDevice({ children }: { children: ReactNode }) {
  return (
    <Box
      aria-hidden="true"
      sx={{
        '--s': { xs: '0.62', md: '0.7', lg: '0.78' },
        position: 'absolute',
        top: { xs: 24, md: 80 },
        left: 0,
        right: 0,
        mx: 'auto',
        width: `calc(${SCREEN.width}px * var(--s) + ${BEZEL * 2}px)`,
        height: `calc(${SCREEN.height}px * var(--s) + ${BEZEL * 2}px)`,
        overflow: 'hidden',
        border: `${BEZEL}px solid ${FIXED.ink}`,
        borderRadius: `calc(38px * var(--s) + ${BEZEL}px)`,
        bgcolor: FIXED.ink,
      }}
    >
      <Box
        sx={{
          width: SCREEN.width,
          height: SCREEN.height,
          transform: 'scale(var(--s))',
          transformOrigin: '0 0',
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

/** A screen under the Home screen: the status bar, a back arrow and its title. */
function Screen({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Box
      // The phone's screen corners, as on the hero phone.
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
      <Box sx={{ display: 'flex', alignItems: 'center', gap: '12px', mt: '6px', mb: '24px' }}>
        <ArrowBackRounded sx={{ fontSize: 24 }} />
        <Typography sx={{ fontSize: 18, fontWeight: 500 }}>{title}</Typography>
      </Box>
      {children}
    </Box>
  );
}

const Muted = ({ children, sx }: { children: ReactNode; sx?: object }) => (
  <Typography sx={{ fontSize: 13.5, color: MUTED, ...sx }}>{children}</Typography>
);

/** A grey field: a label, then what is in it. */
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Box sx={{ p: '16px', borderRadius: 'var(--radius-lg)', bgcolor: CANVAS }}>
      <Muted>{label}</Muted>
      <Box sx={{ mt: '10px' }}>{children}</Box>
    </Box>
  );
}

function Token({
  icon,
  name,
  sub,
  value,
}: {
  icon: string;
  name: string;
  sub: string;
  value: string;
}) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <Box component="img" src={icon} alt="" sx={{ width: 38, height: 38, borderRadius: '50%' }} />
      <Box sx={{ flexGrow: 1 }}>
        <Typography sx={{ fontSize: 16, fontWeight: 500 }}>{name}</Typography>
        <Muted>{sub}</Muted>
      </Box>
      <Typography sx={{ fontSize: 20, fontWeight: 500, letterSpacing: '-0.02em' }}>
        {value}
      </Typography>
    </Box>
  );
}

/** A row of a list: a round icon, two lines, a figure. */
function Row({
  icon,
  title,
  sub,
  value,
  positive,
}: {
  icon: ReactNode;
  title: string;
  sub: string;
  value?: string;
  positive?: boolean;
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        py: '12px',
        borderTop: `1px solid ${HAIRLINE_COLOR}`,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          width: 38,
          height: 38,
          borderRadius: '50%',
          bgcolor: CANVAS,
          '& svg': { fontSize: 20 },
        }}
      >
        {icon}
      </Box>
      <Box sx={{ flexGrow: 1 }}>
        <Typography sx={{ fontSize: 16, fontWeight: 500 }}>{title}</Typography>
        <Muted>{sub}</Muted>
      </Box>
      {value && (
        <Typography sx={{ fontSize: 16, fontWeight: 500, color: positive ? MINT.light.deep : INK }}>
          {value}
        </Typography>
      )}
    </Box>
  );
}

const Button = ({ children, soft }: { children: ReactNode; soft?: boolean }) => (
  <Box
    sx={{
      py: '15px',
      fontSize: 15,
      fontWeight: 500,
      textAlign: 'center',
      borderRadius: 'var(--radius-md)',
      color: soft ? INK : PAPER,
      bgcolor: soft ? CANVAS : INK,
    }}
  >
    {children}
  </Box>
);

/** Swap: dollars to Bitcoin, the rate and fee shown first. */
export function SwapScreen() {
  return (
    <Screen title="Swap">
      <Field label="You pay">
        <Token icon={USDC} name="Digital dollars" sub="USDC" value="100.00" />
      </Field>
      <Box sx={{ display: 'flex', justifyContent: 'center', my: '-6px', position: 'relative' }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 40,
            height: 40,
            border: `4px solid ${PAPER}`,
            borderRadius: '50%',
            bgcolor: CANVAS,
          }}
        >
          <ArrowDownwardRounded sx={{ fontSize: 18 }} />
        </Box>
      </Box>
      <Field label="You get about">
        <Token icon={BTC} name="Bitcoin" sub="BTC" value="0.00114" />
      </Field>
      <Box
        sx={{
          display: 'flex',
          gap: '10px',
          mt: '18px',
          p: '14px',
          border: `1px solid ${HAIRLINE_COLOR}`,
          borderRadius: 'var(--radius-lg)',
        }}
      >
        <CheckRounded sx={{ fontSize: 20, color: MINT.light.deep }} />
        <Typography sx={{ fontSize: 14, lineHeight: 1.45 }}>
          You see the rate and the fee before you confirm. Nothing moves until you do.
        </Typography>
      </Box>
      <Box sx={{ mt: '22px' }}>
        <Button>Review swap</Button>
      </Box>
    </Screen>
  );
}

/** Send: the moment after, $50 with Ana in seconds. */
export function SendScreen() {
  return (
    <Screen title="Send">
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', pt: '28px' }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 72,
            height: 72,
            borderRadius: '50%',
            color: MINT.light.deep,
            bgcolor: MINT.light.tint,
          }}
        >
          <CheckRounded sx={{ fontSize: 36 }} />
        </Box>
        <Typography sx={{ mt: '20px', fontSize: 40, fontWeight: 500, letterSpacing: '-0.035em' }}>
          $50.00
        </Typography>
        <Typography sx={{ mt: '2px', fontSize: 17, fontWeight: 500 }}>Sent to Ana</Typography>
        <Muted sx={{ mt: '4px' }}>Delivered in 4 seconds</Muted>
      </Box>
      <Box sx={{ mt: '34px', borderBottom: `1px solid ${HAIRLINE_COLOR}` }}>
        {[
          ['To', 'Ana, Lisbon'],
          ['Amount', '50.00 USDC'],
          ['Network', 'Stellar'],
        ].map(([label, value]) => (
          <Box
            key={label}
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              py: '13px',
              borderTop: `1px solid ${HAIRLINE_COLOR}`,
            }}
          >
            <Muted sx={{ fontSize: 15 }}>{label}</Muted>
            <Typography sx={{ fontSize: 15, fontWeight: 500 }}>{value}</Typography>
          </Box>
        ))}
      </Box>
      <Box sx={{ mt: '24px' }}>
        <Button>Done</Button>
      </Box>
    </Screen>
  );
}

/** Add money: Bitcoin with a card, through a licensed partner. */
export function AddMoneyScreen() {
  return (
    <Screen title="Add money">
      <Field label="You buy">
        <Token icon={BTC} name="Bitcoin" sub="You get about 0.00114 BTC" value="$100.00" />
      </Field>
      <Muted sx={{ mt: '22px', mb: '4px' }}>Pay with</Muted>
      <Box sx={{ borderBottom: `1px solid ${HAIRLINE_COLOR}` }}>
        <Row icon={<CreditCardRounded />} title="Card" sub="Visa ending 4821" />
        <Row icon={<AccountBalanceOutlined />} title="Bank transfer" sub="From your bank account" />
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', mt: '16px' }}>
        <VerifiedUserOutlined sx={{ fontSize: 18, color: MUTED }} />
        <Muted>Through our licensed partners</Muted>
      </Box>
      <Box sx={{ mt: '24px' }}>
        <Button>Pay with card</Button>
      </Box>
    </Screen>
  );
}

/** Savings: the balance, earning daily, and what came in. */
export function SavingsScreen() {
  return (
    <Screen title="Savings">
      <Muted>Savings balance</Muted>
      <Typography sx={{ mt: '4px', fontSize: 42, fontWeight: 500, letterSpacing: '-0.035em' }}>
        $2,500.00
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', mt: '4px' }}>
        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: MINT.fill }} />
        <Typography sx={{ fontSize: 14, color: MINT.light.deep }}>
          Earning daily · +$14.20 this month
        </Typography>
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', mt: '20px' }}>
        <Button>Add</Button>
        <Button soft>Withdraw</Button>
      </Box>
      <Muted sx={{ mt: '26px', mb: '4px' }}>Activity</Muted>
      <Box>
        <Row icon={<AddRounded />} title="Earnings" sub="Today" value="+$0.47" positive />
        <Row icon={<AddRounded />} title="Earnings" sub="Yesterday" value="+$0.47" positive />
        <Row
          icon={<SouthWestRounded />}
          title="Added to Savings"
          sub="Last week"
          value="+$500.00"
        />
        <Row icon={<ChevronRightRounded />} title="All activity" sub="Every earning, day by day" />
      </Box>
    </Screen>
  );
}
