// -----------------------------------------------------------------------------
//  Common helpers
// -----------------------------------------------------------------------------
export interface TokenAmount {
  token: string;
  iconUrl: string;
  amount: number;
}

interface ActivityBase {
  id: number;
  timestamp: number;
}

// -----------------------------------------------------------------------------
//  Individual activity variants
// -----------------------------------------------------------------------------
export interface SentActivity extends ActivityBase {
  type: 'Sent';
  address: string; // ⬅ where the funds went
  asset: TokenAmount;
}

export interface ReceivedActivity extends ActivityBase {
  type: 'Received';
  address: string; // ⬅ where the funds came from
  asset: TokenAmount;
}

export interface SwappedActivity extends ActivityBase {
  type: 'Swapped';
  sell: TokenAmount;
  buy: TokenAmount;
}

export interface AddLiquidityActivity extends ActivityBase {
  type: 'Add Liquidity';
  lpToken: TokenAmount;
}

export interface RemoveLiquidityActivity extends ActivityBase {
  type: 'Remove Liquidity';
  lpToken: TokenAmount;
}

export interface StakeActivity extends ActivityBase {
  type: 'Stake';
  asset: TokenAmount;
}

export interface UnstakeActivity extends ActivityBase {
  type: 'Unstake';
  asset: TokenAmount;
}

// -----------------------------------------------------------------------------
//  Discriminated union
// -----------------------------------------------------------------------------
export type Activity =
  | SentActivity
  | ReceivedActivity
  | SwappedActivity
  | AddLiquidityActivity
  | RemoveLiquidityActivity
  | StakeActivity
  | UnstakeActivity;

// -----------------------------------------------------------------------------
//  Demo data — one example of every variant
// -----------------------------------------------------------------------------
export const history: Activity[] = [
  {
    id: 1,
    type: 'Sent',
    timestamp: Date.now() - 60_000,
    address: 'GABCD…1234', // counter-party
    asset: {
      token: 'USDC',
      iconUrl: 'https://coin-images.coingecko.com/coins/images/6319/large/usdc.png',
      amount: 250,
    },
  },
  {
    id: 2,
    type: 'Received',
    timestamp: Date.now() - 50_000,
    address: 'GXYZ…9876',
    asset: {
      token: 'BTC',
      iconUrl: 'https://cryptologos.cc/logos/bitcoin-btc-logo.png',
      amount: 0.015,
    },
  },
  {
    id: 3,
    type: 'Swapped',
    timestamp: Date.now() - 40_000,
    sell: {
      token: 'ETH',
      iconUrl: 'https://token-icons.s3.amazonaws.com/eth.png',
      amount: 0.5,
    },
    buy: {
      token: 'USDC',
      iconUrl: 'https://coin-images.coingecko.com/coins/images/6319/large/usdc.png',
      amount: 1_500,
    },
  },
  {
    id: 4,
    type: 'Add Liquidity',
    timestamp: Date.now() - 30_000,
    lpToken: {
      token: 'UNI-ETH/USDC-LP',
      iconUrl: '/assets/icons/lp.svg',
      amount: 12.34,
    },
  },
  {
    id: 5,
    type: 'Remove Liquidity',
    timestamp: Date.now() - 20_000,
    lpToken: {
      token: 'UNI-ETH/USDC-LP',
      iconUrl: '/assets/icons/lp.svg',
      amount: 4.56,
    },
  },
  {
    id: 6,
    type: 'Stake',
    timestamp: Date.now() - 10_000,
    asset: {
      token: 'NORMAL',
      iconUrl: '/assets/icons/normal.svg',
      amount: 2_000,
    },
  },
  {
    id: 7,
    type: 'Unstake',
    timestamp: Date.now() - 5_000,
    asset: {
      token: 'NORMAL',
      iconUrl: '/assets/icons/normal.svg',
      amount: 500,
    },
  },
];
