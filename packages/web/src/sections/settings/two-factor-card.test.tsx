/**
 * @jest-environment jsdom
 */
import type { ComponentType } from 'react';

import { it, jest, expect, describe, beforeEach } from '@jest/globals';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

// The real export needs a passkey and Turnkey's iframe, so this stands in for the
// moment someone ticks "I've saved it". The browser run covers the real dialog.
const enroll = jest.fn<(args: unknown) => Promise<unknown>>();
const listFactors = jest.fn<() => Promise<unknown>>();
const unenroll = jest.fn<(args: unknown) => Promise<unknown>>();
const authedFetch = jest.fn<(url: string) => Promise<unknown>>();

jest.mock('@/locales', () => ({
  useTranslate: () => ({
    t: (s: string, vars?: { n: number }) => s.replace('{{n}}', String(vars?.n)),
  }),
}));
jest.mock('@/utils/authed-fetch', () => ({ authedFetch }));
jest.mock('@/providers/SupabaseAuthProvider', () => ({
  useSupabaseAuth: () => ({ supabase: { auth: { mfa: { enroll, listFactors, unenroll } } } }),
}));
jest.mock('@/components/template/snackbar', () => ({
  useSnackbar: () => ({ enqueueSnackbar: jest.fn() }),
}));
jest.mock('@/components/_common/brand', () => ({ BLOCK_SX: {}, MONO_FONT: 'monospace' }));
jest.mock('@/lib/auth/two-factor', () => ({
  TWO_FACTOR_ENABLED: true,
  twoFactorErrorMessage: () => 'Something went wrong. Please try again.',
}));
jest.mock('@/components/_common/wallet-export-dialog', () => ({
  __esModule: true,
  default: ({
    open,
    cancellable,
    onConfirmedBackup,
    onClose,
  }: {
    open: boolean;
    cancellable?: boolean;
    onConfirmedBackup: () => void;
    onClose: () => void;
  }) =>
    open ? (
      <div>
        <span>{cancellable ? 'can back out' : 'locked'}</span>
        <button
          type="button"
          onClick={() => {
            onConfirmedBackup();
            onClose();
          }}
        >
          Saved it
        </button>
        <button type="button" onClick={onClose}>
          Close without saving
        </button>
      </div>
    ) : null,
}));

const { TwoFactorCard } =
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('./two-factor-card') as { TwoFactorCard: ComponentType };

const walletsAnswer = (ids: string[]) =>
  authedFetch.mockResolvedValue({
    ok: true,
    json: async () => ({ wallets: ids.map((walletId) => ({ walletId })) }),
  });

const pressTurnOn = async () => {
  render(<TwoFactorCard />);
  fireEvent.click(await screen.findByRole('button', { name: 'Turn on' }));
};

describe('turning on 2FA starts with the recovery phrase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    listFactors.mockResolvedValue({ data: { totp: [], all: [] } });
    enroll.mockResolvedValue({
      data: { id: 'factor-1', totp: { qr_code: 'data:image/svg+xml,x', secret: 'ABC' } },
      error: null,
    });
  });

  it('only continues once the phrase is saved', async () => {
    walletsAnswer(['w1']);
    await pressTurnOn();

    const proceed = await screen.findByRole('button', { name: 'Continue' });
    expect((proceed as HTMLButtonElement).disabled).toBe(true);
    expect(enroll).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Export recovery phrase' }));
    fireEvent.click(screen.getByRole('button', { name: 'Saved it' }));

    await waitFor(() => expect((proceed as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(proceed);

    await screen.findByText(/Scan this QR code/);
    expect(enroll).toHaveBeenCalledTimes(1);
  });

  it('wants every wallet saved, because each has its own phrase', async () => {
    walletsAnswer(['w1', 'w2']);
    await pressTurnOn();

    const proceed = await screen.findByRole('button', { name: 'Continue' });
    fireEvent.click(screen.getByRole('button', { name: 'Export wallet 1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Saved it' }));

    await screen.findByRole('button', { name: 'Saved' });
    expect((proceed as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Export wallet 2' }));
    fireEvent.click(screen.getByRole('button', { name: 'Saved it' }));

    await waitFor(() => expect((proceed as HTMLButtonElement).disabled).toBe(false));
  });

  it('lets someone back out, and counts nothing as saved if they do', async () => {
    walletsAnswer(['w1']);
    await pressTurnOn();

    const proceed = await screen.findByRole('button', { name: 'Continue' });
    fireEvent.click(screen.getByRole('button', { name: 'Export recovery phrase' }));
    expect(screen.getByText('can back out')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Close without saving' }));

    expect((proceed as HTMLButtonElement).disabled).toBe(true);
    expect(enroll).not.toHaveBeenCalled();
  });

  it('skips the step for an account with no Normal wallet', async () => {
    walletsAnswer([]);
    await pressTurnOn();

    await screen.findByText(/Scan this QR code/);
    expect(enroll).toHaveBeenCalledTimes(1);
  });

  it('stops rather than skipping if the wallets cannot be read', async () => {
    authedFetch.mockResolvedValue({ ok: false });
    await pressTurnOn();

    await screen.findByText('Something went wrong. Please try again.');
    expect(enroll).not.toHaveBeenCalled();
  });
});
