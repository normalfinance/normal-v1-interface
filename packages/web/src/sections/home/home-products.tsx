'use client';

import type { ReactNode } from 'react';
import type { HueShades } from '@/theme/brand-colors';

import { cdn } from '@/utils/cdn';
import { TYPE } from '@/theme/type-scale';
import {
  INK,
  MUTED,
  PAPER,
  CANVAS,
  INK_SOFT,
  BRAND_COLORS,
  HAIRLINE_COLOR,
} from '@/theme/brand-colors';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CheckRounded from '@mui/icons-material/CheckRounded';
import ArrowDownwardRounded from '@mui/icons-material/ArrowDownwardRounded';

import { PageSection, GRID_FRAME_SX, SectionHeader } from '@/components/_common/brand';

// ----------------------------------------------------------------------

// Four products as one grid of cells spanning the column. Each cell shows a
// slice of its real screen on a pale wash; the top row has words then slice,
// the bottom row slice then words. Figures are examples. Send gave its cell to
// cash in (Niko 2026-11-16: "replace send with deposit cash and show moneygram
// stripe coinbase").

const BTC = cdn('tokens/bitcoin.webp');
const USDC = cdn('tokens/USDC.webp');

// The ways money comes in, as the app's Add money lists them (onramp-dialog):
// the same partners, the same words.
const PROVIDERS = [
  {
    name: 'MoneyGram',
    detail: 'Cash at a location',
    icon: cdn('icons/moneygram/mgi.webp'),
  },
  { name: 'Stripe', detail: 'Card or bank', icon: '/marketing/providers/stripe.svg' },
  {
    name: 'Coinbase',
    detail: 'Card or bank',
    icon: '/marketing/providers/coinbase.png',
  },
];

/** A card cut from the app, on the cell's pale wash. */
function Slice({ hue, children }: { hue: HueShades; children: ReactNode }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: { xs: 3, md: 5 },
        bgcolor: hue.tint,
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: 340,
          p: '20px',
          border: `1px solid ${HAIRLINE_COLOR}`,
          color: INK,
          bgcolor: PAPER,
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

function Label({ children }: { children: ReactNode }) {
  return <Typography sx={{ ...TYPE.caption, color: MUTED }}>{children}</Typography>;
}

function TokenRow({ icon, name, value }: { icon: string; name: string; value: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <Box component="img" src={icon} alt="" sx={{ width: 32, height: 32, borderRadius: '50%' }} />
      <Typography sx={{ flexGrow: 1, fontSize: 16, fontWeight: 500 }}>{name}</Typography>
      <Typography sx={{ fontSize: 16, fontWeight: 500 }}>{value}</Typography>
    </Box>
  );
}

function ProviderRow({ name, detail, icon }: { name: string; detail: string; icon: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <Box
        component="img"
        src={icon}
        alt=""
        sx={{ width: 36, height: 36, flexShrink: 0, borderRadius: '50%', objectFit: 'cover' }}
      />
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: 16, fontWeight: 500 }}>{name}</Typography>
        <Label>{detail}</Label>
      </Box>
    </Box>
  );
}

const FakeButton = ({ children, ink }: { children: ReactNode; ink?: boolean }) => (
  <Box
    sx={{
      py: '11px',
      fontSize: 14,
      fontWeight: 500,
      textAlign: 'center',
      color: ink ? PAPER : INK,
      bgcolor: ink ? INK : CANVAS,
    }}
  >
    {children}
  </Box>
);

const SAVE = (
  <Slice hue={BRAND_COLORS.mint}>
    <Label>Savings</Label>
    <Typography sx={{ mt: '4px', fontSize: 32, fontWeight: 500, letterSpacing: '-0.03em' }}>
      $2,500.00
    </Typography>
    <Typography sx={{ mt: '4px', fontSize: 14, color: BRAND_COLORS.mint.deep }}>
      +$14.20 this month
    </Typography>
    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', mt: '18px' }}>
      <FakeButton>Add</FakeButton>
      <FakeButton>Withdraw</FakeButton>
    </Box>
  </Slice>
);

const BUY = (
  <Slice hue={BRAND_COLORS.coral}>
    <Label>You buy</Label>
    <Box sx={{ mt: '10px' }}>
      <TokenRow icon={BTC} name="Bitcoin" value="$100.00" />
    </Box>
    <Typography sx={{ mt: '10px', fontSize: 13, color: MUTED }}>
      You get about 0.00114 BTC
    </Typography>
    <Box sx={{ mt: '18px' }}>
      <FakeButton ink>Pay with card</FakeButton>
    </Box>
  </Slice>
);

