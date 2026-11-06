/**
 * @jest-environment jsdom
 */
import type { ReactNode, ComponentType } from 'react';

import { it, jest, expect, describe, beforeEach } from '@jest/globals';
import { act, render, screen, waitFor, fireEvent } from '@testing-library/react';

const exchangeCodeForSession = jest.fn<(code: string) => Promise<unknown>>();
const getSession = jest.fn<() => Promise<unknown>>();
const replace = jest.fn<(href: string) => void>();
const signOut = jest.fn<() => Promise<void>>();
const unsubscribe = jest.fn();

let authListener: ((event: string) => void) | null = null;
const onAuthStateChange = jest.fn((listener: (event: string) => void) => {
  authListener = listener;
  return { data: { subscription: { unsubscribe } } };
});

jest.mock('@/services/auth', () => ({ exchangeCodeForSession }));
jest.mock('@/lib/createSupabaseClient', () => ({
  supabase: { auth: { getSession, onAuthStateChange } },
}));
jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => new URLSearchParams('code=abc&next=%2Fsavings'),
}));
jest.mock('@/locales', () => ({ useTranslate: () => ({ t: (s: string) => s }) }));
jest.mock('@/providers/SupabaseAuthProvider', () => ({ useSupabaseAuth: () => ({ signOut }) }));
jest.mock('@/components/template/snackbar', () => ({
  useSnackbar: () => ({ enqueueSnackbar: jest.fn() }),
}));
jest.mock('@/sections/auth/auth-shell', () => ({
  AuthShell: ({ children }: { children: ReactNode }) => (
    <div data-testid="login-frame">{children}</div>
  ),
}));
jest.mock('@/sections/auth/two-factor-challenge', () => ({
  TwoFactorChallenge: ({ onCancel }: { onCancel: () => void }) => (
    <div>
      <span>code screen</span>
      <button type="button" onClick={onCancel}>
        Cancel and log out
      </button>
    </div>
  ),
}));

const { default: AuthCallbackPage } =
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('./page') as { default: ComponentType };

const token = (aal: string) => `h.${Buffer.from(JSON.stringify({ aal })).toString('base64url')}.s`;
const withTwoFactor = {
  access_token: token('aal1'),
  user: { factors: [{ status: 'verified' }] },
};
const withoutTwoFactor = { access_token: token('aal1'), user: {} };

describe('coming back from Google or an email link', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authListener = null;
    signOut.mockResolvedValue();
  });

  it('goes straight in for an account without 2FA', async () => {
    exchangeCodeForSession.mockResolvedValue(withoutTwoFactor);

    render(<AuthCallbackPage />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/savings'));
    expect(screen.queryByText('code screen')).toBeNull();
  });

  it('asks for the code right here, and never says signed in first', async () => {
    exchangeCodeForSession.mockResolvedValue(withTwoFactor);

    render(<AuthCallbackPage />);

    await screen.findByText('code screen');
    expect(replace).not.toHaveBeenCalled();
    expect(screen.queryByText('Loading your account…')).toBeNull();
  });

  it('shows every step inside the login page frame, so nothing looks like a new page', async () => {
    exchangeCodeForSession.mockResolvedValue(withTwoFactor);

    render(<AuthCallbackPage />);

    expect(screen.getByTestId('login-frame').textContent).toContain('Completing sign-in');
    await screen.findByText('code screen');
    expect(screen.getByTestId('login-frame').textContent).toContain('code screen');
  });

  it('loads the app only once the code is in', async () => {
    exchangeCodeForSession.mockResolvedValue(withTwoFactor);
    render(<AuthCallbackPage />);
    await screen.findByText('code screen');

    await act(async () => authListener?.('MFA_CHALLENGE_VERIFIED'));

    await screen.findByText('Loading your account…');
    expect(replace).toHaveBeenCalledWith('/savings');
    expect(screen.queryByText('code screen')).toBeNull();
    expect(unsubscribe).toHaveBeenCalled();
  });

  it('ignores other auth events while waiting for the code', async () => {
    exchangeCodeForSession.mockResolvedValue(withTwoFactor);
    render(<AuthCallbackPage />);
    await screen.findByText('code screen');

    await act(async () => authListener?.('TOKEN_REFRESHED'));

    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByText('code screen')).toBeTruthy();
  });

  it('logs out on Cancel and keeps where they were going', async () => {
    exchangeCodeForSession.mockResolvedValue(withTwoFactor);
    render(<AuthCallbackPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Cancel and log out' }));

    await waitFor(() => expect(signOut).toHaveBeenCalled());
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/login?next=%2Fsavings'));
  });

  it('still asks after a reload, when the sign-in code is already spent', async () => {
    exchangeCodeForSession.mockRejectedValue(new Error('code already used'));
    getSession.mockResolvedValue({ data: { session: withTwoFactor } });

    render(<AuthCallbackPage />);

    await screen.findByText('code screen');
    expect(replace).not.toHaveBeenCalled();
  });

  it('shows the error when the exchange fails and nobody is signed in', async () => {
    exchangeCodeForSession.mockRejectedValue(new Error('Link expired'));
    getSession.mockResolvedValue({ data: { session: null } });

    render(<AuthCallbackPage />);

    await screen.findByText('Link expired');
    expect(screen.getByRole('button', { name: 'Back to log in' })).toBeTruthy();
  });
});
