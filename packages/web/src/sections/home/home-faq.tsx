'use client';

import { useState } from 'react';
import { paths } from '@/routes/paths';
import { TYPE } from '@/theme/type-scale';
import { INK, HOVER, MUTED, PAPER, BRAND_COLORS, HAIRLINE_COLOR } from '@/theme/brand-colors';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import AddRounded from '@mui/icons-material/AddRounded';
import RemoveRounded from '@mui/icons-material/RemoveRounded';

import { MarketingPhoto } from '@/components/_common/marketing-photo';
import {
  PageSection,
  INK_BUTTON_SX,
  SectionHeader,
  OUTLINED_BUTTON_SX,
} from '@/components/_common/brand';

// ----------------------------------------------------------------------

export type Question = { title: string; answer: string };

export interface FaqAccordionProps {
  eyebrow?: string;
  heading?: string;
  subhead?: string;
  questions?: Question[];
}

const DEFAULT_QUESTIONS: Question[] = [
  {
    title: 'How does Normal work?',
    answer:
      'Normal is a self-custody wallet with built-in ways to add money and cash out, plus a savings account for USDC. Your money stays in your own wallet. We make it as simple to use as the apps you already know: fast, clean and global.',
  },
  {
    title: 'Is the savings rate too good to be true?',
    answer:
      "No, 5–10% APY is realistic in the current Stellar DeFi ecosystem, though yields are variable and not guaranteed. Stellar's Blend protocol has shown USDC lending yields in the 8–15%+ range during periods of strong borrowing demand, driven by genuine utilization from cross-border payments, remittances, and business liquidity needs in emerging markets.",
  },
  {
    title: 'How exactly is the yield made and secured?',
    answer:
      "Your USDC is deposited into Blend's lending pools. Borrowers over-collateralize their loans and pay interest, and you earn a share proportional to your deposit. DeFindex optimizes allocation across the most efficient pools. Security is maintained through non-custodial architecture, over-collateralization with automatic liquidations, and audited Soroban smart contracts.",
  },
  {
    title: 'What assets does Normal support?',
    answer:
      'Today: digital dollars (USDC on Stellar), plus Bitcoin, Ethereum, Solana and XLM. More assets are on our roadmap.',
  },
  {
    title: 'Do I need to verify my identity?',
    answer:
      'No. Normal does not verify identity to create an account. To buy or cash out through our licensed partners, you complete their identity check. Our Terms do not allow use from sanctioned countries or by sanctioned people.',
  },
  {
    title: 'How much does Normal cost?',
    answer:
      'Creating an account is 100% free. Savings deposits incur a flat 0.5% fee. Withdrawals incur a tiered yield commission: 20% under $500, 15% from $500–$2,499, 10% from $2,500–$50,000, and 5% above $50,000. Swaps incur a 0.5% fee on the input amount.',
  },
  {
    title: 'Is Normal safe to use?',
    answer:
      'Yes. Our technology has been audited by Halborn, a professional security firm. We use two-layer encryption and active monitoring systems. You retain custody of your funds at all times. As with any DeFi platform, risks exist, so please read our documentation for full details.',
  },
  {
    title: 'Can I withdraw anytime?',
    answer:
      'Yes. There are no lock-up periods. You can withdraw your USDC savings to any Stellar wallet at any time. Transactions settle in under 5 seconds on the Stellar network.',
  },
];

/** One question. The answer fades and unfolds; the +/− swaps with it. */
function Item({
  question,
  open,
  onToggle,
}: {
  question: Question;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <Box component="li" sx={{ borderTop: `1px solid ${HAIRLINE_COLOR}` }}>
      <Box
        component="button"
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          width: '100%',
          py: 2.5,
          px: { xs: 2, md: 3 },
          border: 'none',
          textAlign: 'left',
          font: 'inherit',
          cursor: 'pointer',
          color: INK,
          bgcolor: 'transparent',
          transition: 'background-color 200ms ease',
          '&:hover': { bgcolor: HOVER },
        }}
      >
        <Typography component="span" sx={{ ...TYPE.h4, flexGrow: 1 }}>
          {question.title}
        </Typography>
        <Box
          component="span"
          aria-hidden="true"
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            width: 32,
            height: 32,
            border: `1px solid ${HAIRLINE_COLOR}`,
            borderRadius: 'var(--radius-site)',
            color: open ? PAPER : INK,
            bgcolor: open ? INK : PAPER,
            transition: 'background-color 200ms ease, color 200ms ease',
            '& svg': { fontSize: 18 },
          }}
        >
          {open ? <RemoveRounded /> : <AddRounded />}
        </Box>
      </Box>
      <Box
        sx={{
          display: 'grid',
          gridTemplateRows: open ? '1fr' : '0fr',
          transition: 'grid-template-rows 320ms cubic-bezier(0.2, 0.8, 0.2, 1)',
        }}
      >
        <Box sx={{ overflow: 'hidden' }}>
          <Typography
            sx={{
              ...TYPE.body,
              maxWidth: 680,
              px: { xs: 2, md: 3 },
              pb: 3,
              color: MUTED,
              opacity: open ? 1 : 0,
              transition: 'opacity 320ms ease',
            }}
          >
            {question.answer}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

/** Questions on the right; on the left the heading and a way to ask a person. */
export function FaqAccordion({
  eyebrow = 'FAQ',
  heading = 'Questions, answered plainly.',
  subhead,
  questions,
}: FaqAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const list = questions?.length ? questions : DEFAULT_QUESTIONS;
  const violet = BRAND_COLORS.violet;

  return (
    <PageSection divider aria-labelledby="faq-heading">
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '5fr 7fr' },
          alignItems: 'start',
          gap: { xs: 4, md: 8 },
        }}
      >
        <Box>
          <SectionHeader
            id="faq-heading"
            eyebrow={eyebrow}
            title={heading}
            subtitle={subhead}
            sx={{ mb: 4 }}
          />
          <Box sx={{ bgcolor: violet.tint }}>
            <Box sx={{ aspectRatio: '16 / 10' }}>
              <MarketingPhoto slot="everyday" />
            </Box>
            <Box sx={{ p: { xs: 3, md: 3.5 } }}>
              <Typography sx={{ ...TYPE.h4, color: violet.deep }}>
                Still have a question?
              </Typography>
              <Typography sx={{ ...TYPE.small, mt: 0.75, color: violet.deep }}>
                Ask a real person. We answer on Discord every day, or send us a message.
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2.5 }}>
                <Button
                  href={paths.help.feedbackForm}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="contained"
                  size="medium"
                  sx={INK_BUTTON_SX}
                >
                  Ask on Discord
                </Button>
                <Button
                  href={paths.core.contact}
                  variant="outlined"
                  size="medium"
                  sx={OUTLINED_BUTTON_SX}
                >
                  Contact us
                </Button>
              </Box>
            </Box>
          </Box>
        </Box>

        <Box component="ul" sx={{ borderBottom: `1px solid ${HAIRLINE_COLOR}`, bgcolor: PAPER }}>
          {list.map((question, index) => (
            <Item
              key={question.title}
              question={question}
              open={openIndex === index}
              onToggle={() => setOpenIndex(openIndex === index ? null : index)}
            />
          ))}
        </Box>
      </Box>
    </PageSection>
  );
}
