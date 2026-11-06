// ----------------------------------------------------------------------

// Every milestone on the roadmap, oldest first. The hero's counts and its
// "Next ship" are read from this list, so they can't drift from it.

export type MilestoneStatus = 'shipped' | 'in-progress' | 'planned';

export type Milestone = {
  title: string;
  description: string;
  date: string;
  status: MilestoneStatus;
  link?: string;
};

export const STATUS_ORDER: readonly MilestoneStatus[] = ['shipped', 'in-progress', 'planned'];

export const STATUS_LABEL: Record<MilestoneStatus, string> = {
  shipped: 'Shipped',
  'in-progress': 'In progress',
  planned: 'Planned',
};

export const MILESTONES: Milestone[] = [
  {
    status: 'shipped',
    title: 'Launched first Normal crypto indexes',
    date: 'Nov 2023',
    description: 'Introduced initial set of Normal index products to the public.',
  },
  {
    status: 'shipped',
    title: 'Started building Stellar on-chain index funds',
    date: 'Feb 2024',
    description: 'DraperU x Stellar hacker house: won the on-chain index funds track.',
  },
  {
    status: 'shipped',
    title: 'Hit $100k index AUM',
    date: 'Jun 2024',
    description: 'Milestone AUM reached across Normal index products.',
    link: 'https://x.com/normalfi/status/1798371781062881565',
  },
  {
    status: 'shipped',
    title: 'Halborn smart-contract audit passed',
    date: 'Sep 2024',
    description: 'Full audit of savings and lending contracts. Zero criticals.',
  },
  {
    status: 'shipped',
    title: 'Normal Savings launched',
    date: 'Jan 2025',
    description: 'Non-custodial USDC savings account live on Stellar mainnet.',
  },
  {
    status: 'shipped',
    title: 'Hit $24M total deposits',
    date: 'Apr 2026',
    description: 'Crossed $24M TVL across USDC savings vaults.',
  },
  {
    status: 'shipped',
    title: 'Multi-chain support: Turnkey, LI.FI & MoneyGram',
    date: 'Jun 2026',
    description:
      'Self-custody BTC, ETH and SOL wallets via Turnkey, cross-chain swaps through LI.FI, and MoneyGram cash in & out.',
  },
  {
    status: 'in-progress',
    title: 'Blockdaemon setup',
    date: 'Aug 2026',
    description:
      'Enterprise-grade node infrastructure via Blockdaemon for faster, more reliable multi-chain reads and broadcasts.',
  },
  {
    status: 'in-progress',
    title: 'Token listing: BNB, ADA, AVAX, DOT, NEAR, STX, ONDO',
    date: 'Aug 2026',
    description:
      'Expanding supported assets: buy, hold and send BNB, ADA, AVAX, DOT, NEAR, STX and ONDO.',
  },
  {
    status: 'in-progress',
    title: 'Normal Crypto Indexes',
    date: 'Q4 2026',
    description: 'Build and invest in custom crypto indexes tailored to your strategy.',
  },
  {
    status: 'planned',
    title: 'Normal Mobile App',
    date: 'Q4 2026',
    description: 'Native iOS and Android app bringing the full Normal experience to mobile.',
  },
  {
    status: 'planned',
    title: 'Recurring deposits + auto-compound',
    date: 'Q4 2026',
    description: 'Schedule recurring buys, auto-roll yield, set DCA targets.',
  },
  {
    status: 'planned',
    title: 'Normal Credit Card',
    date: 'Q4 2026',
    description: 'Spend your earnings in the real world with a Normal credit card.',
  },
  {
    status: 'planned',
    title: 'Real-world assets (treasuries, ETFs)',
    date: '2027',
    description: 'Bring tokenized treasuries, money-market funds and ETFs to Normal.',
  },
  {
    status: 'planned',
    title: 'Open developer SDK',
    date: '2027',
    description: 'Public TypeScript SDK and on-chain identity for builders on Stellar.',
  },
];

/** How many milestones have this status. */
export const countByStatus = (status: MilestoneStatus) =>
  MILESTONES.filter((milestone) => milestone.status === status).length;

/** When the next thing ships: the date of the first milestone still in progress. */
export const NEXT_SHIP = MILESTONES.find((milestone) => milestone.status === 'in-progress')?.date;
