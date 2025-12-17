'use client';

import type { Token } from '@normalfinance/types';
import type { SwapQueryParams } from '@/types/query-params';

import { useEffect } from 'react';
import { Icon } from '@iconify/react';
import { cdn, logger } from '@normalfinance/utils';
import { useQueryParams } from '@/hooks/use-query-params';
import { useAppStore, usePersistStore } from '@normalfinance/state';

import AnimatedDevFeature2 from '@/components/ui/animated-dev-feature';
import AnimatedPoolsFeature from '@/components/ui/animated-pools-feature';

import { CtaImage } from './cta';
import { FaqAccordion } from './faq';
import { HeroHeader } from './hero-header';
import { FeatureGrid } from './features-grid';
import { StatsGrid } from './stats-grid/stats-grid';
import { TestimonialGrid } from './testimonials/testimonials';

import type { SmallCard } from './features-grid';

export type TokenMeta = Pick<Token, 'name' | 'symbol' | 'icon' | 'price' | 'percentageChange'>;

export const tokens: TokenMeta[] = [
  {
    name: 'Bitcoin',
    symbol: 'BTC',
    icon: cdn('tokens/bitcoin.webp'),
    price: '67600.18',
    percentageChange: 2.45435,
  },
  {
    name: 'Vanguard S&P 500 ETF',
    symbol: 'VOO',
    icon: cdn('tokens/voo.webp'),
    price: '626.87',
    percentageChange: 1.1,
  },
  {
    name: 'Gold',
    symbol: 'XAU',
    icon: cdn('tokens/xau.webp'),
    price: '4300.4',
    percentageChange: 0.43,
  },
  {
    name: 'Top 20 Crypto Index',
    symbol: 'TOP20',
    icon: cdn('tokens/top20.webp'),
    price: '0.48',
    percentageChange: -0.5,
  },
];

/* ---------- Feature-grid content ---------- */

export const featureCardsSmall: [SmallCard, SmallCard] = [
  {
    icon: <Icon icon="streamline-ultimate:crypto-currency-bitcoin-laptop" width={14} height={14} />,
    tagline: 'Invest',
    heading:
      'Long and short any global asset including crypto, equities, commodities, ETFs and more.',
    tokens,
    url: 'https://normalfinance.gitbook.io/docs/getting-started/guides/trading-on-normal',
  },
  {
    icon: <Icon icon="ph:spinner-bold" width={14} height={14} />,
    tagline: 'Diversify',
    heading:
      'Use popular index funds to manage risk and automate your portfolio - or build your own!',
    image: {
      src: '/assets/images/landing-page/basket.svg',
      alt: 'Indexes',
    },
    url: 'https://normalfinance.gitbook.io/docs/getting-started/crypto-index-funds',
  },
];

export const featureCardTall = {
  icon: <Icon icon="mage:chart-fill" width={14} height={14} />,
  tagline: 'Earn',
  heading: 'Put every dollar to work and earn 7-15% APY in seconds.',
  image: { component: <AnimatedPoolsFeature /> },
  url: 'https://normalfinance.gitbook.io/docs/getting-started/guides/providing-liquidity',
} as const;

export const featureCardWide = {
  icon: <Icon icon="mdi:code-tags" width={14} />,
  tagline: 'Develop',
  heading:
    'Integrate hedging and diversification to your application with our new DeFi primitives.',
  image: { component: <AnimatedDevFeature2 imageSrc={cdn('homepage/chart.webp')} /> },
  url: 'https://normalfinance.gitbook.io/docs/developers/the-normal-amm',
};

export default function LandingPage() {
  const { params } = useQueryParams<SwapQueryParams>();

  const { setGlobalIsLoading } = useAppStore();
  const { wallet, getAllTokens, getAllPools } = usePersistStore();

  // Effect hook to fetch all pools and tokens once the component mounts
  useEffect(() => {
    const refreshTokens = async (): Promise<void> => {
      try {
        setGlobalIsLoading(true);
        await getAllPools();
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
      <HeroHeader swapParams={params} />
      <FeatureGrid
        cardsSmall={featureCardsSmall}
        cardTall={featureCardTall}
        cardWide={featureCardWide}
      />
      <StatsGrid />
      <TestimonialGrid />
      <FaqAccordion />
      <CtaImage />
    </>
  );
}
