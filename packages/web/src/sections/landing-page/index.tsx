import { FeatureGrid } from './features-grid';
import { HeroHeader } from './hero-header';
import { Token } from '@/types/token';
import { Icon } from '@iconify/react';

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
        /* ---------- left column: two small cards ---------- */
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
            button: { title: 'Portfolio', variant: 'text' },
            url: '#',
          },
          {
            icon: <Icon icon="ph:spinner-bold" width="14" height="14" />,

            tagline: 'Liquidity',
            heading: 'Deep on-chain pools',
            image: {
              src: 'https://picsum.photos/600/800?liquidity',
              alt: 'Liquidity',
            },
            button: { title: 'Pools', variant: 'text' },
            url: '#',
          },
        ]}
        /* ---------- right column: tall card (spans 2 rows) ---------- */
        cardTall={{
          icon: <Icon icon="mage:chart-fill" width="14" height="14" />,
          tagline: 'Speed',
          heading: 'Sub-second swaps',
          image: {
            src: 'https://picsum.photos/800/600?speed',
            alt: 'Lightning-fast execution',
          },
          buttons: [
            { title: 'Start swapping', variant: 'contained', color: 'primary' },
            { title: 'Docs', variant: 'text' },
          ],
          url: '#',
        }}
        /* ---------- bottom: wide card (spans 2 columns) ---------- */
        cardWide={{
          icon: <Icon icon="mdi:code-tags" width={14} />,
          tagline: 'Compliance',
          heading: 'Regulated in the EU',
          url: '#',
        }}
      />
    </>
  );
}
