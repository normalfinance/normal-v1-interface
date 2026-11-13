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
      'Normal is a self-custody crypto wallet with built-in ways to buy, sell and swap crypto, and a USDC savings vault. Your wallet is secured by a passkey on your own device. We just make it feel like a banking app: fast, clean and global.',
  },
  {
    title: 'Where does the savings rate come from?',
    answer:
      'From interest that borrowers pay on Blend, a lending protocol on Stellar, where borrowers must post more collateral than they borrow. The rate changes with demand and is never guaranteed. You can see the current rate before you deposit.',
  },
  {
    title: 'How exactly is the yield made and secured?',
    answer:
      "Your USDC goes into a savings vault: a smart contract on Stellar that Normal set up and manages using DeFindex. The vault supplies the USDC to Blend's lending pools, where borrowers post more collateral than they borrow and pay interest, and you earn a share in proportion to your deposit. The vault's code cannot be changed, and loans whose collateral falls too low are liquidated. Smart contracts can still fail, so please read our documentation for the risks.",
  },
  {
    title: 'What assets does Normal support?',
    answer: "Bitcoin, Ethereum, Solana, Stellar (XLM) and USDC. We're adding more over time.",
  },
  {
    title: 'Does Normal require KYC?',
    answer:
      "Normal doesn't ask for ID to create an account. When you buy or sell crypto for money, the provider you choose (Coinbase, Stripe or MoneyGram) verifies your identity under its own rules. Our Terms of Service don't allow use by residents of the sanctioned countries they list.",
  },
  {
    title: 'How much does Normal cost?',
    answer:
      'Creating an account is 100% free. Savings deposits incur a flat 0.5% fee. Withdrawals incur a tiered yield commission: 20% under $500, 15% from $500–$2,499, 10% from $2,500–$50,000, and 5% above $50,000. Swaps incur a 0.5% fee on the input amount. The savings vault also keeps 10% of the yield it earns as a performance fee, shared between Normal and DeFindex.',
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
  border: '1px solid #e8e8ec',
  borderRadius: '16px !important',
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
  eyebrow = '— FAQ',
  heading = 'Frequently asked, plainly answered.',
  subhead,
  questions,
  ...sectionProps
}) => {
  const { t } = useTranslate();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const list = questions?.length ? questions : DEFAULT_QUESTIONS;

  return (
    <Box
      component="section"
      aria-labelledby="faq-heading"
      sx={{ bgcolor: '#FAFAFB', pt: { xs: '40px', md: '56px' }, pb: { xs: '80px', md: '110px' } }}
      {...sectionProps}
    >
      <Box sx={{ maxWidth: 1200, mx: 'auto', px: 3 }}>
        {/* Header */}
        <Box sx={{ mb: '56px' }}>
          <Box
            component="p"
            sx={{
              m: 0,
              mb: '14px',
              fontSize: '11px',
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.16em',
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
              fontWeight: 500,
              letterSpacing: '-0.03em',
              lineHeight: 1.04,
              color: '#0a0a0b',
              maxWidth: '22ch',
            }}
          >
            {t(heading)}
          </Box>

          {subhead && (
            <Box
              component="p"
              sx={{
                m: 0,
                mt: '14px',
                fontSize: '15px',
                color: '#6b6b76',
                lineHeight: 1.6,
                maxWidth: '60ch',
              }}
            >
              {t(subhead)}
            </Box>
          )}
        </Box>

        {/* FAQ 2-column layout — each column is independent so expanding doesn't affect the other */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
            gap: '10px',
            alignItems: 'start',
          }}
        >
          {[list.slice(0, Math.ceil(list.length / 2)), list.slice(Math.ceil(list.length / 2))].map(
            (col, colIdx) => (
              <Box key={colIdx} sx={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
                            color: '#0a0a0b',
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
                            color: '#6b6b76',
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
      </Box>
    </Box>
  );
};

FaqAccordion.displayName = 'FaqAccordion';
