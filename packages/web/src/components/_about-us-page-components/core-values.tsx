'use client';

import React from 'react';
import { useTranslate } from '@/locales';

import { Box, Typography } from '@mui/material';
import CodeOutlinedIcon from '@mui/icons-material/CodeOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import VerifiedUserOutlinedIcon from '@mui/icons-material/VerifiedUserOutlined';

import { HAIRLINE, PageSection, SectionHeader } from '@/components/_common/brand';

type FeatureItem = {
  icon: React.ReactNode;
  heading: string;
  description: string;
};

type Props = {
  heading: string;
  features: FeatureItem[];
};

export type CoreValuesProps = React.ComponentPropsWithoutRef<'section'> & Partial<Props>;

export const CoreValuesDefaults: Props = {
  heading: 'Core Values',
  features: [
    {
      icon: <PeopleAltOutlinedIcon sx={{ fontSize: 18, color: '#0A0A0F' }} />,
      heading: 'Keep Crypto Human',
      description:
        "Remove complexity, speak plainly, and design for real people — not power users. Every screen, every error message, and every transaction should be explainable in a single sentence. If your parents can't use it, we're not done.",
    },
    {
      icon: <VerifiedUserOutlinedIcon sx={{ fontSize: 18, color: '#0A0A0F' }} />,
      heading: 'Security First',
      description:
        "Audited contracts, battle-tested code, and 24/7 monitoring on every deployment. Halborn reviews every release before it touches mainnet. We treat your savings with the same seriousness you do — because cutting corners on security isn't a tradeoff, it's a failure.",
    },
    {
      icon: <CodeOutlinedIcon sx={{ fontSize: 18, color: '#0A0A0F' }} />,
      heading: 'Permissionless Innovation',
      description:
        'Build composable primitives that anyone can extend, fork, or build on top of. Open SDK, public smart contracts, MIT-licensed components. We believe the best financial infrastructure is infrastructure no single company controls.',
    },
    {
      icon: <GroupsOutlinedIcon sx={{ fontSize: 18, color: '#0A0A0F' }} />,
      heading: 'Community Ownership',
      description:
        "NORM token holders create and vote on every proposal that shapes the protocol. No backroom decisions, no surprise upgrades. The roadmap belongs to the people using the product — we're here to build what the community decides.",
    },
    {
      icon: <InsightsOutlinedIcon sx={{ fontSize: 18, color: '#0A0A0F' }} />,
      heading: 'Data > Hype',
      description:
        "Let on-chain metrics guide every product decision. We don't ship features because they're trending — we ship them because usage data says users need them. Hype fades. Real yield, real volume, and real retention don't.",
    },
  ],
};

export const CoreValues: React.FC<CoreValuesProps> = (props) => {
  const { t } = useTranslate();

  const { heading, features } = {
    ...CoreValuesDefaults,
    ...props,
  };

  return (
    <PageSection id="core-values">
      <SectionHeader
        eyebrow="Our Principles"
        title={t(heading)}
        subtitle={t(
          'Five guiding principles that keep us focused on making crypto transparent, secure, and genuinely useful.'
        )}
      />

      {/* List */}
      <Box>
        {features.map((feature) => (
          <Box
            key={feature.heading}
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '48px 1fr 1fr' },
              gap: { xs: '6px', sm: '40px' },
              alignItems: 'start',
              py: { xs: '24px', md: '32px' },
              borderTop: HAIRLINE,
              '&:last-child': { borderBottom: HAIRLINE },
            }}
          >
            {/* Icon */}
            <Box
              sx={{
                width: 48,
                height: 48,
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: '#FFFFFF',
                border: HAIRLINE,
                borderRadius: 'var(--radius-md)',
                mt: { xs: 0, sm: '2px' },
                mb: { xs: '16px', sm: 0 },
              }}
            >
              {feature.icon}
            </Box>

            {/* Heading */}
            <Typography
              sx={{
                fontWeight: 500,
                fontSize: { xs: '18px', md: '20px' },
                color: '#0A0A0F',
                letterSpacing: '-0.02em',
                lineHeight: 1.3,
                pt: { xs: 0, sm: '7px' },
              }}
            >
              {t(feature.heading)}
            </Typography>

            {/* Description */}
            <Typography
              sx={{
                fontSize: '16px',
                color: '#6B6B76',
                lineHeight: 1.55,
                pt: { xs: 0, sm: '7px' },
              }}
            >
              {t(feature.description)}
            </Typography>
          </Box>
        ))}
      </Box>
    </PageSection>
  );
};

export default CoreValues;
