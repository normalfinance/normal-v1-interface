import type { NavSectionProps } from '@/components/template/nav-section';

import { paths } from '@/routes/paths';
import { CONFIG } from '@/global-config';

import { SvgColor } from '@/components/template/svg-color';

// ----------------------------------------------------------------------

const icon = (name: string) => (
  <SvgColor src={`${CONFIG.assetsDir}/assets/icons/navbar/${name}.svg`} />
);

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
        title: 'Explore',
        path: paths.explore,
        icon: ICONS.analytics,
        caption: 'View pools and protocol analytics',
      },
      {
        title: 'Swap',
        path: paths.swap,
        icon: ICONS.synths,
        caption: 'Trade any Top 100 crypto directly on-chain',
      },
      {
        title: 'Liquidity',
        path: '#',
        icon: ICONS.earn,
        children: [
          {
            title: 'Positions',
            path: paths.positions.root,
            icon: ICONS.lp,
            caption: 'View your active liquidity positions',
          },
          {
            title: 'Provide Liquidity',
            path: paths.positions.create,
            icon: ICONS.lp,
            caption: 'Provide liquidity to pools and earn yield from swap fees',
          },
        ],
      },
      {
        title: 'Insurance',
        path: paths.insurance,
        icon: ICONS.yield,
        caption: 'Help protect the protocol with backstop funds and earn yield',
      },
      {
        title: 'Rewards',
        path: paths.rewards,
        icon: ICONS.rewards,
        caption: 'Earn points, refer friends, and climb the leaderboards',
      },
      {
        title: 'More',
        path: '#',
        icon: ICONS.more,
        children: [
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