const SWAP = (
  <Slice hue={BRAND_COLORS.violet}>
    <Label>You pay</Label>
    <Box sx={{ mt: '10px' }}>
      <TokenRow icon={USDC} name="USDC" value="100.00" />
    </Box>
    <Box sx={{ display: 'flex', justifyContent: 'center', my: '8px', color: MUTED }}>
      <ArrowDownwardRounded sx={{ fontSize: 18 }} />
    </Box>
    <Label>You get</Label>
    <Box sx={{ mt: '10px' }}>
      <TokenRow icon={BTC} name="Bitcoin" value="0.00114" />
    </Box>
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        mt: '14px',
        pt: '12px',
        borderTop: `1px solid ${HAIRLINE_COLOR}`,
      }}
    >
      <Typography sx={{ fontSize: 13, color: MUTED }}>Normal fee</Typography>
      <Typography sx={{ fontSize: 13, fontWeight: 500 }}>0.5%</Typography>
    </Box>
  </Slice>
);

const CASH = (
  <Slice hue={BRAND_COLORS.sky}>
    <Label>Add money with</Label>
    <Box sx={{ display: 'grid', gap: '14px', mt: '12px' }}>
      {PROVIDERS.map((provider) => (
        <ProviderRow key={provider.name} {...provider} />
      ))}
    </Box>
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        mt: '16px',
        pt: '14px',
        borderTop: `1px solid ${HAIRLINE_COLOR}`,
      }}
    >
      <CheckRounded sx={{ fontSize: 18, color: BRAND_COLORS.mint.deep }} />
      <Typography sx={{ fontSize: 13.5, color: INK_SOFT }}>Lands in your own wallet</Typography>
    </Box>
  </Slice>
);

type Product = { id: string; label: string; title: string; body: string; slice: ReactNode };

const PRODUCTS: Product[] = [
  {
    id: 'save',
    label: 'Save',
    title: 'Earn on your digital dollars',
    body: 'Move money into Savings and it grows every day. Take it out whenever you want.',
    slice: SAVE,
  },
  {
    id: 'buy',
    label: 'Buy',
    title: 'Own the top crypto',
    body: 'Bitcoin, Ethereum, Solana and Stellar, bought with your card or bank in a few taps.',
    slice: BUY,
  },
  {
    id: 'swap',
    label: 'Swap',
    // Niko 2026-11-16 asked for "cheapest fees". Not claimed: Stellar swaps go
    // through Soroswap alone (api/swap/quote), so nothing is compared and
    // "cheapest" can't be shown. The low fee is a fact: 0.5% (utils/normal-fees).
    title: 'Swap with low fees',
    body: 'Our fee is 0.5%, and you see the rate and every fee before you confirm.',
    slice: SWAP,
  },
  {
    id: 'cash',
    label: 'Cash to crypto',
    title: 'Turn cash into crypto',
    body: 'Pay in cash at a MoneyGram location, or use your card or bank with Stripe or Coinbase.',
    slice: CASH,
  },
];

function Words({ product }: { product: Product }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', p: { xs: 3, md: 5 } }}>
      <Typography sx={{ ...TYPE.small, fontWeight: 500, color: MUTED }}>{product.label}</Typography>
      <Typography component="h3" sx={{ ...TYPE.h3, mt: 'auto', pt: 4, color: INK }}>
        {product.title}
      </Typography>
      <Typography sx={{ ...TYPE.body, mt: 1.5, color: MUTED }}>{product.body}</Typography>
    </Box>
  );
}

export function HomeProducts() {
  return (
    <PageSection divider hatchFoot aria-labelledby="products-title">
      <SectionHeader
        id="products-title"
        eyebrow="What you can do"
        title="Everything your money needs"
        subtitle="Four things, done well. Nothing you don't need."
      />
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
          ...GRID_FRAME_SX,
        }}
      >
        {PRODUCTS.map((product, index) => {
          const flip = index >= 2;
          return (
            <Box
              key={product.id}
              id={product.id}
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                scrollMarginTop: 96,
                borderTop: {
                  xs: index > 0 ? `1px solid ${HAIRLINE_COLOR}` : 'none',
                  md: index > 1 ? `1px solid ${HAIRLINE_COLOR}` : 'none',
                },
                borderLeft: { md: index % 2 === 1 ? `1px solid ${HAIRLINE_COLOR}` : 'none' },
              }}
            >
              {/* On phones the words always come first; on wider screens the bottom row flips. */}
              <Box sx={{ order: { xs: 1, sm: flip ? 2 : 1 } }}>
                <Words product={product} />
              </Box>
              <Box sx={{ order: { xs: 2, sm: flip ? 1 : 2 }, display: 'grid' }}>
                {product.slice}
              </Box>
            </Box>
          );
        })}
      </Box>
    </PageSection>
  );
}
