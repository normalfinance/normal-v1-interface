'use client';

import { useTranslate } from '@/locales';

import Grid2 from '@mui/material/Grid2';
import { Box, Stack, Paper, Divider, Container, Typography } from '@mui/material';

const paperSx = {
  bgcolor: '#F9FAFB',
  borderRadius: 3,
};

const cardPadding = { xs: 2.5, md: 4 };

export function MissionSection() {
  const { t } = useTranslate();

  const pillars = [
    {
      title: t('Simplicity first'),
      body: t('One-click, diversified exposure. Clear fees. Plain-language UX.'),
      emoji: '✨',
    },
    {
      title: t('Transparency & sovereignty'),
      body: t('Fully on-chain design, open data, verifiable rules; you keep your keys.'),
      emoji: '🔍',
    },
    {
      title: t('Composability & reach'),
      body: t(
        'Built for fast, low-cost rails (Stellar) and designed to plug into the broader DeFi stack.'
      ),
      emoji: '🧩',
    },
    {
      title: t('Community-led evolution'),
      body: t(
        'Roadmaps in public, feedback loops with users, and indexes that reflect real needs.'
      ),
      emoji: '🌱',
    },
  ];

  const shippingItems = [
    t('On-chain index funds with programmable rebalancing and guardrails'),
    t('Synthetic assets that broaden access to diversified exposures'),
    t('Open analytics, proofs of rebalance, and audit-friendly data'),
    t('Education and UX that lowers the learning curve for everyone'),
  ];

  return (
    <Box sx={{ px: '5%', py: { xs: 8, md: 12 } }}>
      <Container maxWidth="lg" disableGutters>
        <Stack spacing={3} sx={{ maxWidth: 960 }}>
          <Typography variant="h2" sx={{ fontWeight: 800, lineHeight: 1.05 }}>
            {t('Normal’s Product Roadmap')}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {t(
              'Our mission: to make sophisticated, low-cost crypto investing accessible to everyone — by turning complex on-chain primitives into simple, transparent index products.'
            )}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {t(
              'Most people don’t have time to chase tokens, rebalance portfolios, or audit contracts. They want safety rails, fair fees, and a clear path to diversified exposure. We build that path — non-custodial, verifiable, and easy to use.'
            )}
          </Typography>
        </Stack>

        <Grid2 container spacing={2} sx={{ mt: { xs: 4, md: 6 } }}>
          {pillars.map((p, i) => (
            <Grid2 key={i} size={{ xs: 12, sm: 6 }}>
              <Paper variant="outlined" sx={{ ...paperSx }}>
                <Stack spacing={2} p={cardPadding} flexGrow={1} justifyContent="flex-start">
                  <Typography
                    variant="h5"
                    sx={{ fontWeight: 800, mb: 1, display: 'flex', alignItems: 'center' }}
                  >
                    <span aria-hidden style={{ marginRight: 8 }}>
                      {p.emoji}
                    </span>
                    {p.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {p.body}
                  </Typography>
                </Stack>
              </Paper>
            </Grid2>
          ))}
        </Grid2>

        <Divider sx={{ my: { xs: 6, md: 8 } }} />

        <Grid2 container spacing={2}>
          <Grid2 size={{ xs: 12, md: 6 }}>
            <Paper variant="outlined" sx={{ ...paperSx }}>
              <Stack spacing={2} p={cardPadding} flexGrow={1} justifyContent="flex-start">
                <Typography variant="overline" sx={{ fontWeight: 700, letterSpacing: 1 }}>
                  {t('What we’re shipping')}
                </Typography>
                <Box component="ul" sx={{ m: 0 }}>
                  {shippingItems.map((text, idx) => (
                    <Box
                      key={idx}
                      component="li"
                      sx={{ '&::marker': { color: 'text.secondary' }, mb: 1 }}
                    >
                      <Typography variant="body1">• {text}</Typography>
                    </Box>
                  ))}
                </Box>
              </Stack>
            </Paper>
          </Grid2>

          <Grid2 size={{ xs: 12, md: 6 }}>
            <Paper variant="outlined" sx={{ ...paperSx }}>
              <Stack spacing={2} p={cardPadding} flexGrow={1} justifyContent="flex-start">
                <Typography variant="overline" sx={{ fontWeight: 700, letterSpacing: 1 }}>
                  {t('Our promise')}
                </Typography>
                <Typography variant="body1" sx={{ mt: 1.5 }}>
                  {t(
                    'We default to transparency, prioritize user safety, and align incentives with long-term outcomes — not hype. Help us shape the future of on-chain indexes by sharing feedback and co-creating what gets built next.'
                  )}
                </Typography>
              </Stack>
            </Paper>
          </Grid2>
        </Grid2>
      </Container>
    </Box>
  );
}
