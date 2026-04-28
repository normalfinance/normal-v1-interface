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
      emoji: '✨',
      title: t('Simplicity first'),
      body: t('Deposit in minutes. Earn automatically. No strategy required.'),
    },
    {
      emoji: '🔍',
      title: t('Transparency & sovereignty'),
      body: t('Your funds are yours at all times. Every rate, balance, and transaction is visible and verifiable.'),
    },
    {
      emoji: '🧩',
      title: t('Composability & reach'),
      body: t('Built on Stellar and designed to plug into the broader DeFi stack - making Normal the simplest way to access yield today, with real assets like Bitcoin, gold, and commodities coming soon.'),
    },
    {
      emoji: '🌱',
      title: t('Community-led evolution'),
      body: t('We build in public. Our roadmap is open, our decisions are explained, and your feedback shapes what gets built next.'),
    },
  ];

  const shippingCards = [
    {
      emoji: '💵',
      title: t("What we're shipping"),
      body: t('A USDC savings account that pays real yield, automatically'),
    },
    {
      emoji: '💸',
      title: t('Cash in & out'),
      body: t('Cash deposits and withdrawals via MoneyGram, Coinbase, and Stripe'),
    },
    {
      emoji: '🔎',
      title: t('Full transparency'),
      body: t('Full on-chain transparency so you can verify everything yourself'),
    },
    {
      emoji: '🌐',
      title: t('More assets coming'),
      body: t('Crypto, equities, and real assets - coming soon'),
    },
    {
      emoji: '🤝',
      title: t('Our promise'),
      body: t("We default to transparency, prioritize your safety, and build for the long term - not the hype cycle. Help us shape what Normal becomes next by sharing your feedback."),
    },
  ];

  const PillarCard = ({ emoji, title, body }: { emoji: string; title: string; body: string }) => (
    <Paper variant="outlined" sx={{ ...paperSx }}>
      <Stack spacing={2} p={cardPadding} flexGrow={1} justifyContent="flex-start">
        <Typography
          variant="h5"
          sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center' }}
        >
          <span aria-hidden style={{ marginRight: 8 }}>{emoji}</span>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {body}
        </Typography>
      </Stack>
    </Paper>
  );

  return (
    <Box sx={{ px: '5%', py: { xs: 8, md: 12 } }}>
      <Container maxWidth="lg" disableGutters>
        <Stack spacing={3} sx={{ maxWidth: 960 }}>
          <Typography variant="h2" sx={{ fontWeight: 600, lineHeight: 1.05 }}>
            {t("Normal's Product Roadmap")}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {t("Most people are earning next to nothing on their savings. Normal is built to change that - starting with a USDC savings account that pays real yield with no bank in the middle. Simple to use, transparent by design, and built to grow with you.")}
          </Typography>
        </Stack>

        <Grid2 container spacing={2} sx={{ mt: { xs: 4, md: 6 } }}>
          {pillars.map((p, i) => (
            <Grid2 key={i} size={{ xs: 12, sm: 6 }}>
              <PillarCard {...p} />
            </Grid2>
          ))}
        </Grid2>

        <Divider sx={{ my: { xs: 6, md: 8 } }} />

        <Grid2 container spacing={2}>
          {shippingCards.map((card, i) => (
            <Grid2 key={i} size={{ xs: 12, sm: 6 }}>
              <PillarCard {...card} />
            </Grid2>
          ))}
        </Grid2>
      </Container>
    </Box>
  );
}
