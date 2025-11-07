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

export const tokens: Token[] = [
  {
    contract: '<insert_pool_address>',
    issuer: '',
    org: 'Normal',
    domain: 'normalfinance.io',
    name: 'Bitcoin',
    symbol: 'BTC',
    icon: cdn('tokens/bitcoin.webp'),
    price: '67600.18',
    percentageChange: 2.45435,
    decimals: 7,
    balance: '0',
    featured: false,
  },
  {
    contract: '<insert_pool_address>',
    issuer: '',
    org: 'Normal',
    domain: 'normalfinance.io',
    name: 'Ethereum',
    symbol: 'ETH',
    icon: cdn('tokens/ethereum.webp'),
    price: '3150',
    percentageChange: 1.1,
    decimals: 7,
    balance: '0',
    featured: false,
  },
  {
    contract: '<insert_pool_address>',
    issuer: '',
    org: 'Normal',
    domain: 'normalfinance.io',
    name: 'Solana',
    symbol: 'SOL',
    icon: cdn('tokens/solana.webp'),
    price: '141',
    percentageChange: -0.8,
    decimals: 7,
    balance: '0',
    featured: false,
  },
  {
    contract: '<insert_pool_address>',
    issuer: '',
    org: 'Normal',
    domain: 'normalfinance.io',
    name: 'XRP',
    symbol: 'XRP',
    icon: cdn('tokens/xrp.webp'),
    price: '0.48',
    percentageChange: 0.5,
    decimals: 7,
    balance: '0',
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
  image: { component: <AnimatedPoolsFeature /> },
  url: 'https://normalfinance.gitbook.io/docs/getting-started/guides/providing-liquidity',
} as const;

export const featureCardWide = {
  icon: <Icon icon="mdi:code-tags" width={14} />,
  tagline: 'Developer docs',
  heading: 'Expand the possibilities of your applications with Normal Tokens.',
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
      <TestimonialGrid />
      <FaqAccordion />
      <StatsGrid />
      <CtaImage />
    </>
  );
}
