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
      icon: <PeopleAltOutlinedIcon sx={{ fontSize: 22, color: '#FFFFFF' }} />,
      heading: 'Keep Crypto Human',
      description:
        "Remove complexity, speak plainly, and design for real people — not power users. Every screen, every error message, and every transaction should be explainable in a single sentence. If your parents can't use it, we're not done.",
    },
    {
      icon: <VerifiedUserOutlinedIcon sx={{ fontSize: 22, color: '#FFFFFF' }} />,
      heading: 'Security First',
      description:
        "Audited contracts, battle-tested code, and 24/7 monitoring on every deployment. Halborn reviews every release before it touches mainnet. We treat your savings with the same seriousness you do — because cutting corners on security isn't a tradeoff, it's a failure.",
    },
    {
      icon: <CodeOutlinedIcon sx={{ fontSize: 22, color: '#FFFFFF' }} />,
      heading: 'Permissionless Innovation',
      description:
        'Build composable primitives that anyone can extend, fork, or build on top of. Open SDK, public smart contracts, MIT-licensed components. We believe the best financial infrastructure is infrastructure no single company controls.',
    },
    {
      icon: <GroupsOutlinedIcon sx={{ fontSize: 22, color: '#FFFFFF' }} />,
      heading: 'Community Ownership',
      description:
        "NORM token holders create and vote on every proposal that shapes the protocol. No backroom decisions, no surprise upgrades. The roadmap belongs to the people using the product — we're here to build what the community decides.",
    },
    {
      icon: <InsightsOutlinedIcon sx={{ fontSize: 22, color: '#FFFFFF' }} />,
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
    // overflow: visible so the heading can stay pinned while the list scrolls.
    <PageSection id="core-values" tone="white" sx={{ overflow: 'visible' }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 5fr) minmax(0, 7fr)' },
          gap: { xs: 5, md: 10 },
          alignItems: 'start',
        }}
      >
        <SectionHeader
          eyebrow="Our Principles"
          title={t(heading)}
          subtitle={t(
            'Five guiding principles that keep us focused on making crypto transparent, secure, and genuinely useful.'
          )}
          sx={{ mb: 0, position: { md: 'sticky' }, top: { md: 120 } }}
        />

        <Box>
          {features.map((feature, i) => (
            <Box
              key={feature.heading}
              sx={{
                display: 'grid',
                gridTemplateColumns: '48px minmax(0, 1fr)',
                gap: { xs: 2, md: 3 },
                py: { xs: 3, md: 4 },
                ...(i > 0 && { borderTop: HAIRLINE }),
                '&:first-of-type': { pt: 0 },
                '&:last-of-type': { pb: 0 },
              }}
            >
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: '#0A0A0F',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                {feature.icon}
              </Box>

              <Box>
                <Typography
                  component="h3"
                  sx={{
                    fontSize: { xs: 20, md: 22 },
                    fontWeight: 500,
                    lineHeight: 1.25,
                    letterSpacing: '-0.02em',
                    color: '#0A0A0F',
                  }}
                >
                  {t(feature.heading)}
                </Typography>
                <Typography
                  sx={{ mt: 1, fontSize: 16, lineHeight: 1.6, color: '#2A2A33', maxWidth: 560 }}
                >
                  {t(feature.description)}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    </PageSection>
  );
};

export default CoreValues;
