import type { Transaction } from '@stellar/stellar-sdk';

import { buildLinkChallenge } from '@/lib/stellar/wallet-proof';
import { it, jest, expect, describe, beforeEach } from '@jest/globals';
import { Keypair, Networks, TransactionBuilder } from '@stellar/stellar-sdk';

// Mocks first, then require (repo convention): the real chain pulls
// @supabase/supabase-js → jose, which is ESM-only and unparseable to jest.
const getAuthenticatedUser = jest.fn<() => Promise<object | null>>();
const findTurnkeyWallet =
  jest.fn<(args: unknown) => Promise<{ stellarAddress: string | null } | null>>();
const getdel = jest.fn<(key: string) => Promise<unknown>>();
const linkWallet = jest.fn<(...args: unknown[]) => Promise<object>>();
const reserve = jest.fn<(id: string) => Promise<{ success: boolean; degraded?: boolean }>>();

jest.mock('@/utils/http', () => ({ getAccessToken: () => 'token' }));
jest.mock('@/lib/createSupabaseServerClient', () => ({ getAuthenticatedUser }));
jest.mock('@/utils/logger', () => ({
  logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));
jest.mock('@/lib/prisma', () => ({ prisma: { turnkeyWallet: { findUnique: findTurnkeyWallet } } }));
jest.mock('@/server/rateLimiter', () => ({ redis: { getdel } }));
jest.mock('@/server/faucet-rate-limiter', () => ({ faucetRateLimiter: { reserve } }));
jest.mock('@/lib/linked-wallet-service', () => ({ LinkedWalletService: { linkWallet } }));
jest.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }) }));
jest.mock('@/server/network-cookie', () => ({ networkFromCookie: () => 'mainnet' }));
jest.mock('@normalfinance/utils', () => ({
  getStellarConfigForNetwork: () => ({
    NETWORK_PASSPHRASE: 'Public Global Stellar Network ; September 2015',
  }),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { POST } = require('./route') as { POST: (req: never) => Promise<Response> };

const NORMAL_WALLET = Keypair.random().publicKey();
const external = Keypair.random();

const post = (body: unknown) =>
  POST(
    new Request('http://localhost/api/wallets/link', {
      method: 'POST',
      body: JSON.stringify(body),
    }) as never
  );

const signedChallenge = (signer: Keypair) => {
  const challenge = buildLinkChallenge(external.publicKey(), Networks.PUBLIC);
  const transaction = TransactionBuilder.fromXDR(challenge.xdr, Networks.PUBLIC) as Transaction;
  transaction.sign(signer);
  return { hash: challenge.hash, signedChallengeXdr: transaction.toXDR() };
};

describe('POST /api/wallets/link', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getAuthenticatedUser.mockResolvedValue({ id: 'user-1', factors: [] });
    findTurnkeyWallet.mockResolvedValue({ stellarAddress: NORMAL_WALLET });
    reserve.mockResolvedValue({ success: true });
    linkWallet.mockResolvedValue({ id: 'link-1', walletAddress: external.publicKey() });
  });

  it('links the user’s own Normal wallet without a signature: the server made it', async () => {
    const res = await post({ walletAddress: NORMAL_WALLET });

    expect(res.status).toBe(201);
    expect(getdel).not.toHaveBeenCalled();
  });

  it('refuses any other address without proof, the hole in the 2026-11-04 report', async () => {
    const res = await post({ walletAddress: external.publicKey() });

    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ code: 'ownership_proof_required' });
    expect(linkWallet).not.toHaveBeenCalled();
  });

  it('links an external wallet that signed its challenge', async () => {
    const { hash, signedChallengeXdr } = signedChallenge(external);
    getdel.mockResolvedValue({ hash });

    const res = await post({ walletAddress: external.publicKey(), signedChallengeXdr });

    expect(res.status).toBe(201);
    expect(getdel).toHaveBeenCalledWith(`wallet-link:challenge:user-1:${external.publicKey()}`);
    expect(linkWallet).toHaveBeenCalledWith('user-1', external.publicKey(), undefined);
  });

  it('refuses a challenge signed by someone else’s key', async () => {
    const { hash, signedChallengeXdr } = signedChallenge(Keypair.random());
    getdel.mockResolvedValue({ hash });

    const res = await post({ walletAddress: external.publicKey(), signedChallengeXdr });

    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ code: 'ownership_proof_invalid' });
    expect(linkWallet).not.toHaveBeenCalled();
  });

  it('refuses when the challenge expired or was already used', async () => {
    const { signedChallengeXdr } = signedChallenge(external);
    getdel.mockResolvedValue(null);

    const res = await post({ walletAddress: external.publicKey(), signedChallengeXdr });

    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ code: 'ownership_proof_expired' });
  });

  it('checks the proof before the daily limit, so a failed one costs no slot', async () => {
    reserve.mockResolvedValue({ success: false });
    process.env.FORCE_RATE_LIMIT = 'true';

    const res = await post({ walletAddress: external.publicKey() });

    delete process.env.FORCE_RATE_LIMIT;
    expect(res.status).toBe(403);
    expect(reserve).not.toHaveBeenCalled();
  });
});
