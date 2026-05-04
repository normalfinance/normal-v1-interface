'use client';

import { paths } from '@/routes/paths';
import { cdn } from '@normalfinance/utils';

import ChevronRightIcon from '@mui/icons-material/ChevronRight';

import type { Props } from './normal-navbar';

export const NormalNavbarDefaults: Props = {
  logo: {
    url: '#',
    src: cdn('logo/logo-full.svg'),
    alt: 'Logo image',
  },
  links: [
    {
      title: 'App',
      url: '/',
      megaMenu: {
        categoryLinks: [
          {
            title: 'Trade',
            links: [
              {
                url: paths.swap,
                image: {
                  src: cdn('nav/swap.svg'),
                  alt: 'Swap',
                },
                title: 'Swap',
                description: 'Exchange XLM and USDC.',
              },
              {
                url: paths.portfolio,
                image: {
                  src: cdn('nav/portfolio.svg'),
                  alt: 'Portfolio',
                },
                title: 'Portfolio',
                description: 'View your account holdings.',
              },
            ],
          },
          {
            title: 'Earn',
            links: [
              {
                url: paths.savings,
                image: {
                  src: cdn('nav/provide-liquidity.svg'),
                  alt: 'Savings',
                },
                title: 'Savings',
                description: 'Earn yield on your USDC.',
              },
            ],
          },
          {
            title: 'Support',
            links: [
              {
                url: paths.help.feedbackForm,
                image: {
                  src: cdn('nav/help.svg'),
                  alt: 'Help',
                },
                title: 'Help & feedback',
                description: 'Report bugs, request features.',
              },
              {
                url: paths.docs,
                image: {
                  src: cdn('nav/docs.svg'),
                  alt: 'Docs',
                },
                title: 'Docs',
                description: 'Protocol, integration, API.',
                target: '_blank',
                rel: 'noopener noreferrer',
              },
              {
                url: paths.core.about,
                image: {
                  src: cdn('nav/about.svg'),
                  alt: 'About us',
                },
                title: 'About us',
                description: 'Mission, team & roadmap.',
              },
              {
                url: paths.core.contact,
                image: {
                  src: cdn('nav/contact.svg'),
                  alt: 'Contact',
                },
                title: 'Contact',
                description: 'Get in touch with the team.',
              },
              {
                url: paths.core.roadmap,
                image: {
                  src: cdn('nav/positions.svg'),
                  alt: 'Roadmap',
                },
                title: 'Roadmap',
                description: 'See where Normal is going.',
              },
            ],
          },
        ],
        featuredSections: {
          title: 'Shortcuts',
          links: [
            {
              url: 'https://normalfi.substack.com/p/normal-partners-with-halborn-for',
              image: {
                src: cdn('nav/halborn.webp'),
                alt: 'Normal Partners with Halborn',
              },
              title: 'Normal Partners with Halborn',
              description: 'Comprehensive Security Audit, Backed by Stellar Development Foundation',
              button: { title: 'Read more', variant: 'text', size: 'small' },
            },
          ],
        },
        button: {
          title: 'All posts',
          variant: 'text',
          size: 'small',
          endIcon: <ChevronRightIcon />,
          href: paths.blog,
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      },
    },
    {
      title: 'Docs',
      url: paths.docs,
      target: '_blank',
      rel: 'noopener noreferrer',
    },
    { title: 'About', url: '/about' },
  ],
  buttons: [
    { title: 'Button', variant: 'contained', size: 'small' },
    { title: 'Button', size: 'small' },
  ],
};
