// Doc 129 Phase 3, end to end on Stellar TESTNET (opt-in: RUN_TESTNET_E2E=1).
//
// Runs the real server module (prepare → sign → commit → relay) against
// Circle's testnet contracts with a real 1 USDC burn: the CCTP spike's
// throwaway testnet account plays the person (signing raw ed25519 over the
// hashes, exactly as Turnkey does), a fresh friendbot account plays Normal's
// relayer, and an in-memory stand-in plays the database (the RelayedStep
// migration does not need to be applied for this). Off by default: the
// normal test run never touches the network.
//
//   RUN_TESTNET_E2E=1 npx jest src/server/relayed-steps.testnet.test.ts
import type * as RelayedStepsModule from '@/server/relayed-steps';

import { join } from 'path';
import { readFileSync } from 'fs';
import { it, jest, expect, describe } from '@jest/globals';

const RUN = process.env.RUN_TESTNET_E2E === '1';

// ---- an in-memory database, just enough for the module ------------------------

type Row = Record<string, any>;
const tables: Record<string, Row[]> = { cctpTransfer: [], turnkeyWallet: [], relayedStep: [] };

const matches = (row: Row, where: Row = {}): boolean =>
  Object.entries(where).every(([k, v]) => {
    if (k === 'OR') return (v as Row[]).some((w) => matches(row, w));
    const cell = row[k];
    if (v instanceof Date) return cell instanceof Date && cell.getTime() === v.getTime();
    if (v && typeof v === 'object' && 'in' in v) return (v.in as unknown[]).includes(cell);
    if (v && typeof v === 'object' && 'lt' in v) return cell < v.lt;
    if (v && typeof v === 'object' && 'gt' in v) return cell > v.gt;
    return cell === v;
  });

const apply = (row: Row, data: Row) => {
  for (const [k, v] of Object.entries(data)) {
    row[k] = v && typeof v === 'object' && 'increment' in v ? (row[k] ?? 0) + v.increment : v;
  }
  row.updatedAt = new Date();
};

let seq = 0;
const model = (name: string) => ({
  findUnique: async ({ where }: Row) => tables[name].find((r) => matches(r, where)) ?? null,
  findFirst: async ({ where }: Row) => tables[name].find((r) => matches(r, where)) ?? null,
  findMany: async ({ where, orderBy }: Row = {}) => {
    const rows = tables[name].filter((r) => matches(r, where));
    if (orderBy?.order) rows.sort((a, b) => a.order - b.order);
    return rows.map((r) => ({ ...r }));
  },
  create: async ({ data }: Row) => {
    const row = {
      id: `${name}-${(seq += 1)}`,
      status: 'AWAITING_SIGNATURE',
      attempts: 0,
      signedXdr: null,
      txHash: null,
      errorDetail: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data,
    };
    tables[name].push(row);
    return { ...row };
  },
  update: async ({ where, data }: Row) => {
    const row = tables[name].find((r) => matches(r, where))!;
    apply(row, data);
    return { ...row };
  },
  updateMany: async ({ where, data }: Row) => {
    const rows = tables[name].filter((r) => matches(r, where));
    rows.forEach((r) => apply(r, data));
    return { count: rows.length };
  },
  deleteMany: async ({ where }: Row) => {
    const before = tables[name].length;
    tables[name] = tables[name].filter((r) => !matches(r, where));
    return { count: before - tables[name].length };
  },
});

const fakePrisma: Row = {
  cctpTransfer: model('cctpTransfer'),
  turnkeyWallet: model('turnkeyWallet'),
  relayedStep: model('relayedStep'),
};
fakePrisma.$transaction = async (fn: (tx: Row) => Promise<unknown>) => fn(fakePrisma);

jest.mock('@/lib/prisma', () => ({ prisma: fakePrisma }));
jest.mock('@normalfinance/utils', () => ({
  constants: { StellarConfig: {} },
  getStellarConfigForNetwork: () => ({ RPC_URL: 'https://soroban-testnet.stellar.org' }),
}));

(RUN ? describe : describe.skip)('relayed permissions on testnet', () => {
  it('approve + burn, one signing pass, sent by the relayer, recorded on the transfer', async () => {
    const sdk = await import('@stellar/stellar-sdk');
    const spike = JSON.parse(
      readFileSync(join(process.cwd(), '..', '..', 'scripts', 'cctp-spike', 'state.json'), 'utf8')
    );
    const person = sdk.Keypair.fromSecret(spike.stellarSecret);
    const relayer = sdk.Keypair.random();
    const funded = await fetch(`https://friendbot.stellar.org?addr=${relayer.publicKey()}`);
    expect(funded.ok).toBe(true);
    process.env.CCTP_RELAYER_STELLAR_SECRET = relayer.secret();

    tables.turnkeyWallet.push({
      supabaseUid: 'u1',
      stellarAddress: person.publicKey(),
      ethereumAddress: spike.evmAddress,
    });
    tables.cctpTransfer.push({
      id: 't1',
      userId: 'u1',
      network: 'testnet',
      direction: 'stellar_to_crosschain',
      sourceDomain: 27,
      destDomain: 6,
      status: 'CREATED',
      burnTxHash: null,
      srcAddress: person.publicKey(),
      destAddress: spike.evmAddress.toLowerCase(),
      amountWire: '1000000', // 1 USDC
    });

    const { preparePermissionBurn, commitPermissionSignatures } =
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('@/server/relayed-steps') as typeof RelayedStepsModule;

    const prepared = await preparePermissionBurn('u1', 't1');
    if (!prepared.ok) throw new Error(prepared.error);
    expect(prepared.steps.map((s) => s.kind).at(-1)).toBe('burn');

    // One signing pass over every hash: what Turnkey's SIGN_RAW_PAYLOADS does.
    const signatures = prepared.steps.map((s) => ({
      id: s.id,
      signature: person.sign(Buffer.from(s.payloadHash, 'hex')).toString('hex'),
    }));
    const state = await commitPermissionSignatures('u1', 't1', signatures);
    if (!state.ok) throw new Error(state.error);
    console.log('[testnet e2e]', JSON.stringify(state));

    expect(state.failed).toBeNull();
    expect(state.done).toBe(true);
    expect(state.burnTxHash).toMatch(/^[0-9a-f]{64}$/);
    const transfer = tables.cctpTransfer.find((t) => t.id === 't1')!;
    expect(transfer.burnTxHash).toBe(state.burnTxHash);
    expect(transfer.status).toBe('BURN_SUBMITTED');
  }, 180_000);
});
