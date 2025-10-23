'use client';

import { paths } from '@/routes/paths';

import ChevronRightIcon from '@mui/icons-material/ChevronRight';

import type { Props } from './normal-navbar';

export const NormalNavbarDefaults: Props = {
  logo: {
    url: '#',
    src: 'https://d22po4pjz3o32e.cloudfront.net/logo-image.svg',
    alt: 'Logo image',
  },
  links: [
    {
      title: 'App',
      url: '/app',
      megaMenu: {
        categoryLinks: [
          {
            title: 'Trading',
            links: [
              {
                url: '/explore',
                image: {
                  src: '/assets/icons/normal-navbar/explore.svg',
                  alt: 'Explore',
                },
                title: 'Explore',
                description: 'Browse markets and pools.',
              },
              {
                url: paths.swap,
                image: {
                  src: '/assets/icons/normal-navbar/swap.svg',
                  alt: 'Swap',
                },
                title: 'Swap',
                description: 'Trade tokens instantly.',
              },
            ],
          },
          {
            title: 'Indexes',
            links: [
              {
                url: '/indexes',
                image: { src: '/assets/icons/normal-navbar/indexes.svg', alt: 'Browse Indexes' },
                title: 'Browse indexes',
                description: 'Discover curated on-chain indexes.',
              },
              {
                url: '/indexes/create',
                image: { src: '/assets/icons/normal-navbar/create-index.svg', alt: 'Create Index' },
                title: 'Create index',
                description: 'Build and manage your own index.',
              },
            ],
          },
          {
            title: 'Liquidity',
            links: [
              {
                url: paths.positions.root,
                image: {
                  src: '/assets/icons/normal-navbar/positions.svg',
                  alt: 'Positions',
                },
                title: 'Positions',
                description: 'View & manage LP positions.',
              },
              {
                url: paths.positions.create,
                image: {
                  src: '/assets/icons/normal-navbar/provide-liquidity.svg',
                  alt: 'Provide',
                },
                title: 'Provide liquidity',
                description: 'Deposit tokens to earn fees.',
              },
            ],
          },
          {
            title: 'Safety & Rewards',
            links: [
              {
                url: paths.rewards,
                image: {
                  src: '/assets/icons/normal-navbar/rewards.svg',
                  alt: 'Rewards',
                },
                title: 'Rewards',
                description: 'Current incentives & APRs.',
              },
            ],
          },
          {
            title: 'Support',
            links: [
              {
                url: paths.help.feedbackForm,
                image: {
                  src: '/assets/icons/normal-navbar/help.svg',
                  alt: 'Help',
                },
                title: 'Help & feedback',
                description: 'Report bugs, request features.',
              },
              {
                url: paths.docs,
                image: {
                  src: '/assets/icons/normal-navbar/docs.svg',
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
                  src: '/assets/icons/normal-navbar/about.svg',
                  alt: 'About us',
                },
                title: 'About us',
                description: 'Mission, team & roadmap.',
              },
              {
                url: paths.core.contact,
                image: {
                  src: '/assets/icons/normal-navbar/contact.svg',
                  alt: 'Contact',
                },
                title: 'Contact',
                description: 'Get in touch with the team.',
              },
              {
                url: paths.core.roadmap,
                image: {
                  src: '/assets/icons/normal-navbar/positions.svg',
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
                src: '/assets/images/normal-navbar/halborn.webp',
                alt: 'Normal Partners with Halborn',
              },
              title: 'Normal Partners with Halborn',
              description: 'Comprehensive Security Audit, Backed by Stellar Development Foundation',
              button: { title: 'Read more', variant: 'text', size: 'small' },
            },
            {
              url: 'https://normalfi.substack.com/p/the-normal-top-10-index',
              image: {
                src: '/assets/images/normal-navbar/index.webp',
                alt: 'The Normal Top 10 Index',
              },
              title: 'The Normal Top 10 Index',
              description: 'Composed of the top 10 cryptocurrencies by market capitalization.',
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
