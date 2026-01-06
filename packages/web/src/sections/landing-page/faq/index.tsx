'use client';

import * as React from 'react';
import { Icon } from '@iconify/react';
import { useTranslate } from '@/locales';

import { styled } from '@mui/material/styles';
import { Accordion as MuiAccordion } from '@mui/material';
import {
  Box,
  Stack,
  Button,
  Container,
  Typography,
  AccordionDetails,
  AccordionSummary,
  type ButtonProps,
} from '@mui/material';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type Question = { title: string; answer: string };

export interface FaqAccordionProps extends React.ComponentPropsWithoutRef<'section'> {
  heading?: string;
  description?: string;
  questions?: Question[];
  footerHeading?: string;
  footerDescription?: string;
  button?: (ButtonProps & { title: string }) | undefined;
}

/* ------------------------------------------------------------------ */
/*  Defaults                                                          */
/* ------------------------------------------------------------------ */

const DEFAULT_QUESTIONS: Question[] = [
  {
    title: 'How does Normal work?',
    answer:
      'Normal creates a digital version of global assets that are instantly accessible anywhere. Every investment is fully backed by USDC. Our digital assets can be combined into diversified baskets - called index funds - that help you automate your porfolio.',
  },
  {
    title: 'What assets does Normal support?',
    answer:
      "We integrate new assets every week. We're building support for the top 100 cryptocurrencies and popular equities, commodotities, FX pairs, ETFs, and more.",
  },
  {
    title: 'How do I deposit and withdraw funds?',
    answer:
      "All investing on Normal is powered by USD Coin - a digital dollar that's always worth $1, fully backed by U.S. Treasuries and cash, with over $80 billion in deposits. You can deposit and withdraw funds using one of our regulated financial partners such as MoneyGram, Coinbase, and Onramper, or transfer USDC directly with your Normal account.",
  },
  {
    title: 'How much does Normal cost?',
    answer:
      'It is 100% free to create an account. A small fee may be collected when depositing/withdrawing using our financial partners. All trades on Normal incur a 0.30% fee and all index funds have a volume scaling transaction fee.',
  },
  {
    title: 'Does Normal require KYC?',
    answer:
      'No, we do not require KYC to create an account or invest. However, you must KYC to deposit and withdraw funds using our regulated financial partners. We also restrict access from users originating in U.S sanctioned jurisdictions or countries where our services are not supported due to regulation.',
  },
  {
    title: 'What is an index fund?',
    answer:
      'Index funds are baskets of assets that track an investment theme, sector, or strategy (e.g., International, High-growth, Crypto, Low-risk). They automatically update to ensure your portfolio is achieving maximum performance and save you time and money while investing.',
  },
  {
    title: 'Is Normal safe to use?',
    answer:
      'Yes, our technology has been audited by professional security firms. We use two layer encryption across data sources and employ active monitoring systems to ensure our users and their funds are constantly secure. You keep custody of your funds and assets at all times. However, there are risks to using our platform. Please read them in our documention.',
  },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
const FlatAccordion = styled(MuiAccordion)({
  boxShadow: 'none !important',
  '&.Mui-expanded': {
    margin: 0,
    boxShadow: 'none !important',
  },
});

export const FaqAccordion: React.FC<FaqAccordionProps> = ({
  heading = 'Frequently asked questions',
  description = 'Common questions answered below.',
  questions = [],
  footerHeading = 'Still have questions?',
  footerDescription = 'Check out our documentation!',
  button,
  ...sectionProps
}) => {
  const { t } = useTranslate();

  const list = questions.length ? questions : DEFAULT_QUESTIONS;

  return (
    <Box component="section" sx={{ px: '5%', py: { xs: 6, md: 8, lg: 10 } }} {...sectionProps}>
      <Container maxWidth="md">
        <Stack spacing={2} textAlign="center" mb={{ xs: 6, md: 8 }}>
          <Typography variant="h3" fontWeight={500} sx={{ fontSize: { xs: '2rem', md: '3rem' } }}>
            {t(heading ?? '')}
          </Typography>
          {description && <Typography color="text.secondary">{t(description)}</Typography>}
        </Stack>

        <Stack>
          {list.map((q, i) => (
            <FlatAccordion key={i} square elevation={0}>
              <AccordionSummary
                expandIcon={
                  <Box sx={{ color: 'text.primary' }}>
                    <Icon icon="mingcute:down-fill" width={14} height={14} />
                  </Box>
                }
              >
                <Typography fontWeight={500} sx={{ py: 1.5, fontSize: 18 }}>
                  {t(q.title)}
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ pb: { md: 2 }, mb: 2 }}>
                <Typography color="text.secondary">{t(q.answer)}</Typography>
              </AccordionDetails>
            </FlatAccordion>
          ))}
        </Stack>

        <Box mt={{ xs: 6, md: 8 }} textAlign="center">
          <Typography variant="h5" fontWeight={500} mb={1}>
            {t(footerHeading)}
          </Typography>
          <Typography color="text.secondary" mb={2}>
            {t(footerDescription)}
          </Typography>
          <Button
            variant={button?.variant ?? 'outlined'}
            href="https://normalfinance.gitbook.io/docs/faqs"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t(button?.title ?? 'Read more')}
          </Button>
        </Box>
      </Container>
    </Box>
  );
};

FaqAccordion.displayName = 'FaqAccordion';
