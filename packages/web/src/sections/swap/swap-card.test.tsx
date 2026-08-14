/**
 * @jest-environment jsdom
 */
// ---------------------------------------------------------------------------
// The external-wallet swap gate, pinned (T3).
//
// This gate is the only code in the project that was written, shipped,
// silently DELETED by a squash-merge (PR #466, July 2026), and rewritten a
// month later. These tests make that unrepeatable: if any refactor or merge
// drops the gate again, CI goes red on the PR that did it.
//
// Strategy: render the REAL SwapCard — the gate lives in the card, so a mock
// of the card would test nothing. The engines, stores and data hooks around
// it are mocked (they fetch quotes and talk to wallets), and the mocks CAPTURE
// the props the card passes them, because half the gate's job is invisible in
// the DOM: it must disable the engines' quote fetching for pairs the user
// cannot execute (`enabled: false`), not just grey out a button.
// ---------------------------------------------------------------------------
// The /jest-globals entry augments @jest/globals' expect (we import expect
// from there, not the ambient global — see 47-testing-plan.md).
import '@testing-library/jest-dom/jest-globals';

import { render, screen } from '@testing-library/react';
import { it, jest, expect, describe, beforeEach } from '@jest/globals';

import type * as SwapCardModule from './swap-card';

// Mutable per-test wallet state, read by the persist-store mock. `mock` prefix
// so the transform allows it inside factories regardless of hoisting.
const mockWalletState: { walletType: string | undefined; address: string | undefined } = {
  walletType: 'lobstr',
  address: 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
};

// Captured engine props — the invisible half of the gate's contract.
const mockEngineCalls: { soroswap: any[]; lifi: any[]; cctp: any[] } = {
  soroswap: [],
  lifi: [],
  cctp: [],
};

const mockToken = (symbol: string) => ({
  symbol,
  contract: `__${symbol.toLowerCase()}__`,
  name: symbol,
  issuer: '',
  org: '',
  domain: '',
  icon: '',
  decimals: 7,
  featured: false,
  balance: '10',
  price: '1',
  percentageChange: 0,
});

// Matches the SwapEngine contract in ./engines/types (toAmount: BigNumber|null).
const mockEngine = (name: string) => ({
  button: { label: `${name}-swap`, action: jest.fn(), loading: false, helper: null },
  toAmount: null,
  quoteLoading: false,
  quoteError: null,
  footer: null,
});

