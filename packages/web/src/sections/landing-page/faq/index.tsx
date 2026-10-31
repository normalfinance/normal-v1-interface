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
import { HAIRLINE, PageSection, SectionHeader } from '@/components/_common/brand';

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export type Question = { title: string; answer: string };

export interface FaqAccordionProps {
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
      "Your USDC is deposited into Blend's lending pools. Borrowers over-collateralize their loans and pay interest — you earn a share proportional to your deposit. DeFindex optimizes allocation across the most efficient pools. Security is maintained through non-custodial architecture, over-collateralization with automatic liquidations, and audited Soroban smart contracts.",
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
  {
    title: 'Can I withdraw anytime?',
    answer:
      'Yes. There are no lock-up periods. You can withdraw your USDC savings to any Stellar wallet at any time. Transactions settle in under 5 seconds on the Stellar network.',
  },
];

/* ------------------------------------------------------------------ */
/*  Styled overrides                                                    */
/* ------------------------------------------------------------------ */

const Accordion = styled(MuiAccordion)({
  background: '#fff',
  boxShadow: 'none !important',
  border: HAIRLINE,
  borderRadius: 'var(--radius-lg) !important',
  overflow: 'hidden',
  '&::before': { display: 'none' },
  '&.Mui-expanded': { margin: 0, background: '#fff' },
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
  eyebrow = 'FAQ',
  heading = 'Frequently asked, plainly answered.',
  subhead,
  questions,
}) => {
  const { t } = useTranslate();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const list = questions?.length ? questions : DEFAULT_QUESTIONS;

  return (
    <PageSection aria-labelledby="faq-heading">
      <SectionHeader
        id="faq-heading"
        eyebrow={t(eyebrow)}
        title={t(heading)}
        subtitle={subhead ? t(subhead) : undefined}
      />

      {/* FAQ 2-column layout — each column is independent so expanding doesn't affect the other */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
          gap: 1.5,
          alignItems: 'start',
        }}
      >
        {[list.slice(0, Math.ceil(list.length / 2)), list.slice(Math.ceil(list.length / 2))].map(
          (col, colIdx) => (
            <Box key={colIdx} sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {col.map((q, rowIdx) => {
                const i = colIdx === 0 ? rowIdx : Math.ceil(list.length / 2) + rowIdx;
                return (
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
                            borderRadius: 'var(--radius-md)',
                            bgcolor: '#F4F4F7',
                            color: '#0A0A0F',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <Iconify
                            icon={openIndex === i ? 'mingcute:close-line' : 'mingcute:add-line'}
                            width={15}
                          />
                        </Box>
                      }
                    >
                      <Box
                        sx={{
                          fontSize: '15px',
                          fontWeight: 500,
                          letterSpacing: '-0.01em',
                          color: '#0A0A0F',
                          lineHeight: 1.4,
                          pr: 1,
                        }}
                      >
                        {t(q.title)}
                      </Box>
                    </AccordionSummary>

                    <AccordionDetails>
                      <Box
                        sx={{
                          fontSize: '14px',
                          lineHeight: 1.65,
                          color: '#6B6B76',
                          whiteSpace: 'pre-line',
                        }}
                      >
                        {q.answer}
                      </Box>
                    </AccordionDetails>
                  </Accordion>
                );
              })}
            </Box>
          )
        )}
      </Box>
    </PageSection>
  );
};

FaqAccordion.displayName = 'FaqAccordion';
