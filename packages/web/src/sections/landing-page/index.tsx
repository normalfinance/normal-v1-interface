'use client';

import type { SwapQueryParams } from '@/types/query-params';
import type { StateToken as Token } from '@normalfinance/types';

import { useEffect } from 'react';
import { Icon } from '@iconify/react';
import { logger } from '@normalfinance/utils';
import { useQueryParams } from '@/hooks/use-query-params';
import { useAppStore, usePersistStore } from '@normalfinance/state';

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
    icon: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png',
    oraclePrice: 67600.18,
    nativePrice: 0,
    percentageChange: 2.45435,
    decimals: 7,
    balance: 0,
    featured: false,
  },
  {
    contract: '<insert_pool_address>',
    issuer: '',
    org: 'Normal',
    domain: 'normalfinance.io',
    name: 'Ethereum',
    symbol: 'ETH',
    icon: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png',
    oraclePrice: 3150,
    nativePrice: 0,
    percentageChange: 1.1,
    decimals: 7,
    balance: 0,
    featured: false,
  },
  {
    contract: '<insert_pool_address>',
    issuer: '',
    org: 'Normal',
    domain: 'normalfinance.io',
    name: 'Solana',
    symbol: 'SOL',
    icon: 'https://assets.coingecko.com/coins/images/4128/large/solana.png',
    oraclePrice: 141,
    nativePrice: 0,
    percentageChange: -0.8,
    decimals: 7,
    balance: 0,
    featured: false,
  },
  {
    contract: '<insert_pool_address>',
    issuer: '',
    org: 'Normal',
    domain: 'normalfinance.io',
    name: 'XRP',
    symbol: 'XRP',
    icon: 'https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png',
    oraclePrice: 0.48,
    nativePrice: 0,
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
      src: '/assets/images/landing-page/index-feature.svg',
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

  const { setGlobalIsLoading } = useAppStore();
  const { getAllTokens, getAllPools } = usePersistStore();

  // Effect hook to fetch all tokens and pools once the component mounts
  useEffect(() => {
    const refreshData = async (): Promise<void> => {
      setGlobalIsLoading(true);
      try {
        await Promise.all([await getAllTokens(), await getAllPools()]);
        setGlobalIsLoading(false);
      } catch (e) {
        logger.error(e);
      } finally {
        setGlobalIsLoading(false);
      }
    };
    refreshData();
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
