// ----------------------------------------------------------------------

export const paths = {
  root: '/',
  // error
  page404: '/error/404',
  page500: '/error/500',
  // helper
  website: {
    root: 'https://www.normalfinance.io/',
  },
  socials: {
    twitter: 'https://x.com/normalfi',
    discord: 'https://discord.com/invite/xQMvceZjeS',
    github: 'https://github.com/normalfinance/',
  },
  blog: 'https://blog.normalfinance.io/',
  // docs: 'https://docs.normalfinance.io',
  docs: 'https://normalfinance.gitbook.io/docs',
  // main
  explore: '/explore',
  pools: {
    details: (poolAddress: string) => `/pools/${poolAddress}`,
  },
  positions: {
    root: '/positions',
    create: '/positions/create',
  },
  swap: '/swap',
  insurance: '/insurance',
  rewards: '/rewards',
  help: {
    buy: 'https://docs.normalfinance.io', // FIXME: update to help center when ready
  },
};
