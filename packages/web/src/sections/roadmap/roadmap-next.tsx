'use client';

import { TYPE } from '@/theme/type-scale';
import { INK, MUTED, BRAND_COLORS } from '@/theme/brand-colors';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import {
  Eyebrow,
  HAIRLINE,
  GUTTER_SX,
  PageSection,
  GRID_FRAME_SX,
  SectionHeader,
} from '@/components/_common/brand';

// ----------------------------------------------------------------------

// The featured card's figures. No rate: a number is live or left out. The
// deposits figure is the April 2026 milestone, dated so it doesn't read as live.
const FIGURES = [
  { value: '$24M+', label: 'In deposits by April 2026' },
  { value: '0', label: 'Lockups' },
];

const ALSO = [
  {
    label: 'Cash in & out',
    title: '50+ countries, one tap.',
    body: 'Fiat ramps via Stripe, Coinbase, MoonPay, SEPA and ACH. Deposits clear in minutes, not days.',
  },
  {
    label: 'Full transparency',
    title: 'Every balance, on-chain.',
    body: 'Verify each rate, balance and transaction yourself. No black boxes, no asterisks, no surprises.',
  },
  {
    label: 'More assets coming',
    title: 'Crypto, equities and RWAs.',
    body: 'More tokens next. Tokenized treasuries and ETFs after that. One account, every asset.',
  },
];

/**
 * The work in motion: the top item featured on the savings wash, which fills
 * its cell between the frame line and the grid, its figures at the foot; the
 * rest as plain cells beside it. Every word on the wash is the deep green.
 */
export function RoadmapNext() {
  const mint = BRAND_COLORS.mint;

  return (
    <PageSection divider hatchFoot aria-labelledby="next-title">
      <SectionHeader
        id="next-title"
        eyebrow="What we're building right now"
        title="The next 90 days."
        subtitle="A snapshot of the work in motion. Specifics may shift, but the direction stays."
      />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' },
          ...GRID_FRAME_SX,
        }}
      >
        <Box
          sx={{
            gridRow: { md: 'span 3' },
            display: 'flex',
            flexDirection: 'column',
            py: { xs: 5, md: 7 },
            px: { xs: 2, sm: 3, md: 7 },
            color: mint.deep,
            bgcolor: mint.tint,
          }}
        >
          <Eyebrow sx={{ color: 'inherit' }}>In progress · #1</Eyebrow>
          <Typography component="h3" sx={{ ...TYPE.statement, mt: 2.5, color: 'inherit' }}>
            A USDC savings account that pays real yield, automatically.
          </Typography>
          <Typography sx={{ ...TYPE.lead, mt: 2.5, maxWidth: 520, color: 'inherit' }}>
            Auto-compounded into audited Stellar lending pools. No active management, no claiming.
          </Typography>

          {/* The figures at the foot of the card, as on the home page's Savings. */}
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              rowGap: 3,
              mt: { xs: 5, md: 'auto' },
              pt: { md: 7 },
            }}
          >
            {FIGURES.map((figure) => (
              <Box
                key={figure.label}
                sx={{ pl: 2, pr: 4, maxWidth: 240, borderLeft: `1px solid ${mint.deep}` }}
              >
                <Typography sx={{ ...TYPE.h3, color: 'inherit' }}>{figure.value}</Typography>
                <Typography sx={{ ...TYPE.small, mt: 0.5, color: 'inherit' }}>
                  {figure.label}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>

        {ALSO.map((item, index) => (
          <Box
            key={item.label}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              ...GUTTER_SX,
              pt: { xs: 3, md: 4 },
              pb: 4,
              borderTop: { xs: HAIRLINE, md: index > 0 ? HAIRLINE : 'none' },
              borderLeft: { md: HAIRLINE },
            }}
          >
            <Typography sx={{ ...TYPE.small, fontWeight: 500, color: MUTED }}>
              {item.label}
            </Typography>
            <Typography
              component="h3"
              sx={{ ...TYPE.h4, mt: 'auto', pt: { xs: 2, md: 4 }, color: INK }}
            >
              {item.title}
            </Typography>
            <Typography sx={{ ...TYPE.small, mt: 1, color: MUTED }}>{item.body}</Typography>
          </Box>
        ))}
      </Box>
    </PageSection>
  );
}
