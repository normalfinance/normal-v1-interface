'use client';

import { DashboardContent } from '@/layouts/dashboard';

import Stack from '@mui/material/Stack';

import { ScrollProgress, useScrollProgress } from 'src/components/animate/scroll-progress';

import { HomeHero } from '../home-hero';
import { HomeFAQs } from '../home-faqs';
import { HomeStats } from '../home-stats';
import { HomeQuests } from '../home-quests';
import { HomeFooter } from '../home-footer';
import { HomeExplainer } from '../home-explainer';

// ----------------------------------------------------------------------

export function HomeView() {
  const pageProgress = useScrollProgress();

  return (
    <DashboardContent maxWidth="xl">
      <ScrollProgress
        variant="linear"
        progress={pageProgress.scrollYProgress}
        sx={[(theme) => ({ position: 'fixed', zIndex: theme.zIndex.appBar + 1 })]}
      />

      <HomeHero />

      <Stack sx={{ position: 'relative', bgcolor: 'background.default' }}>
        <HomeExplainer />

        <HomeStats />

        <HomeQuests />

        <HomeFAQs />
      </Stack>

      <HomeFooter />
    </DashboardContent>
  );
}
