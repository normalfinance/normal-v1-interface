'use client';

import type { Token } from '@normalfinance/types';

import { useEffect } from 'react';
import { cdn, logger } from '@normalfinance/utils';
import { useAppStore, usePersistStore } from '@normalfinance/state';

import BrandMarquee from '@/components/BrandMarquee';
import RoadmapSection from '@/components/RoadmapSection';

import { BentoSection } from './bento-section';

import { CtaImage } from './cta';
import { FaqAccordion } from './faq';
import { HeroHeader } from './hero-header';
import { StatsGrid } from './stats-grid/stats-grid';
import { TestimonialGrid } from './testimonials/testimonials';


export type TokenMeta = Pick<Token, 'name' | 'symbol' | 'icon' | 'price' | 'percentageChange'>;

export const tokens: TokenMeta[] = [
  {
    name: 'Bitcoin',
    symbol: 'BTC',
    icon: cdn('tokens/bitcoin.webp'),
    price: '89173.18',
    percentageChange: 2.45435,
  },
  {
    name: 'Vanguard S&P 500 ETF',
    symbol: 'VOO',
    icon: cdn('icons/vanguard.svg'),
    price: '633.87',
    percentageChange: 1.1,
  },
  {
    name: 'Gold',
    symbol: 'XAU',
    icon: cdn('icons/gold.svg'),
    price: '4982.4',
    percentageChange: 0.43,
  },
  {
    name: 'Top 20 Crypto Index',
    symbol: 'TOP20',
    icon: cdn('logo/logo-single.svg'),
    price: '100.48',
    percentageChange: -0.5,
  },
];


export default function LandingPage() {
  const { setGlobalIsLoading } = useAppStore();
  const { wallet, getAllTokens } = usePersistStore();

  // Effect hook to fetch all pools and tokens once the component mounts
  useEffect(() => {
    const refreshTokens = async (): Promise<void> => {
      try {
        setGlobalIsLoading(true);
        await getAllTokens();
      } catch (e) {
        logger.error(e);
      } finally {
        setGlobalIsLoading(false);
      }
    };
    refreshTokens();
  }, [wallet.address]);

  return (
    <>
      <HeroHeader/>
      <BrandMarquee />
      <BentoSection />
      <StatsGrid />
      <RoadmapSection />
      <FaqAccordion />
      <TestimonialGrid />
      <CtaImage />
    </>
  );
}
