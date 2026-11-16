'use client';

import type { IndexWeight } from '@/lib/index/basket';

import { cdn } from '@/utils/cdn';
import { paths } from '@/routes/paths';
import { TYPE } from '@/theme/type-scale';
import { TOP_3 } from '@/lib/index/indexes';
import { useIndexWeights } from '@/hooks/use-index-weights';
import { wireToUsdNumber, minimumPurchaseWire } from '@/lib/index/basket';
import { MUTED, BRAND_COLORS, HAIRLINE_COLOR } from '@/theme/brand-colors';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CheckRounded from '@mui/icons-material/CheckRounded';

import { Eyebrow, COLUMN_SX, BrandButton } from '@/components/_common/brand';

import { fade, DemoCard, useDemoStep } from './security-demos';

// ----------------------------------------------------------------------

// Autoinvest on the home page (Niko 2026-11-16: "we should have autoinvest
// animation on homepage"): the words on the violet wash, and beside them the
// purchase played on a loop, the way the Security demos play. It shows what
// the product does today: one purchase of digital dollars split across
// Bitcoin, Ethereum and Solana by today's market sizes (lib/index/basket.ts),
// each coin bought into the person's own wallet. Shown only where Autoinvest
// is switched on (lib/index/flag.ts), like the app's own pages.

const COINS: Record<string, { name: string; icon: string }> = {
  BTC: { name: 'Bitcoin', icon: cdn('tokens/bitcoin.webp') },
  ETH: { name: 'Ethereum', icon: cdn('tokens/ethereum.webp') },
  SOL: { name: 'Solana', icon: cdn('tokens/solana.webp') },
};

/** Until the market sizes load: the split of mid-November 2026, never shown as live. */
const EXAMPLE_WEIGHTS: IndexWeight[] = [
  { symbol: 'BTC', weightBps: 8310 },
  { symbol: 'ETH', weightBps: 1420 },
  { symbol: 'SOL', weightBps: 270 },
];

/** The coins appear one by one, are bought, then the purchase is done. */
const STEPS = [500, 900, 1300, 2400, 3400] as const;
const LOOP_MS = 7500;

const usd = (value: number) =>
  value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

const percent = (weightBps: number) => `${(weightBps / 100).toFixed(1)}%`;

function AutoinvestDemo() {
  const step = useDemoStep(STEPS, LOOP_MS);
  const { weights: live } = useIndexWeights(TOP_3.def);
  const weights = live ?? EXAMPLE_WEIGHTS;
  // A purchase the product would accept today: $500, or the minimum when the
  // smallest coin's share needs more (lib/index/basket.ts, $10 a coin).
  const minimum = wireToUsdNumber(minimumPurchaseWire(weights));
  const amount = Math.max(500, Math.ceil(minimum / 50) * 50);

  return (
    <DemoCard>
      <Typography sx={{ ...TYPE.caption, color: MUTED }}>Autoinvest · {TOP_3.name}</Typography>
      <Typography sx={{ mt: 0.5, fontSize: 32, fontWeight: 500, letterSpacing: '-0.03em' }}>
        {usd(amount)}
      </Typography>
      <Typography sx={{ fontSize: 13, color: MUTED }}>in digital dollars, one signature</Typography>

      <Box
        component="ul"
        sx={{ display: 'grid', gap: '14px', m: 0, mt: 3, p: 0, listStyle: 'none' }}
      >
        {weights.map((weight, index) => {
          const coin = COINS[weight.symbol];
          return (
            <Box
              component="li"
              key={weight.symbol}
              sx={{ display: 'flex', alignItems: 'center', gap: '12px', ...fade(step > index) }}
            >
              <Box
                component="img"
                src={coin.icon}
                alt=""
                sx={{ width: 32, height: 32, flexShrink: 0, borderRadius: '50%' }}
              />
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography sx={{ fontSize: 15, fontWeight: 500 }}>{coin.name}</Typography>
                <Typography sx={{ fontSize: 12.5, color: MUTED }}>
                  {percent(weight.weightBps)} by market size
                </Typography>
              </Box>
              <Typography sx={{ fontSize: 15, fontWeight: 500 }}>
                {usd((amount * weight.weightBps) / 10_000)}
              </Typography>
              <CheckRounded
                sx={{ fontSize: 18, color: BRAND_COLORS.mint.deep, ...fade(step > 3) }}
              />
            </Box>
          );
        })}
      </Box>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          mt: 3,
          pt: 2,
          borderTop: `1px solid ${HAIRLINE_COLOR}`,
          ...fade(step > 4),
        }}
      >
        <CheckRounded sx={{ fontSize: 18, color: BRAND_COLORS.mint.deep }} />
        <Typography sx={{ fontSize: 13.5 }}>Bought into your own wallets</Typography>
      </Box>
    </DemoCard>
  );
}

const FACTS = [
  { value: 'One', label: 'Signature for the whole purchase' },
  { value: '3 coins', label: 'Weighted by market size' },
];

export function HomeAutoinvest() {
  const violet = BRAND_COLORS.violet;

  return (
    <Box
      component="section"
      id="autoinvest"
      aria-labelledby="autoinvest-title"
      sx={{ scrollMarginTop: 72, borderTop: `1px solid ${HAIRLINE_COLOR}` }}
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '7fr 5fr' },
          ...COLUMN_SX,
          color: violet.deep,
          bgcolor: violet.tint,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            py: { xs: 5, md: 8 },
            px: { xs: 2, sm: 3, md: 7 },
          }}
        >
          <Eyebrow sx={{ color: 'inherit' }}>Autoinvest</Eyebrow>
          <Typography
            id="autoinvest-title"
            component="h2"
            sx={{ ...TYPE.statement, mt: 2.5, color: 'inherit' }}
          >
            Own the top crypto in one go.
          </Typography>
          <Typography sx={{ ...TYPE.lead, mt: 2.5, maxWidth: 520, color: 'inherit' }}>
            Put in digital dollars and Autoinvest splits them across Bitcoin, Ethereum and Solana by
            market size, straight into your own wallets.
          </Typography>

          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              gap: 3,
              mt: { xs: 5, md: 'auto' },
              pt: { md: 7 },
            }}
          >
            <Box sx={{ display: 'flex' }}>
              {FACTS.map((fact) => (
                <Box
                  key={fact.value}
                  sx={{ pl: 2, pr: 3, maxWidth: 200, borderLeft: `1px solid ${violet.deep}` }}
                >
                  <Typography sx={{ ...TYPE.h4, fontSize: 24, color: 'inherit' }}>
                    {fact.value}
                  </Typography>
                  <Typography sx={{ ...TYPE.small, mt: 0.25, color: 'inherit' }}>
                    {fact.label}
                  </Typography>
                </Box>
              ))}
            </Box>
            <BrandButton href={paths.autoinvest.root}>Try Autoinvest</BrandButton>
          </Box>
          <Typography sx={{ ...TYPE.caption, mt: 3, maxWidth: 460, color: 'inherit' }}>
            Each coin&apos;s share follows its market size and changes with it. Fees are about 0.75%
            of each coin (Normal 0.5%, LI.FI 0.25%). Crypto prices go up and down: you can lose
            money.
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: { xs: 3, md: 5 },
            borderLeft: { md: `1px solid ${HAIRLINE_COLOR}` },
            borderTop: { xs: `1px solid ${HAIRLINE_COLOR}`, md: 'none' },
          }}
        >
          <AutoinvestDemo />
        </Box>
      </Box>
    </Box>
  );
}
