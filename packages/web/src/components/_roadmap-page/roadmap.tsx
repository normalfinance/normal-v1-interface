'use client';

import React, { useState } from 'react';

import { Box, Typography } from '@mui/material';

import {
  BLOCK_SX,
  MONO_FONT,
  PageSection,
  SectionHeader,
  SegmentedControl,
} from '@/components/_common/brand';

export type MilestoneStatus = 'shipped' | 'in-progress' | 'planned';

export type FeatureItem = {
  title: string;
  description: string;
  date: string;
  status: MilestoneStatus;
  link?: string;
};

const MILESTONES: FeatureItem[] = [
  {
    status: 'shipped',
    title: 'Launched first Normal crypto indexes',
    date: 'Nov 2023',
    description: 'Introduced initial set of Normal index products to the public.',
  },
  {
    status: 'shipped',
    title: 'Started building Stellar on-chain index funds',
    date: 'Feb 2024',
    description: 'DraperU x Stellar hacker house — won the on-chain index funds track.',
  },
  {
    status: 'shipped',
    title: 'Hit $100k index AUM',
    date: 'Jun 2024',
    description: 'Milestone AUM reached across Normal index products.',
    link: 'https://x.com/normalfi/status/1798371781062881565',
  },
  {
    status: 'shipped',
    title: 'Halborn smart-contract audit passed',
    date: 'Sep 2024',
    description: 'Full audit of savings and lending contracts. Zero criticals.',
  },
  {
    status: 'shipped',
    title: 'Normal Savings launched',
    date: 'Jan 2025',
    description: 'Non-custodial USDC savings account live on Stellar mainnet.',
  },
  {
    status: 'shipped',
    title: 'Hit $24M total deposits',
    date: 'Apr 2026',
    description: 'Crossed $24M TVL across USDC savings vaults.',
  },
  {
    status: 'shipped',
    title: 'Multi-chain support — Turnkey, LI.FI & MoneyGram',
    date: 'Jun 2026',
    description:
      'Self-custody BTC, ETH and SOL wallets via Turnkey, cross-chain swaps through LI.FI, and MoneyGram cash in & out.',
  },
  {
    status: 'in-progress',
    title: 'Blockdaemon setup',
    date: 'Aug 2026',
    description:
      'Enterprise-grade node infrastructure via Blockdaemon for faster, more reliable multi-chain reads and broadcasts.',
  },
  {
    status: 'in-progress',
    title: 'Token listing: BNB, ADA, AVAX, DOT, NEAR, STX, ONDO',
    date: 'Aug 2026',
    description:
      'Expanding supported assets — buy, hold and send BNB, ADA, AVAX, DOT, NEAR, STX and ONDO.',
  },
  {
    status: 'in-progress',
    title: 'Normal Crypto Indexes',
    date: 'Q4 2026',
    description: 'Build and invest in custom crypto indexes tailored to your strategy.',
  },
  {
    status: 'planned',
    title: 'Normal Mobile App',
    date: 'Q4 2026',
    description: 'Native iOS and Android app bringing the full Normal experience to mobile.',
  },
  {
    status: 'planned',
    title: 'Recurring deposits + auto-compound',
    date: 'Q4 2026',
    description: 'Schedule recurring buys, auto-roll yield, set DCA targets.',
  },
  {
    status: 'planned',
    title: 'Normal Credit Card',
    date: 'Q4 2026',
    description: 'Spend your earnings in the real world with a Normal credit card.',
  },
  {
    status: 'planned',
    title: 'Real-world assets (treasuries, ETFs)',
    date: '2027',
    description: 'Bring tokenized treasuries, money-market funds and ETFs to Normal.',
  },
  {
    status: 'planned',
    title: 'Open developer SDK',
    date: '2027',
    description: 'Public TypeScript SDK and on-chain identity for builders on Stellar.',
  },
];

type FilterKey = 'all' | MilestoneStatus;

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'in-progress', label: 'In progress' },
  { key: 'planned', label: 'Planned' },
];

const STATUS_TAG: Record<
  MilestoneStatus,
  { label: string; bg: string; color: string; dotColor: string }
