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
  legal: {
    tos: 'https://normalfinance.gitbook.io/docs/other/legal/terms-of-service',
    pp: 'https://normalfinance.gitbook.io/docs/other/legal/privacy-policy',
    disclaimer: 'https://normalfinance.gitbook.io/docs/other/legal/disclaimer',
  },
  // main
  invest: '/invest',
  assets: {
    root: '/assets',
    details: (symbol: string) => `/assets/${symbol}`,
  },
  indexes: {
    root: '/indexes',
    create: '/indexes/create',
    details: (id: string) => `/indexes/${id}`,
  },
  earn: '/earn',
  rewards: '/rewards',
  settings: '/settings',
  transaction: {
    root: '/trx',
    details: (hash: string) => `/trx/${hash}`,
  },
  help: {
    buy: 'https://docs.normalfinance.io', // FIXME: update to help center when ready
    feedbackForm: 'https://forms.fillout.com/t/cumVTceVQeus',
    contractTracker: 'https://normalfinance.notion.site/mainnet-v1',
  },
};
