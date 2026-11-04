/**
 * @jest-environment jsdom
 */
import type { ComponentType } from 'react';

import fs from 'fs';
import path from 'path';
import { act, render, screen, waitFor, fireEvent } from '@testing-library/react';
import { it, jest, expect, describe, afterEach, beforeEach } from '@jest/globals';

import type * as ActionCodeModule from './action-code';

const getSession = jest.fn<() => Promise<unknown>>();
const listFactors = jest.fn<() => Promise<unknown>>();
const challengeAndVerify = jest.fn<(args: unknown) => Promise<{ error: Error | null }>>();

jest.mock('@/lib/createSupabaseClient', () => ({
  supabase: { auth: { getSession, mfa: { listFactors, challengeAndVerify } } },
}));
jest.mock('@/locales', () => ({ useTranslate: () => ({ t: (s: string) => s }) }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ replace: jest.fn() }) }));
jest.mock('@/providers/SupabaseAuthProvider', () => ({
  useSupabaseAuth: () => ({ signOut: jest.fn() }),
}));
jest.mock('@/components/template/snackbar', () => ({
  useSnackbar: () => ({ enqueueSnackbar: jest.fn() }),
}));
jest.mock('@/utils/authed-fetch', () => ({ authedFetch: jest.fn() }));
jest.mock('@/lib/auth/auth-routes', () => ({ loginHrefFrom: () => '/login' }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const gate = require('./action-code') as typeof ActionCodeModule;
const ActionCodeGate =
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  (require('@/components/_common/action-code-gate') as { default: ComponentType }).default;

const token = (claims: object) =>
  `h.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.s`;
const secondsAgo = (seconds: number) => Math.floor(Date.now() / 1000) - seconds;
const sessionWithCode = (seconds: number) => ({
  access_token: token({ aal: 'aal2', amr: [{ method: 'totp', timestamp: secondsAgo(seconds) }] }),
  user: { factors: [{ status: 'verified' }] },
});

const setSession = (session: unknown) => getSession.mockResolvedValue({ data: { session } });
const setFactors = (totp: { id: string }[]) =>
  listFactors.mockResolvedValue({ data: { totp }, error: null });

describe('confirmAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    challengeAndVerify.mockResolvedValue({ error: null });
  });

  afterEach(() => gate.registerActionCodePrompt(null));

  it('passes straight through with nobody logged in', async () => {
    setSession(null);
    const prompt = jest.fn<() => Promise<boolean>>();
    gate.registerActionCodePrompt(prompt);

    await expect(gate.confirmAction()).resolves.toBe(true);
    expect(prompt).not.toHaveBeenCalled();
  });

  it('never asks an account without 2FA', async () => {
    setSession({ access_token: token({ aal: 'aal1' }), user: {} });
    setFactors([]);
    const prompt = jest.fn<() => Promise<boolean>>();
    gate.registerActionCodePrompt(prompt);

    await expect(gate.confirmAction()).resolves.toBe(true);
    expect(prompt).not.toHaveBeenCalled();
  });

  it('asks an account with 2FA, and the answer decides', async () => {
    setSession(sessionWithCode(3600));
    setFactors([{ id: 'factor-1' }]);

    gate.registerActionCodePrompt(async () => true);
    await expect(gate.confirmAction()).resolves.toBe(true);

    gate.registerActionCodePrompt(async () => false);
    await expect(gate.confirmAction()).resolves.toBe(false);
  });

  it('keeps asking when Supabase cannot be reached and the session shows 2FA', async () => {
    setSession(sessionWithCode(3600));
    listFactors.mockResolvedValue({ data: null, error: new Error('down') });
    const prompt = jest.fn<() => Promise<boolean>>().mockResolvedValue(true);
    gate.registerActionCodePrompt(prompt);

    await gate.confirmAction();

    expect(prompt).toHaveBeenCalledTimes(1);
  });

  it('lets a code from seconds ago cover the rest of the same press', async () => {
    setSession(sessionWithCode(5));
    setFactors([{ id: 'factor-1' }]);
    const prompt = jest.fn<() => Promise<boolean>>();
    gate.registerActionCodePrompt(prompt);

    await expect(gate.confirmAction()).resolves.toBe(true);
    expect(prompt).not.toHaveBeenCalled();
  });

  it('stops if the screen is missing rather than letting the action through', async () => {
    setSession(sessionWithCode(3600));
    setFactors([{ id: 'factor-1' }]);

    await expect(gate.confirmAction()).resolves.toBe(false);
  });

  it('refuses a double click, so one press can never start two swaps', async () => {
    setSession({ access_token: token({ aal: 'aal1' }), user: {} });
    setFactors([]);

    const [first, second] = await Promise.all([gate.confirmAction(), gate.confirmAction()]);

    expect([first, second]).toEqual([true, false]);
    // And it recovers for the next real press.
    await expect(gate.confirmAction()).resolves.toBe(true);
  });
});

