'use client';

import { paths } from '@/routes/paths';
import { cdn } from '@normalfinance/utils';

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
                image: { src: cdn('nav/provide-liquidity.svg'), alt: 'Savings' },
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
                image: { src: cdn('nav/swap.svg'), alt: 'Swap' },
                title: 'Swap',
                description: 'Exchange XLM, USDC and more.',
              },
              {
                url: paths.portfolio,
                image: { src: cdn('nav/portfolio.svg'), alt: 'Portfolio' },
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
                image: { src: cdn('nav/docs.svg'), alt: 'Docs' },
                title: 'Docs',
                description: 'Developer + integration guides.',
                target: '_blank',
                rel: 'noopener noreferrer',
              },
              {
                url: paths.help.feedbackForm,
                image: { src: cdn('nav/help.svg'), alt: 'Help' },
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
                image: { src: cdn('nav/about.svg'), alt: 'About' },
                title: 'About',
                description: 'Our mission and team.',
              },
              {
                url: paths.core.roadmap,
                image: { src: cdn('nav/positions.svg'), alt: 'Roadmap' },
                title: 'Roadmap',
                description: 'Where Normal is going.',
              },
              {
                url: 'https://normalfi.substack.com/',
                image: { src: cdn('nav/blog.svg'), alt: 'Blog' },
                title: 'Blog',
                description: 'Product updates and stories.',
                target: '_blank',
                rel: 'noopener noreferrer',
              },
              {
                url: paths.core.contact,
                image: { src: cdn('nav/contact.svg'), alt: 'Contact' },
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
