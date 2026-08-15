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

import { render, screen, fireEvent } from '@testing-library/react';
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
// #32 chunk 4a: the card reads the companion Normal wallet from the shared
// balances hook — null = external user WITHOUT a companion (fully gated);
// set per-test to simulate a hybrid user whose swaps run for real.
const mockCompanion: { value: { address: string; assets: any[] } | null } = { value: null };
jest.mock('@/hooks/use-wallet-balances', () => ({
  useWalletBalances: () => ({ companionStellar: mockCompanion.value }),
}));
// #32 chunk 4b: the funding move's building blocks pull the stellar-sdk and
// wallet-kit module graphs, which this jsdom suite can't load — contract-
// faithful stubs (the tests only assert gating, not transfers).
jest.mock('@/lib/normal-wallet-setup', () => ({
  probeCompanion: async () => ({
    exists: true,
    hasUsdcTrustline: true,
    xlmBalance: 4,
    usdcBalance: 0,
  }),
}));
jest.mock('@/hooks/stellar/use-send-token', () => ({
  useSendToken: () => ({ send: async () => '' }),
}));
jest.mock('@normalfinance/utils', () => ({
  getCryptoIconUrl: () => '',
  sanitizeAmountInput: (s: string) => s,
  // display.ts builds its icon map with cdn() at module load (#32 4b).
  cdn: (p: string) => p,
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
// #32 chunk 3: the guided setup dialog renders a marker so the tests can
// assert the gate CTA opens IT — a dialog, never an engine.
jest.mock('@/components/_common/normal-wallet-setup-dialog', () => ({
  __esModule: true,
  default: ({ open }: { open: boolean }) =>
    open ? <div data-testid="normal-wallet-setup-dialog" /> : null,
}));
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

const GATE_LABEL = 'Continue with your Normal wallet';
const lastCall = (calls: any[]) => calls[calls.length - 1];

describe('swap card — external-wallet gate (the twice-lost decision)', () => {
  beforeEach(() => {
    mockEngineCalls.soroswap.length = 0;
    mockEngineCalls.lifi.length = 0;
    mockEngineCalls.cctp.length = 0;
    mockCompanion.value = null;
  });

  it('external wallet + BTC pair: the CTA opens the guided setup, never an engine (#32 chunk 3)', () => {
    mockWalletState.walletType = 'lobstr';
    render(<SwapCard initial="BTC" />);

    // The invariant survives the UX change: the gate CTA's action is a
    // DIALOG — the engines' own buttons stay unreachable.
    const cta = screen.getByRole('button', { name: GATE_LABEL });
    expect(screen.queryByTestId('normal-wallet-setup-dialog')).not.toBeInTheDocument();
    fireEvent.click(cta);
    expect(screen.getByTestId('normal-wallet-setup-dialog')).toBeInTheDocument();
    // The explanation a confused user actually needs:
    expect(
      screen.getByText(/Cross-chain swaps run through your Normal wallet/)
    ).toBeInTheDocument();
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

  it('#32 4a: external wallet WITH a companion — engines run for real, pinned to the companion', () => {
    mockWalletState.walletType = 'lobstr';
    mockCompanion.value = {
      address: 'GCOMPANIONNORMALWALLET',
      assets: [{ symbol: 'USDC', balance: '50', price: '1' }],
    };
    render(<SwapCard initial="BTC" />);

    // The setup gate is gone — the engines are live…
    expect(screen.queryByRole('button', { name: GATE_LABEL })).not.toBeInTheDocument();
    expect(lastCall(mockEngineCalls.lifi).enabled).toBe(true);
    // …and the CCTP engine's Stellar side is EXPLICITLY the companion, never
    // the connected external wallet (doc 72 §4h: no silent cross-wallet
    // fallback).
    expect(lastCall(mockEngineCalls.cctp).stellarAddressOverride).toBe('GCOMPANIONNORMALWALLET');
    expect(typeof lastCall(mockEngineCalls.cctp).onNeedsSetup).toBe('function');
  });

  it('#32 4a: a NORMAL-wallet user gets no override — the engine uses the connected wallet', () => {
    mockWalletState.walletType = 'normal-wallet';
    render(<SwapCard initial="BTC" />);

    expect(lastCall(mockEngineCalls.cctp).stellarAddressOverride).toBeUndefined();
    expect(lastCall(mockEngineCalls.cctp).onNeedsSetup).toBeUndefined();
  });
});