describe('usesSecondFactor', () => {
  it('reads the level from the token', async () => {
    setSession({ access_token: token({ aal: 'aal2' }) });
    await expect(gate.usesSecondFactor()).resolves.toBe(true);

    setSession({ access_token: token({ aal: 'aal1' }) });
    await expect(gate.usesSecondFactor()).resolves.toBe(false);

    setSession(null);
    await expect(gate.usesSecondFactor()).resolves.toBe(false);
  });
});

describe('the code screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    challengeAndVerify.mockResolvedValue({ error: null });
    setSession(sessionWithCode(3600));
    setFactors([{ id: 'factor-1' }]);
  });

  const openScreen = async () => {
    render(<ActionCodeGate />);
    let result: Promise<boolean> | undefined;
    await act(async () => {
      result = gate.confirmAction();
    });
    await screen.findByText('Confirm with your code');
    // Wrapped: an async function returning this promise would wait for the answer.
    return { answer: result as Promise<boolean> };
  };

  it('confirms the action once the right code is in', async () => {
    const { answer } = await openScreen();

    fireEvent.change(screen.getByLabelText('6-digit code'), { target: { value: '123456' } });

    await expect(answer).resolves.toBe(true);
    expect(challengeAndVerify).toHaveBeenCalledWith({ factorId: 'factor-1', code: '123456' });
    await waitFor(() => expect(screen.queryByText('Confirm with your code')).toBeNull());
  });

  it('stays open on a wrong code and moves nothing', async () => {
    challengeAndVerify.mockResolvedValue({
      error: Object.assign(new Error('bad'), { code: 'mfa_verification_failed' }),
    });
    const { answer } = await openScreen();

    fireEvent.change(screen.getByLabelText('6-digit code'), { target: { value: '000000' } });

    await screen.findByText(/That code isn't right/);
    expect(screen.getByText('Confirm with your code')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await expect(answer).resolves.toBe(false);
  });

  it('backs out cleanly on Cancel, without logging anyone out', async () => {
    const { answer } = await openScreen();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    await expect(answer).resolves.toBe(false);
    expect(screen.queryByRole('button', { name: 'Cancel and log out' })).toBeNull();
  });

  it('offers the lost-phone path here too', async () => {
    const { answer } = await openScreen();

    fireEvent.click(screen.getByRole('button', { name: 'Lost your phone?' }));

    await screen.findByLabelText('Recovery code');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await expect(answer).resolves.toBe(false);
  });
});

describe('every action asks', () => {
  // Source-level, like route-auth-conformance: importing these would drag in
  // the Stellar and wallet SDKs. A new money flow belongs on this list.
  const SRC = path.join(__dirname, '../..');
  const ACTIONS: Record<string, number> = {
    'hooks/stellar/use-send-token.ts': 1,
    'hooks/stellar/use-defindex-savings.tsx': 2,
    'components/_common/send-adapters/bitcoin.ts': 1,
    'components/_common/send-adapters/ethereum.ts': 1,
    'components/_common/send-adapters/solana.ts': 1,
    'sections/swap/engines/use-soroswap-engine.tsx': 1,
    'sections/swap/engines/use-lifi-engine.tsx': 1,
    'sections/swap/engines/use-cctp-engine.tsx': 1,
    'components/_common/wallet-export-dialog.tsx': 1,
    'lib/turnkey/autopilot-consent.ts': 1,
  };

  it.each(Object.entries(ACTIONS))('%s', (file, expected) => {
    const source = fs.readFileSync(path.join(SRC, file), 'utf-8');
    expect(source.match(/await confirmAction\(\)/g)).toHaveLength(expected);
  });
});
