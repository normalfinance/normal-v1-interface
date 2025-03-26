import type { NavSectionProps } from '@/components/nav-section';

import { CONFIG } from '@/global-config';
import { SvgColor } from '@/components/svg-color';

import { paths } from 'src/routes/paths';

// ----------------------------------------------------------------------

const icon = (name: string) => (
  <SvgColor src={`${CONFIG.assetsDir}/assets/icons/navbar/${name}.svg`} />
);

// TODO: update icons
const ICONS = {
  home: icon('mingcute-home'),
  trade: icon('mingcute-trade'),
  synths: icon('mingcute-synths'),
  indexes: icon('mingcute-indexes'),
  earn: icon('mingcute-earn'),
  external: icon('mingcute-external'),
  insurance: icon('mingcute-insurance'),
  referrals: icon('mingcute-referrals'),
  analytics: icon('mingcute-analytics'),
  rewards: icon('mingcute-rewards'),
  lp: icon('mingcute-lp'),
  yield: icon('mingcute-yield'),
  more: icon('mingcute-more'),
};

// ----------------------------------------------------------------------

export const navData: NavSectionProps['data'] = [
  {
    subheader: '',
    items: [
      {
        title: 'Overview',
        path: paths.root,
        icon: ICONS.home,
      },
      {
        title: 'Trade',
        path: '#',
        icon: ICONS.trade,
        children: [
          {
            title: 'Synths',
            path: '#', // paths.markets.root,
            icon: ICONS.synths,
            caption: 'Trade any Top 100 asset directly on-chain',
          },
          {
            title: 'Indexes',
            path: paths.index.create,
            icon: ICONS.indexes,
            caption: 'Build diversified portfolios of assets to automate or hedge your investing',
          },
        ],
      },
      {
        title: 'Earn',
        path: '#',
        icon: ICONS.earn,
        children: [
          {
            title: 'Yield',
            path: '#', // paths.markets.root,
            icon: ICONS.yield,
            caption: 'Mint synths by depositing collateral and earn yield from exchange fees',
          },
          {
            title: 'LP',
            path: '#', // paths.markets.root,
            icon: ICONS.lp,
            caption: 'Provide liquidity to pools and earn yield from swaps',
          },
          {
            title: 'Insurance',
            path: '#', // paths.insurance,
            icon: ICONS.insurance,
            caption: 'Stake your assets into a vault and earn yield from exchange fees',
          },
        ],
      },
      {
        title: 'Rewards',
        path: '#',
        icon: ICONS.rewards,
        children: [
          {
            title: 'Referrals',
            path: '#', // paths.rewards,
            icon: ICONS.referrals,
            caption: 'Refer friends to Normal and earn a share of their trading fees',
          },
        ],
      },
      {
        title: 'Analytics',
        path: '#', // paths.analytics,
        icon: ICONS.analytics,
      },
      {
        title: 'More',
        path: '#',
        icon: ICONS.more,
        children: [
          {
            title: 'Governance',
            path: '#', // 'https://www.google.com/',
            icon: ICONS.external,
            caption: 'NORM is a governance token powering the Normal platform',
          },
          {
            title: 'Help & Feedback',
            path: '#', // 'https://www.google.com/',
            icon: ICONS.external,
            caption: 'Get help and submit product feedback and ideas',
          },
          {
            title: 'Docs',
            path: paths.docs,
            icon: ICONS.external,
            caption: 'Everything you need to know about getting started with Normal',
          },
        ],
      },
    ],
  },
];
