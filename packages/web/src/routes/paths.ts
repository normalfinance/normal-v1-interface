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
  swap: '/swap',
  /** Same destination as the /invest → /swap permanent redirect */
  invest: '/swap',
  savings: '/savings',
  portfolio: '/portfolio',
  assets: {
    root: '/assets',
    details: (symbol: string) => `/assets/${symbol}`,
  },
  rewards: '/rewards',
  settings: '/settings',
  transaction: {
    root: '/trx',
    details: (hash: string) => `/trx/${hash}`,
  },
  legal: {
    root: '/legal',
    tos: '/legal/tos',
    pp: '/legal/pp',
    disclaimer: '/legal/disclaimer',
  },
  help: {
    buy: 'https://docs.normalfinance.io', // FIXME: update to help center when ready
    feedbackForm: 'https://link.normalfinance.io/feedback',
    contractTracker: 'https://normalfinance.notion.site/mainnet-v1',
  },
};
