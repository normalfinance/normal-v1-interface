'use client';

import type { Props } from './normal-navbar';

export const NormalNavbarDefaults: Props = {
  logo: {
    url: '#',
    src: 'https://d22po4pjz3o32e.cloudfront.net/logo-image.svg',
    alt: 'Logo image',
  },
  links: [
    { title: 'Link One', url: '#' },
    { title: 'Link Two', url: '#' },
    { title: 'Link Three', url: '#' },
    {
      title: 'Link Four',
      url: '#',
      megaMenu: {
        categoryLinks: [
          {
            title: 'Page group one',
            links: [
              {
                url: '#',
                image: {
                  src: 'https://d22po4pjz3o32e.cloudfront.net/relume-icon.svg',
                  alt: 'Icon 1',
                },
                title: 'Page One',
                description: 'Lorem ipsum dolor sit amet consectetur elit',
              },
              {
                url: '#',
                image: {
                  src: 'https://d22po4pjz3o32e.cloudfront.net/relume-icon.svg',
                  alt: 'Icon 2',
                },
                title: 'Page Two',
                description: 'Lorem ipsum dolor sit amet consectetur elit',
              },
              {
                url: '#',
                image: {
                  src: 'https://d22po4pjz3o32e.cloudfront.net/relume-icon.svg',
                  alt: 'Icon 3',
                },
                title: 'Page Three',
                description: 'Lorem ipsum dolor sit amet consectetur elit',
              },
              {
                url: '#',
                image: {
                  src: 'https://d22po4pjz3o32e.cloudfront.net/relume-icon.svg',
                  alt: 'Icon 4',
                },
                title: 'Page Four',
                description: 'Lorem ipsum dolor sit amet consectetur elit',
              },
            ],
          },
          {
            title: 'Page group two',
            links: [
              {
                url: '#',
                image: {
                  src: 'https://d22po4pjz3o32e.cloudfront.net/relume-icon.svg',
                  alt: 'Icon 5',
                },
                title: 'Page Five',
                description: 'Lorem ipsum dolor sit amet consectetur elit',
              },
              {
                url: '#',
                image: {
                  src: 'https://d22po4pjz3o32e.cloudfront.net/relume-icon.svg',
                  alt: 'Icon 6',
                },
                title: 'Page Six',
                description: 'Lorem ipsum dolor sit amet consectetur elit',
              },
              {
                url: '#',
                image: {
                  src: 'https://d22po4pjz3o32e.cloudfront.net/relume-icon.svg',
                  alt: 'Icon 7',
                },
                title: 'Page Seven',
                description: 'Lorem ipsum dolor sit amet consectetur elit',
              },
              {
                url: '#',
                image: {
                  src: 'https://d22po4pjz3o32e.cloudfront.net/relume-icon.svg',
                  alt: 'Icon 8',
                },
                title: 'Page Eight',
                description: 'Lorem ipsum dolor sit amet consectetur elit',
              },
            ],
          },
        ],
        featuredSections: {
          title: 'Featured from Blog',
          links: [
            {
              url: '#',
              image: {
                src: 'https://d22po4pjz3o32e.cloudfront.net/placeholder-image-landscape.svg',
                alt: 'Relume placeholder image 1',
              },
              title: 'Article Title',
              description: 'Lorem ipsum dolor sit amet consectetur elit',
              button: { title: 'Read more', variant: 'link', size: 'link' },
            },
            {
              url: '#',
              image: {
                src: 'https://d22po4pjz3o32e.cloudfront.net/placeholder-image-landscape.svg',
                alt: 'Relume placeholder image 2',
              },
              title: 'Article Title',
              description: 'Lorem ipsum dolor sit amet consectetur elit',
              button: { title: 'Read more', variant: 'link', size: 'link' },
            },
          ],
        },
        button: {
          title: 'See all articles',
          variant: 'link',
          size: 'link',
        },
      },
    },
  ],
  buttons: [
    { title: 'Button', variant: 'secondary', size: 'sm' },
    { title: 'Button', size: 'sm' },
  ],
};
