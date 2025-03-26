import { kebabCase } from 'es-toolkit';

// ----------------------------------------------------------------------

export const paths = {
  root: '/',
  page404: '/error/404',
  page500: '/error/500',
  website: {},
  socials: {
    twitter: 'https://x.com/normalfi',
    discord: 'https://discord.com/invite/xQMvceZjeS',
    github: 'https://github.com/normalfinance/',
  },
  blog: 'https://blog.normalfinance.io/',
  docs: 'https://docs.normalfinance.io',
  overview: '/overview',
  markets: {
    root: '/markets',
    details: (title: string) => `/markets/${kebabCase(title)}`,
  },
  index: {
    root: '/index',
    details: (title: string) => `/index/${kebabCase(title)}`,
    create: '/create-an-index',
  },
  insurance: '/insurance',
  rewards: '/rewards',
  analytics: '/analytics',
};
