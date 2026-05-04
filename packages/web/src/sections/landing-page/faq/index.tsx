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
      'Normal provides a simple, non-custodial interface that lets you earn passive yield on your USDC directly on the Stellar blockchain without giving up control of your assets. You connect a Stellar-compatible wallet (such as Freighter or a supporting wallet/app), deposit USDC, and Normal routes it through optimized, audited DeFi strategies built around two core protocols:\n\n• Blend Capital — Stellar’s leading over-collateralized lending protocol. Your USDC is supplied to lending pools where borrowers (individuals, businesses, or institutions) pay interest to access liquidity.\n\n• DeFindex — A non-custodial yield aggregator and vault infrastructure that automates allocation across high-quality opportunities, including Blend pools and other efficient stablecoin strategies on Stellar.\n\nThe entire process happens on-chain via smart contracts (Soroban on Stellar). You retain full ownership of your USDC at all times—Normal never takes custody. Yields accrue automatically and compound, and you can withdraw your principal plus earned yield at any time (subject to pool liquidity). The interface is designed for ease of use, similar to a savings account, while remaining fully decentralized and transparent.',
  },
  {
    title: 'Is 5-10% APY too good to be true?',
    answer:
      'No, 5-10% APY is realistic in the current Stellar DeFi ecosystem, though yields are variable and not guaranteed. Stellar’s Blend protocol has recently shown USDC lending yields in the 8-15%+ range in periods of strong borrowing demand, significantly higher than many established DeFi platforms on Ethereum or Solana (often 2-7% for USDC). This is driven by genuine utilization from real-world use cases on Stellar, such as cross-border payments, remittances, and business liquidity needs—particularly in emerging markets.\n\nThat said, APY fluctuates based on supply and demand in the lending pools:\n\n• Higher utilization (more borrowing) → higher yields for suppliers.\n• Lower utilization → yields compress.',
  },
  {
    title: 'How exactly is the yield made and secured?',
    answer:
      'The yield is generated transparently through established DeFi mechanisms on the Stellar blockchain and secured by over-collateralization, smart contract design, and ecosystem safeguards.\n\nYield Generation\n\n• Lending Interest (Primary Source): Your USDC is deposited into Blend’s lending pools. Borrowers over-collateralize their loans (typically with assets like XLM, other stablecoins, or approved tokens) and pay interest to borrow USDC. Suppliers (like you) earn a share of that interest proportional to their deposit. DeFindex helps optimize by allocating across the most efficient pools or vaults.\n\n• Additional Optimization: DeFindex vaults may incorporate automated strategies such as liquidity provision or backstop participation (where providers earn a portion of fees for supporting pool stability). All activity is on-chain and auditable.\n\nYields compound automatically in most vault implementations, and there are generally no lock-up periods—your funds remain liquid.\n\nSecurity and Risk Management\n\n• Non-Custodial: You always hold your USDC in your own Stellar wallet. Normal only facilitates interactions with smart contracts—you approve every transaction.\n\n• Over-Collateralization: Blend requires borrowers to post more collateral than they borrow (e.g., 120-200%+ depending on the pool and asset). If collateral value drops, liquidations automatically repay lenders, protecting suppliers.\n\n• Audits and Smart Contracts: Blend and DeFindex use audited Soroban smart contracts. DeFindex has public audit reports, and the ecosystem benefits from Stellar’s battle-tested infrastructure (low fees, high speed, institutional-grade stablecoin support via native USDC).\n\n• Transparency: All positions, APYs, TVL, and transactions are visible on Stellar explorers. You can verify everything independently.\n\n• Backstop Mechanisms: Many pools include backstop modules (e.g., BLND:USDC liquidity pools) that provide additional buffers funded by ecosystem participants, sharing in fees to incentivize stability.',
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
      'It is 100% free to create an account. A small fee may be collected when depositing or withdrawing using our financial partners. Savings deposits incur a flat 0.5% fee. Withdrawals incur a tiered yield commission based on the withdrawal amount: 20% under $500, 15% from $500 to $2,499, 10% from $2,500 to $50,000, and 5% above $50,000. Swaps incur a 0.5% fee on the input amount.',
  },
  {
    title: 'Does Normal require KYC?',
    answer:
      'No, we do not require KYC to create an account or invest. However, you must KYC to deposit and withdraw funds using our regulated financial partners. We also restrict access from users originating in U.S sanctioned jurisdictions or countries where our services are not supported due to regulation.',
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
                <Typography color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
                  {t(q.answer)}
                </Typography>
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
