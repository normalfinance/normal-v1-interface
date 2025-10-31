// ----------------------------------------------------------------------

export const paths = {
  root: '/',
  // error
  page404: '/error/404',
  page500: '/error/500',
  // helper
  core: {
    root: 'https://www.normalfinance.io/',
    about: '/about',
    contact: '/contact',
    roadmap: '/roadmap',
  },
  socials: {
    twitter: 'https://x.com/normalfi',
    discord: 'https://discord.com/invite/xQMvceZjeS',
    github: 'https://github.com/normalfinance/',
    telegram: 'https://t.me/normalfinance',
    tiktok: 'https://www.tiktok.com/@normalfinance.io',
    instagram: 'https://www.instagram.com/normalfinance.io',
  },
  blog: 'https://normalfi.substack.com/',
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
  rewards: '/rewards',
  help: {
    buy: 'https://docs.normalfinance.io', // FIXME: update to help center when ready
    feedbackForm: 'https://forms.fillout.com/t/cumVTceVQeus',
    contractTracker: 'https://normalfinance.notion.site/mainnet-v1',
  },
};
