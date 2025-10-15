'use client';

import type { SwapQueryParams } from '@/types/query-params';
import type { StateToken as Token } from '@normalfinance/types';

import { useEffect } from 'react';
import { cdn } from '@/utils/cdn';
import { Icon } from '@iconify/react';
import { logger } from '@normalfinance/utils';
import { useAppStore } from '@normalfinance/state';
import { useQueryParams } from '@/hooks/use-query-params';

import { CtaImage } from './cta';
import { FaqAccordion } from './faq';
import { HeroHeader } from './hero-header';
import { FeatureGrid } from './features-grid';
import { StatsGrid } from './stats-grid/stats-grid';
import { TestimonialGrid } from './testimonials/testimonials';

import type { SmallCard } from './features-grid';

export const tokens: Token[] = [
  {
    id: '<insert_pool_address>',
    name: 'Bitcoin',
    symbol: 'BTC',
    icon: cdn('tokens/bitcoin.webp'),
    usdValue: 67600.18,
    percentageChange: 2.45435,
    decimals: 7,
    balance: 0,
    featured: false,
  },
  {
    id: '<insert_pool_address>',
    name: 'Ethereum',
    symbol: 'ETH',
    icon: cdn('tokens/ethereum.webp'),
    usdValue: 3150,
    percentageChange: 1.1,
    decimals: 7,
    balance: 0,
    featured: false,
  },
  {
    id: '<insert_pool_address>',
    name: 'Solana',
    symbol: 'SOL',
    icon: cdn('tokens/solana.webp'),
    usdValue: 141,
    percentageChange: -0.8,
    decimals: 7,
    balance: 0,
    featured: false,
  },
  {
    id: '<insert_pool_address>',
    name: 'XRP',
    symbol: 'XRP',
    icon: cdn('tokens/xrp.webp'),
    usdValue: 0.48,
    percentageChange: 0.5,
    decimals: 7,
    balance: 0,
    featured: false,
  },
];

/* ---------- Feature-grid content ---------- */

export const featureCardsSmall: [SmallCard, SmallCard] = [
  {
    icon: <Icon icon="streamline-ultimate:crypto-currency-bitcoin-laptop" width={14} height={14} />,
    tagline: 'Invest',
    heading: 'Swap anything, from anywhere. 100+ crypto and RWAs on one exchange.',
    tokens,
    url: 'https://normalfinance.gitbook.io/docs/getting-started/guides/trading-on-normal',
  },
  {
    icon: <Icon icon="ph:spinner-bold" width={14} height={14} />,
    tagline: 'Indexes',
    heading: 'Diversify with ease. Custom crypto baskets in seconds.',
    image: {
      src: '/assets/images/landing-page/basket.svg',
      alt: 'Indexes',
    },
    url: 'https://normalfinance.gitbook.io/docs/getting-started/crypto-index-funds',
  },
];

export const featureCardTall = {
  icon: <Icon icon="mage:chart-fill" width={14} height={14} />,
  tagline: 'Liquidity',
  heading: 'Provide liquidity to pools on Normal and create indexes to earn yield.',
  image: {
    src: '/assets/images/landing-page/pools-feature.svg',
    alt: 'Pools',
  },
  url: 'https://normalfinance.gitbook.io/docs/getting-started/guides/providing-liquidity',
};

export const featureCardWide = {
  icon: <Icon icon="mdi:code-tags" width={14} />,
  tagline: 'Developer docs',
  heading: 'Expand the possibilities of your applications with Normal Tokens.',
  image: {
    src: '/assets/images/landing-page/dev-feature.svg',
    alt: 'Developers',
  },
  url: 'https://normalfinance.gitbook.io/docs/developers/the-normal-amm',
};

export default function LandingPage() {
  const { params } = useQueryParams<SwapQueryParams>();

  const { getAllTokens, setGlobalIsLoading } = useAppStore();

  // Effect hook to fetch all tokens once the component mounts
  useEffect(() => {
    const refreshTokens = async (): Promise<void> => {
      setGlobalIsLoading(true);
      try {
        await getAllTokens();
        setGlobalIsLoading(false);
      } catch (e) {
        logger.error(e);
      } finally {
        setGlobalIsLoading(false);
      }
    };
    refreshTokens();
  }, []);

  return (
    <>
      <HeroHeader swapParams={params} />
      <FeatureGrid
        cardsSmall={featureCardsSmall}
        cardTall={featureCardTall}
        cardWide={featureCardWide}
      />
      <TestimonialGrid />
      <FaqAccordion />
      <StatsGrid />
      <CtaImage />
    </>
  );
}
