import {
  usdOf,
  swapEngineOf,
  cctpFeePercent,
  buildCctpOpsRows,
  buildHoldingsRows,
  buildActivityV2Rows,
  buildWalletChainRows,
} from './activity-v2';

const PRICES = { BTC: 100_000, ETH: 2_500, SOL: 150, XLM: 0.2, USDC: 1 };
const D = new Date('2026-08-28T12:00:00.000Z');

describe('swapEngineOf — one table, two engines', () => {
  it('marks LI.FI rows by their synthetic token address', () => {
    expect(swapEngineOf('lifi:BTC')).toBe('lifi');
  });
  it('everything else is Soroswap', () => {
    expect(swapEngineOf('CDLZFC3SYJYDZT7K')).toBe('soroswap');
    expect(swapEngineOf(null)).toBe('soroswap');
  });
});

describe('usdOf — stamp once, never guess', () => {
  it('stables are 1:1', () => {
    expect(usdOf('USDC', 12.5, PRICES)).toBe(12.5);
  });
  it('converts by spot price', () => {
    expect(usdOf('XLM', 10, PRICES)).toBe(2);
  });
  it('an unknown price is 0, not an invented number', () => {
    expect(usdOf('DOGE', 100, PRICES)).toBe(0);
  });
});

describe('cctpFeePercent — a malformed quote is 0, never a guess', () => {
  it('reads a valid snapshot', () => {
    expect(cctpFeePercent(JSON.stringify({ feePercent: 0.005 }))).toBe(0.005);
  });
  it('rejects junk, absurd values and null', () => {
    expect(cctpFeePercent('not json')).toBe(0);
    expect(cctpFeePercent(JSON.stringify({ feePercent: 5 }))).toBe(0);
    expect(cctpFeePercent(null)).toBe(0);
  });
});

describe('buildActivityV2Rows', () => {
  it('labels a Soroswap and a LI.FI swap from the same table', () => {
    const rows = buildActivityV2Rows(
      {
        swaps: [
          {
            createdAt: D,
            walletAddress: 'G1',
            tokenInAddress: 'CDLZ',
            tokenInSymbol: 'XLM',
            tokenOutSymbol: 'USDC',
            amountIn: '10',
            feeAmount: '0.05',
            txHash: 'h1',
            network: 'mainnet',
          },
          {
            createdAt: D,
            walletAddress: 'G1',
            tokenInAddress: 'lifi:BTC',
            tokenInSymbol: 'BTC',
            tokenOutSymbol: 'ETH',
            amountIn: '0.01',
            feeAmount: null,
            txHash: 'h2',
            network: 'mainnet',
          },
        ],
        deposits: [],
        cctp: [],
        sends: [],
        ramps: [],
        mgi: [],
      },
      PRICES,
      'mainnet'
    );
    expect(rows[0]).toMatchObject({ product: 'soroswap', amount_usd: 2, fee_usd: 0.05 * 0.2 });
    expect(rows[1]).toMatchObject({ product: 'lifi', chain: 'bitcoin', amount_usd: 1000 });
  });

  it('a CCTP row carries its terminal status and fee from the quote snapshot', () => {
    const rows = buildActivityV2Rows(
      {
        swaps: [],
        deposits: [],
        cctp: [
          {
            createdAt: D,
            updatedAt: D,
            userId: 'u',
            direction: 'stellar_to_crosschain',
            status: 'COMPLETED',
            srcAsset: 'USDC',
            dstAsset: 'ETH',
            srcAmount: '20',
            srcAddress: 'G2',
            quoteJson: JSON.stringify({ feePercent: 0.005 }),
            errorDetail: null,
            network: 'mainnet',
          },
          {
            createdAt: D,
            updatedAt: D,
            userId: 'u',
            direction: 'crosschain_to_stellar',
            status: 'FAILED',
            srcAsset: 'ETH',
            dstAsset: 'USDC',
            srcAmount: '0.01',
            srcAddress: '0xabc',
            quoteJson: null,
            errorDetail: null,
            network: 'mainnet',
          },
        ],
        sends: [],
        ramps: [],
        mgi: [],
      },
      PRICES,
      'mainnet'
    );
    expect(rows[0]).toMatchObject({ product: 'cctp', status: 'completed', fee_usd: 0.1 });
    expect(rows[1]).toMatchObject({ status: 'failed', amount_usd: 25 });
  });

  it('savings, sends and ramps land with the right action labels', () => {
    const rows = buildActivityV2Rows(
      {
        swaps: [],
        deposits: [
          {
            createdAt: D,
            walletAddress: 'G3',
            type: 'withdraw',
            amount: '5',
            feeAmount: '0.02',
            txHash: 'h',
            network: 'mainnet',
          },
        ],
        cctp: [],
        sends: [
          {
            createdAt: D,
            walletAddress: '0xE',
            chain: 'ethereum',
            symbol: 'ETH',
            amount: '0.2',
            txHash: 'h',
            network: 'mainnet',
          },
        ],
        ramps: [
          {
            createdAt: D,
            walletAddress: '0xS',
            direction: 'onramp',
            provider: 'coinbase',
            asset: 'SOL',
            chain: 'solana',
            amountFinal: '2',
            amountExpected: null,
            status: 'arrived',
          },
        ],
        mgi: [
          { createdAt: D, walletAddress: 'G4', kind: 'deposit', status: 'completed', amount: '50' },
        ],
      },
      PRICES,
      'mainnet'
    );
    expect(rows.map((r) => [r.product, r.action])).toEqual([
      ['savings', 'withdraw'],
      ['send', 'send'],
      ['ramp', 'onramp'],
      ['ramp', 'onramp'],
    ]);
    expect(rows[2].amount_usd).toBe(300);
    expect(rows[3].provider).toBe('moneygram');
  });
});

