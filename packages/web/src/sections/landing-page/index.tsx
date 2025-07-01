import { FeatureGrid } from './features-grid';
import { HeroHeader } from './hero-header';
import { Token } from '@/types/token';
import { Icon } from '@iconify/react';
import { StatsGrid } from './stats-grid/stats-grid';
import { TestimonialGrid } from './testimonials/testimonials';
import { FaqAccordion } from './faq';
import { CtaImage } from './cta';

export const tokens: Token[] = [
  {
    id: 1,
    name: 'Bitcoin',
    shortname: 'BTC',
    icon: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png',
    pricestatus: 67600.18,
    percentageChange: 2.45435,
    url: '#',
  },
  {
    id: 2,
    name: 'Ethereum',
    shortname: 'ETH',
    icon: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png',
    pricestatus: 3150,
    percentageChange: 1.1,
    url: '#',
  },
  {
    id: 3,
    name: 'Solana',
    shortname: 'SOL',
    icon: 'https://assets.coingecko.com/coins/images/4128/large/solana.png',
    pricestatus: 141,
    percentageChange: -0.8,
    url: '#',
  },
  {
    id: 4,
    name: 'XRP',
    shortname: 'XRP',
    icon: 'https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png',
    pricestatus: 0.48,
    percentageChange: 0.5,
    url: '#',
  },
];

export default function LandingPage() {
  return (
    <>
      <HeroHeader />
      <FeatureGrid
        cardsSmall={[
          {
            icon: (
              <Icon
                icon="streamline-ultimate:crypto-currency-bitcoin-laptop"
                width="14"
                height="14"
              />
            ),
            tagline: 'Invest',
            heading: 'Swap anything, from anywhere. 100+ crypto and RWAs on one exchange.',
            tokens,
            url: '#',
          },
          {
            icon: <Icon icon="ph:spinner-bold" width="14" height="14" />,

            tagline: 'Indexes',
            heading: 'Diversify with ease. Custom crypto baskets in seconds.',
            image: {
              src: '/assets/images/landing-page/index-feature.svg',
              alt: 'Indexes',
            },
            url: '#',
          },
        ]}
        cardTall={{
          icon: <Icon icon="mage:chart-fill" width="14" height="14" />,
          tagline: 'Liquidity',
          heading: 'Provide liquidity to pools on Normal and create indexes to earn yield.',
          image: {
            src: '/assets/images/landing-page/pools-feature.svg',
            alt: 'Pools',
          },
          url: '#',
        }}
        cardWide={{
          icon: <Icon icon="mdi:code-tags" width={14} />,
          tagline: 'Developer docs',
          heading: 'Expand the possibilities of your applications with Normal Tokens.',
          image: {
            src: '/assets/images/landing-page/dev-feature.svg',
            alt: 'Developers',
          },
          url: '#',
        }}
      />
      <StatsGrid />
      <TestimonialGrid />
      {/*<FaqAccordion
        questions={[
          {
            title: 'How does Normal Finance work?',
            answer: 'Normal pools liquidity across multiple DEXs to give you the best rate…',
          },
          {
            title: 'Do I need an account to start?',
            answer: 'Normal pools liquidity across multiple DEXs to give you the best rate…',
          },
          {
            title: 'Which tokens can I trade?',
            answer: 'Normal pools liquidity across multiple DEXs to give you the best rate…',
          },
          {
            title: 'What are indexes?',
            answer: 'Normal pools liquidity across multiple DEXs to give you the best rate…',
          },
          {
            title: 'Is it safe to use?',
            answer: 'Normal pools liquidity across multiple DEXs to give you the best rate…',
          },
        ]}
      />*/}
      <CtaImage />
    </>
  );
}
