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
  docs: 'https://normalfi.gitbook.io/normal',
  // The marketing site's sections, until each has a page of its own.
  site: {
    wallet: '/#wallet',
    savings: '/#savings',
    swap: '/#swap',
    buy: '/#buy',
    security: '/#security',
    how: '/#how',
  },
  // The app. It lives under /app (the marketing site owns the root); the old
  // URLs redirect in next.config.mjs.
  /** Home: the signed-in overview */
  portfolio: '/app',
  swap: '/app/swap',
  /** One Circle swap's own page: every step, where the money is, what it needs. */
  swapTransfer: (id: string) => `/app/swap/transfers/${id}`,
  /** Same destination as the /invest → /app/swap permanent redirect */
  invest: '/app/swap',
  savings: '/app/savings',
  /** Indexes (behind NEXT_PUBLIC_INDEX_ENABLED): the list, then one index by its slug. */
  indexes: {
    root: '/app/indexes',
    details: (slug: string) => `/app/indexes/${slug}`,
  },
  activity: '/app/activity',
  assets: {
    root: '/app/assets',
    details: (symbol: string) => `/app/assets/${symbol}`,
  },
  settings: '/app/settings',
  auth: {
    login: '/login',
    signup: '/signup',
    callback: '/auth/callback',
  },
  transaction: {
    root: '/app/activity',
    details: (hash: string) => `/app/activity/${hash}`,
  },
  legal: {
    root: '/legal',
    tos: '/legal/tos',
    pp: '/legal/pp',
    disclaimer: '/legal/disclaimer',
    deleteAccount: '/legal/delete-account',
  },
  help: {
    buy: 'https://docs.normalfinance.io', // FIXME: update to help center when ready
    feedbackForm: 'https://discord.com/invite/xQMvceZjeS',
    contractTracker: 'https://normalfinance.notion.site/mainnet-v1',
  },
};