describe('buildCctpOpsRows', () => {
  it('records duration for completed rows and the reverted tool from errorDetail', () => {
    const later = new Date(D.getTime() + 90_000);
    const rows = buildCctpOpsRows(
      [
        {
          createdAt: D,
          updatedAt: later,
          userId: 'u',
          direction: 'crosschain_to_stellar',
          status: 'COMPLETED',
          srcAsset: 'ETH',
          dstAsset: 'USDC',
          srcAmount: '0.01',
          srcAddress: '0x',
          quoteJson: null,
          errorDetail: null,
          network: 'mainnet',
        },
        {
          createdAt: D,
          updatedAt: later,
          userId: 'u',
          direction: 'stellar_to_crosschain',
          status: 'FAILED',
          srcAsset: 'USDC',
          dstAsset: 'ETH',
          srcAmount: '15',
          srcAddress: 'G',
          quoteJson: null,
          errorDetail:
            'Exchange route failed on Base via mayan through fly+jupiter (0xabc) — your USDC is still in your own account',
          network: 'mainnet',
        },
      ],
      PRICES
    );
    expect(rows[0]).toMatchObject({ direction: 'in', duration_seconds: 90 });
    expect(rows[1]).toMatchObject({
      direction: 'out',
      duration_seconds: null,
      revert_tool: 'mayan',
      revert_exchanges: 'fly+jupiter',
    });
  });
});

describe('buildWalletChainRows', () => {
  it('counts provisioned chains per day', () => {
    const rows = buildWalletChainRows(
      [
        {
          createdAt: D,
          bitcoinAddress: 'bc1',
          ethereumAddress: '0x1',
          solanaAddress: null,
          stellarAddress: 'G1',
        },
        {
          createdAt: D,
          bitcoinAddress: null,
          ethereumAddress: '0x2',
          solanaAddress: null,
          stellarAddress: 'G2',
        },
      ],
      'mainnet'
    );
    const eth = rows.find((r) => r.chain === 'ethereum');
    expect(eth?.wallets_added).toBe(2);
    expect(rows.find((r) => r.chain === 'bitcoin')?.wallets_added).toBe(1);
    expect(rows.find((r) => r.chain === 'solana')).toBeUndefined();
  });
});

describe('buildHoldingsRows', () => {
  it('values holdings at spot and appends savings TVL as its own row', () => {
    const rows = buildHoldingsRows(
      [
        { chain: 'bitcoin', asset: 'BTC', wallets: 3, total: 0.05 },
        { chain: 'stellar', asset: 'USDC', wallets: 10, total: 250 },
      ],
      14_621.52,
      PRICES,
      'mainnet',
      '2026-08-28T00:00:00.000Z'
    );
    expect(rows[0].usd_total).toBe(5000);
    expect(rows[1].usd_total).toBe(250);
    expect(rows[2]).toMatchObject({ asset: 'SAVINGS', usd_total: 14_621.52 });
  });
});