> = {
  shipped: {
    label: 'Shipped',
    bg: 'rgba(26,179,125,0.12)',
    color: '#0E8A5B',
    dotColor: '#1AB37D',
  },
  'in-progress': {
    label: 'In progress',
    bg: 'rgba(110,139,255,0.14)',
    color: '#3E51B1',
    dotColor: '#6E8BFF',
  },
  planned: {
    label: 'Planned',
    bg: 'rgba(10,10,15,0.06)',
    color: '#2A2A33',
    dotColor: '#9A9AA3',
  },
};

const DOT_STYLE: Record<MilestoneStatus, object> = {
  shipped: {
    bgcolor: '#1AB37D',
    borderColor: '#1AB37D',
  },
  'in-progress': {
    bgcolor: '#0A0A0F',
    borderColor: '#0A0A0F',
  },
  planned: {
    bgcolor: '#fff',
    border: '2px dashed rgba(10,10,15,0.25)',
  },
};

const StatusTag: React.FC<{ status: MilestoneStatus }> = ({ status }) => {
  const cfg = STATUS_TAG[status];
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '7px',
        px: '10px',
        py: '4px',
        borderRadius: 'var(--radius-sm)',
        fontSize: '11px',
        fontWeight: 500,
        letterSpacing: '0.02em',
        bgcolor: cfg.bg,
        color: cfg.color,
        flexShrink: 0,
      }}
    >
      <Box
        sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: cfg.dotColor, flexShrink: 0 }}
      />
      {cfg.label}
    </Box>
  );
};

export const Roadmap: React.FC = () => {
  const [filter, setFilter] = useState<FilterKey>('all');

  const filtered = filter === 'all' ? MILESTONES : MILESTONES.filter((m) => m.status === filter);

  return (
    <PageSection>
      <SectionHeader
        eyebrow="Milestones"
        title="The road behind, and ahead."
        subtitle="Every milestone, organized by status."
        action={
          <SegmentedControl
            value={filter}
            onChange={setFilter}
            options={FILTERS.map(({ key, label }) => ({ value: key, label }))}
          />
        }
      />

      {/* Timeline */}
      <Box sx={{ position: 'relative', pl: '36px' }}>
        {/* Vertical line */}
        <Box
          sx={{
            position: 'absolute',
            left: '11px',
            top: '12px',
            bottom: '12px',
            width: '1px',
            background:
              'linear-gradient(to bottom, rgba(10,10,15,0.08) 0%, rgba(10,10,15,0.08) 70%, transparent 100%)',
          }}
        />

        {filtered.map((item, i) => (
          <Box key={i} sx={{ position: 'relative', pb: '12px' }}>
            {/* Dot */}
            <Box
              sx={{
                position: 'absolute',
                left: '-36px',
                top: '28px',
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Box
                sx={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  border: '2px solid',
                  ...DOT_STYLE[item.status],
                }}
              />
            </Box>

            {/* Card */}
            <Box
              sx={{
                ...BLOCK_SX,
                transition: 'border-color 150ms ease',
                '&:hover': { borderColor: 'rgba(10,10,15,0.14)' },
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  mb: '10px',
                  flexWrap: 'wrap',
                }}
              >
                <StatusTag status={item.status} />
                <Typography
                  sx={{
                    fontSize: '12px',
                    color: '#6B6B76',
                    fontFamily: MONO_FONT,
                    letterSpacing: '-0.01em',
                  }}
                >
                  {item.date}
                </Typography>
              </Box>
              <Typography
                sx={{
                  fontSize: '18px',
                  fontWeight: 500,
                  letterSpacing: '-0.015em',
                  color: '#0A0A0F',
                  mb: '6px',
                }}
              >
                {item.title}
              </Typography>
              <Typography sx={{ fontSize: '14px', color: '#6B6B76', lineHeight: 1.55 }}>
                {item.description}
              </Typography>
              {item.link && (
                <Box
                  component="a"
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    mt: '10px',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: '#0A0A0F',
                    textDecoration: 'none',
                    '&:hover': { textDecoration: 'underline' },
                  }}
                >
                  View announcement →
                </Box>
              )}
            </Box>
          </Box>
        ))}
      </Box>
    </PageSection>
  );
};

Roadmap.displayName = 'Roadmap';
export default Roadmap;
