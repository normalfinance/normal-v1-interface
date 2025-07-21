'use client';

import * as React from 'react';
import { Icon } from '@iconify/react';

import { styled } from '@mui/material/styles';
import { Accordion as MuiAccordion } from '@mui/material';
import {
  Box,
  Stack,
  Container,
  Typography,
  AccordionDetails,
  AccordionSummary,
  Button,
  type ButtonProps,
} from '@mui/material';

import { useTranslate } from '@/locales';

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
      'The Normal AMM mints and burns synthetic tokens to keep pool prices pegged to an oracle price.',
  },
  {
    title: 'Do I need an account to start?',
    answer: 'No account needed—connect your wallet and trade instantly.',
  },
  {
    title: 'Which tokens can I trade?',
    answer: 'You can swap XLM and USDC for any top 100 token supported by our AMM.',
  },
  {
    title: 'What are indexes?',
    answer: 'Indexes are baskets of tokens that track themes or sectors (e.g., DeFi, Layer-2).',
  },
  {
    title: 'Is it safe to use?',
    answer: 'All contracts are audited. You keep custody of your assets at all times.',
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
  footerDescription = 'Check out our Gitbook!',
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
