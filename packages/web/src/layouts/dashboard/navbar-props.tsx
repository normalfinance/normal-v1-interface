'use client';

import { paths } from '@/routes/paths';
import { cdn } from '@normalfinance/utils';

import FlagOutlined from '@mui/icons-material/FlagOutlined';
import FeedOutlined from '@mui/icons-material/FeedOutlined';
import MailOutlined from '@mui/icons-material/MailOutlined';
import HelpOutlined from '@mui/icons-material/HelpOutlined';
import PeopleOutlined from '@mui/icons-material/PeopleOutlined';
import SavingsOutlined from '@mui/icons-material/SavingsOutlined';
import ArticleOutlined from '@mui/icons-material/ArticleOutlined';
import BarChartOutlined from '@mui/icons-material/BarChartOutlined';
import SwapVertOutlined from '@mui/icons-material/SwapVertOutlined';

import type { Props } from './normal-navbar';

export const NormalNavbarDefaults: Props = {
  logo: {
    url: '#',
    src: cdn('logo/logo-full.svg'),
    alt: 'Logo image',
  },
  links: [
    {
      title: 'Product',
      url: '/',
      megaMenu: {
        banner: {
          badge: '~8% APY',
          title: 'Start saving in 60 seconds',
          subtitle: 'No fees. Withdraw anytime. Non-custodial.',
          buttonLabel: 'Open app →',
          buttonHref: paths.savings,
        },
        categoryLinks: [
          {
            title: 'Earn',
            links: [
              {
                url: paths.savings,
                icon: <SavingsOutlined sx={{ fontSize: 20 }} />,
                title: 'Savings',
                description: 'Earn 8%+ APY on USDC.',
              },
            ],
          },
          {
            title: 'Move',
            links: [
              {
                url: paths.swap,
                icon: <SwapVertOutlined sx={{ fontSize: 20 }} />,
                title: 'Swap',
                description: 'Exchange XLM, USDC and more.',
              },
              {
                url: paths.portfolio,
                icon: <BarChartOutlined sx={{ fontSize: 20 }} />,
                title: 'Portfolio',
                description: 'Track your holdings.',
              },
            ],
          },
        ],
      },
    },
    {
      title: 'Resources',
      url: '/',
      megaMenu: {
        banner: {
          badge: 'New post',
          title: 'Making crypto Normal: simple, safe, and stable',
          meta: '5 min read',
          image: 'https://cdn.normalapi.com/blog/6aceaec9-3a28-4c77-b830-40111bd8dc83_5824x4192.webp',
          buttonLabel: 'Read →',
          buttonHref: 'https://normalfi.substack.com/p/making-crypto-normal-simple-safe',
          buttonTarget: '_blank',
        },
        categoryLinks: [
          {
            title: 'Learn',
            links: [
              {
                url: paths.docs,
                icon: <ArticleOutlined sx={{ fontSize: 20 }} />,
                title: 'Docs',
                description: 'Developer + integration guides.',
                target: '_blank',
                rel: 'noopener noreferrer',
              },
              {
                url: paths.help.feedbackForm,
                icon: <HelpOutlined sx={{ fontSize: 20 }} />,
                title: 'Help & feedback',
                description: 'Report bugs, request features.',
              },
            ],
          },
          {
            title: 'Company',
            links: [
              {
                url: paths.core.about,
                icon: <PeopleOutlined sx={{ fontSize: 20 }} />,
                title: 'About',
                description: 'Our mission and team.',
              },
              {
                url: paths.core.roadmap,
                icon: <FlagOutlined sx={{ fontSize: 20 }} />,
                title: 'Roadmap',
                description: 'Where Normal is going.',
              },
              {
                url: 'https://normalfi.substack.com/',
                icon: <FeedOutlined sx={{ fontSize: 20 }} />,
                title: 'Blog',
                description: 'Product updates and stories.',
                target: '_blank',
                rel: 'noopener noreferrer',
              },
              {
                url: paths.core.contact,
                icon: <MailOutlined sx={{ fontSize: 20 }} />,
                title: 'Contact',
                description: 'Get in touch with the team.',
              },
            ],
          },
        ],
      },
    },
    { title: 'Savings', url: paths.savings },
    { title: 'Portfolio', url: paths.portfolio },
    { title: 'About', url: paths.core.about },
  ],
  buttons: [
    { title: 'Button', variant: 'contained', size: 'small' },
    { title: 'Button', size: 'small' },
  ],
};
