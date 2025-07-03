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
  // docs: 'https://docs.normalfinance.io',
  docs: 'https://normalfinance.gitbook.io/docs',
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
  rewards: '/rewards',
  analytics: '/analytics',
  help: {
    buy: 'https://docs.normalfinance.io', // FIXME: update to help center when ready
  },
};