jest.mock('@/locales', () => ({ useTranslate: () => ({ t: (s: string) => s }) }));
jest.mock('@/hooks', () => ({ useStellarConfig: () => ({}) }));
jest.mock('@normalfinance/state', () => ({
  usePersistStore: () => ({ tokenState: { tokens: [] }, wallet: mockWalletState }),
}));
// #67: the card reads the shared savings position for the XLM outflow guard;
// these tests exercise the external-wallet gate, so "no savings" is fine.
jest.mock('@/hooks/use-savings-position', () => ({
  useSavingsPosition: () => ({ position: null }),
}));
jest.mock('@normalfinance/utils', () => ({
  getCryptoIconUrl: () => '',
  sanitizeAmountInput: (s: string) => s,
}));
jest.mock('@/utils/format-number', () => ({ fCurrency: (n: unknown) => String(n) }));
jest.mock('@/utils/token-selectors', () => ({
  getXlmToken: () => mockToken('XLM'),
  getSwapUsdcToken: () => mockToken('USDC'),
}));
jest.mock('@/hooks/use-btc-portfolio', () => ({
  useBtcPortfolio: () => ({
    btcToken: mockToken('BTC'),
    bitcoinAddress: 'bc1qtest',
    loading: false,
    refetch: async () => {},
  }),
}));
jest.mock('@/hooks/use-chain-portfolio', () => ({
  useEthPortfolio: () => ({
    ethToken: mockToken('ETH'),
    ethereumAddress: '0xtest',
    loading: false,
    refetch: async () => {},
  }),
  useSolPortfolio: () => ({
    solToken: mockToken('SOL'),
    solanaAddress: 'soltest',
    loading: false,
    refetch: async () => {},
  }),
}));
jest.mock('@/components/_common/pick-token', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/template/iconify', () => ({ Iconify: () => null }));
jest.mock('./cctp-resume-banner', () => ({ CctpRecoveryBanner: () => null }));
jest.mock('./engines/use-soroswap-engine', () => ({
  useSoroswapEngine: (props: unknown) => {
    mockEngineCalls.soroswap.push(props);
    return mockEngine('soroswap');
  },
}));
jest.mock('./engines/use-lifi-engine', () => ({
  useLifiEngine: (props: unknown) => {
    mockEngineCalls.lifi.push(props);
    return mockEngine('lifi');
  },
}));
jest.mock('./engines/use-cctp-engine', () => ({
  useCctpEngine: (props: unknown) => {
    mockEngineCalls.cctp.push(props);
    return mockEngine('cctp');
  },
}));

// Mock-then-require: this monorepo's jest transform does not reliably hoist
// jest.mock above ESM imports (see with-auth.test.ts), so the component is
// required only after every mock above is registered.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const SwapCard = require('./swap-card').default as typeof SwapCardModule.default;

const GATE_LABEL = 'Cross-chain swaps need your Normal wallet';
const lastCall = (calls: any[]) => calls[calls.length - 1];

describe('swap card — external-wallet gate (the twice-lost decision)', () => {
  beforeEach(() => {
    mockEngineCalls.soroswap.length = 0;
    mockEngineCalls.lifi.length = 0;
    mockEngineCalls.cctp.length = 0;
  });

  it('external wallet + BTC pair: the CTA is the disabled gate, not the engine', () => {
    mockWalletState.walletType = 'lobstr';
    render(<SwapCard initial="BTC" />);

    const cta = screen.getByRole('button', { name: GATE_LABEL });
    expect(cta).toBeDisabled();
    // The explanation a confused user actually needs:
    expect(screen.getByText(/Your connected wallet can only swap XLM/)).toBeInTheDocument();
    // And the engine's own button must NOT be reachable:
    expect(screen.queryByRole('button', { name: 'lifi-swap' })).not.toBeInTheDocument();
  });

  it('external wallet + BTC pair: quote fetching is switched OFF, not just the button', () => {
    mockWalletState.walletType = 'freighter';
    render(<SwapCard initial="BTC" />);

    // The invisible half of the gate: a hybrid user (external Stellar wallet
    // + Turnkey chain addresses) would otherwise burn LI.FI quota on quotes
    // the CTA can never execute.
    expect(lastCall(mockEngineCalls.lifi).enabled).toBe(false);
    expect(lastCall(mockEngineCalls.cctp).enabled).toBe(false);
  });

  it('external wallet + XLM↔USDC stays fully enabled — Stellar-only means Stellar WORKS', () => {
    mockWalletState.walletType = 'lobstr';
    render(<SwapCard initial="XLM" />);

    expect(screen.queryByText(GATE_LABEL)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'soroswap-swap' })).toBeEnabled();
    expect(lastCall(mockEngineCalls.soroswap).enabled).toBe(true);
  });

  it('Normal wallet sees no gate on cross-chain pairs', () => {
    mockWalletState.walletType = 'normal-wallet';
    render(<SwapCard initial="BTC" />);

    expect(screen.queryByText(GATE_LABEL)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'lifi-swap' })).toBeInTheDocument();
    expect(lastCall(mockEngineCalls.lifi).enabled).toBe(true);
  });

  it('signed in with NO wallet connected: no gate — the per-chain setup dialogs own that case', () => {
    mockWalletState.walletType = undefined;
    render(<SwapCard initial="BTC" />);

    expect(screen.queryByText(GATE_LABEL)).not.toBeInTheDocument();
    expect(lastCall(mockEngineCalls.lifi).enabled).toBe(true);
  });
});
