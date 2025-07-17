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
    title: 'How does Normal Finance work?',
    answer: 'Normal pools liquidity across multiple DEXs to give you the best rate…',
  },
  {
    title: 'Do I need an account to start?',
    answer: 'No account needed—connect your wallet and trade instantly.',
  },
  {
    title: 'Which tokens can I trade?',
    answer: 'Any ERC-20 token supported by our connected DEXs.',
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
const FlatAccordion = styled(MuiAccordion)(({ theme }) => ({
  boxShadow: 'none !important', // Paper shadow
  '&.Mui-expanded': {
    margin: 0, // kill the extra margin
    boxShadow: 'none !important',
  },
}));

export const FaqAccordion: React.FC<FaqAccordionProps> = ({
  heading = 'Frequently asked questions',
  description = 'Common questions answered below.',
  questions = [],
  footerHeading = 'Still have questions?',
  footerDescription = 'Reach out and we’ll get back to you shortly.',
  button,
  ...sectionProps
}) => (
  <Box component="section" sx={{ px: '5%', py: { xs: 6, md: 8, lg: 10 } }} {...sectionProps}>
    <Container maxWidth="md">
      {/* ------ Heading block ------ */}
      <Stack spacing={2} textAlign="center" mb={{ xs: 6, md: 8 }}>
        <Typography
          variant="h3"
          fontWeight={500}
          sx={{ fontSize: { xs: '2.25rem', md: '3.5rem' } }}
        >
          {heading}
        </Typography>
      </Stack>

      {/* ------ Accordion list ------ */}
      <Stack>
        <Stack>
          {DEFAULT_QUESTIONS.map((q, i) => (
            <FlatAccordion key={i} square elevation={0} sx={{ boxShadow: 'none' }}>
              <AccordionSummary
                expandIcon={
                  <Box sx={{ color: 'text.primary' }}>
                    <Icon icon="mingcute:down-fill" width={14} height={14} />
                  </Box>
                }
              >
                <Typography
                  fontWeight={500}
                  sx={{ py: { xs: 1.5, md: 1.5 }, fontSize: { xs: 18, md: 18 } }}
                >
                  {q.title}
                </Typography>
              </AccordionSummary>

              <AccordionDetails sx={{ pb: { md: 2 }, mb: 2 }}>
                <Typography color="text.secondary">{q.answer}</Typography>
              </AccordionDetails>
            </FlatAccordion>
          ))}
        </Stack>
      </Stack>
    </Container>
  </Box>
);

FaqAccordion.displayName = 'FaqAccordion';
