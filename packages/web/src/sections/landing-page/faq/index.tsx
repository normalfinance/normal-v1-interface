'use client';

import * as React from 'react';
import { useState } from 'react';
import { useTranslate } from '@/locales';

import Box from '@mui/material/Box';
import { styled } from '@mui/material/styles';
import MuiAccordion from '@mui/material/Accordion';
import MuiAccordionSummary from '@mui/material/AccordionSummary';
import MuiAccordionDetails from '@mui/material/AccordionDetails';

import { Iconify } from '@/components/template/iconify';

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export type Question = { title: string; answer: string };

export interface FaqAccordionProps extends React.ComponentPropsWithoutRef<'section'> {
  eyebrow?: string;
  heading?: string;
  subhead?: string;
  questions?: Question[];
}

/* ------------------------------------------------------------------ */
/*  Data                                                                */
/* ------------------------------------------------------------------ */

const DEFAULT_QUESTIONS: Question[] = [
  {
    title: 'How does Normal work?',
    answer:
      'Normal is a non-custodial Stellar wallet with built-in fiat ramps and a high-yield savings account. You hold your keys. We just make the experience feel like a banking app — fast, clean, and global.',
  },
  {
    title: 'Is 7%+ APY too good to be true?',
    answer:
      "No, 5–10% APY is realistic in the current Stellar DeFi ecosystem, though yields are variable and not guaranteed. Stellar's Blend protocol has shown USDC lending yields in the 8–15%+ range during periods of strong borrowing demand — driven by genuine utilization from cross-border payments, remittances, and business liquidity needs in emerging markets.",
  },
  {
    title: 'How exactly is the yield made and secured?',
    answer:
      'Your USDC is deposited into Blend\'s lending pools. Borrowers over-collateralize their loans and pay interest — you earn a share proportional to your deposit. DeFindex optimizes allocation across the most efficient pools. Security is maintained through non-custodial architecture, over-collateralization with automatic liquidations, and audited Soroban smart contracts.',
  },
  {
    title: 'What assets does Normal support?',
    answer:
      "We integrate new assets every week. We're building support for the top 100 cryptocurrencies and popular equities, commodities, FX pairs, ETFs, and more.",
  },
  {
    title: 'Does Normal require KYC?',
    answer:
      'No KYC is required to create an account or invest. However, you must complete KYC to deposit and withdraw via our regulated financial partners. We restrict access from U.S. sanctioned jurisdictions and countries where our services are not supported.',
  },
  {
    title: 'How much does Normal cost?',
    answer:
      'Creating an account is 100% free. Savings deposits incur a flat 0.5% fee. Withdrawals incur a tiered yield commission: 20% under $500, 15% from $500–$2,499, 10% from $2,500–$50,000, and 5% above $50,000. Swaps incur a 0.5% fee on the input amount.',
  },
  {
    title: 'Is Normal safe to use?',
    answer:
      'Yes. Our technology has been audited by Halborn, a professional security firm. We use two-layer encryption and active monitoring systems. You retain custody of your funds at all times. As with any DeFi platform, risks exist — please read our documentation for full details.',
  },
];

/* ------------------------------------------------------------------ */
/*  Styled overrides                                                    */
/* ------------------------------------------------------------------ */

const Accordion = styled(MuiAccordion)({
  background: '#FAFAFA',
  boxShadow: 'none !important',
  border: '1px solid #e8e8ec',
  borderRadius: '14px !important',
  overflow: 'hidden',
  '&::before': { display: 'none' },
  '&.Mui-expanded': { margin: 0, background: '#FAFAFA' },
});

const AccordionSummary = styled(MuiAccordionSummary)({
  padding: '0 20px',
  minHeight: 'unset',
  '&.Mui-expanded': { minHeight: 'unset' },
  '& .MuiAccordionSummary-content': {
    margin: '20px 0',
    '&.Mui-expanded': { margin: '20px 0' },
  },
  '& .MuiAccordionSummary-expandIconWrapper': {
    transform: 'none !important',
  },
});

const AccordionDetails = styled(MuiAccordionDetails)({
  padding: '0 20px 22px',
});

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export const FaqAccordion: React.FC<FaqAccordionProps> = ({
  eyebrow = '— FAQ',
  heading = 'Frequently asked, plainly answered.',
  subhead,
  questions,
  ...sectionProps
}) => {
  const { t } = useTranslate();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const list = questions?.length ? questions : DEFAULT_QUESTIONS;

  return (
    <Box
      component="section"
      aria-labelledby="faq-heading"
      sx={{ bgcolor: '#fff', py: 12 }}
      {...sectionProps}
    >
      <Box sx={{ maxWidth: 900, mx: 'auto', px: 3 }}>
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Box
            component="p"
            sx={{
              m: 0,
              mb: '14px',
              fontSize: 12,
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#6b6b76',
            }}
          >
            {t(eyebrow)}
          </Box>

          <Box
            component="h2"
            id="faq-heading"
            sx={{
              m: 0,
              fontSize: 'clamp(34px, 4.4vw, 56px)',
              fontWeight: 600,
              letterSpacing: '-0.03em',
              lineHeight: 1.04,
              color: '#0a0a0b',
            }}
          >
            {t(heading)}
          </Box>

          {subhead && (
            <Box
              component="p"
              sx={{ m: 0, mt: '14px', fontSize: 17, color: '#6b6b76', lineHeight: 1.5 }}
            >
              {t(subhead)}
            </Box>
          )}
        </Box>

        {/* FAQ list */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {list.map((q, i) => (
            <Accordion
              key={i}
              disableGutters
              elevation={0}
              square={false}
              expanded={openIndex === i}
              onChange={(_, isOpen) => setOpenIndex(isOpen ? i : null)}
            >
              <AccordionSummary
                expandIcon={
                  <Box
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      bgcolor: '#0a0a0b',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Iconify
                      icon={openIndex === i ? 'mingcute:close-line' : 'mingcute:add-line'}
                      width={16}
                    />
                  </Box>
                }
              >
                <Box
                  sx={{
                    fontSize: 17,
                    fontWeight: 500,
                    letterSpacing: '-0.01em',
                    color: '#0a0a0b',
                    lineHeight: 1.4,
                  }}
                >
                  {t(q.title)}
                </Box>
              </AccordionSummary>

              <AccordionDetails>
                <Box
                  sx={{
                    fontSize: 15.5,
                    lineHeight: 1.6,
                    color: '#3a3a44',
                    maxWidth: '70ch',
                    whiteSpace: 'pre-line',
                  }}
                >
                  {q.answer}
                </Box>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      </Box>
    </Box>
  );
};

FaqAccordion.displayName = 'FaqAccordion';
