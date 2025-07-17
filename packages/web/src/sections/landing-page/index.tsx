import type { StateToken as Token } from '@normalfinance/types';

import { Icon } from '@iconify/react';

import { CtaImage } from './cta';
import { FaqAccordion } from './faq';
import { HeroHeader } from './hero-header';
import { FeatureGrid } from './features-grid';
import { StatsGrid } from './stats-grid/stats-grid';
import { TestimonialGrid } from './testimonials/testimonials';

import type { SmallCard} from './features-grid';

export const tokens: Token[] = [
  {
    id: '<insert_pool_address>',
    name: 'Bitcoin',
    symbol: 'BTC',
    icon: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png',
    usdValue: 67600.18,
    percentageChange: 2.45435,
    decimals: 7,
    balance: BigInt(0),
    featured: false,
  },
  {
    id: '<insert_pool_address>',
    name: 'Ethereum',
    symbol: 'ETH',
    icon: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png',
    usdValue: 3150,
    percentageChange: 1.1,
    decimals: 7,
    balance: BigInt(0),
    featured: false,
  },
  {
    id: '<insert_pool_address>',
    name: 'Solana',
    symbol: 'SOL',
    icon: 'https://assets.coingecko.com/coins/images/4128/large/solana.png',
    usdValue: 141,
    percentageChange: -0.8,
    decimals: 7,
    balance: BigInt(0),
    featured: false,
  },
  {
    id: '<insert_pool_address>',
    name: 'XRP',
    symbol: 'XRP',
    icon: 'https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png',
    usdValue: 0.48,
    percentageChange: 0.5,
    decimals: 7,
    balance: BigInt(0),
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
  return (
    <>
      <HeroHeader />
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
