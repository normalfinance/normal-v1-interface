// Doc 129 Phase 3: which transfers may be sent as pre-signed permissions, and
// how the steps' state reads back to the page. The custody pins (the person's
// own Stellar account and own Base address, from the wallet row) are the
// rules that matter most here.
import type * as RelayedStepsModule from '@/server/relayed-steps';

import { it, jest, expect, describe } from '@jest/globals';

// Mock BEFORE require (repo convention): the module imports prisma and
// @normalfinance/utils (ESM jose that jest can't parse).
jest.mock('@/lib/prisma', () => ({ prisma: {} }));
jest.mock('@normalfinance/utils', () => ({ getStellarConfigForNetwork: () => ({}) }));

const { relayStateOf, permissionBurnRefusal } =
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@/server/relayed-steps') as typeof RelayedStepsModule;

const G = 'GB2YWVAJQ6IY3PSV6ZL44KZ2GVQDWYIPJVDP4MTFPB7FQWIE3WJ7CTJF';
const EVM = '0x8ba1f109551bD432803012645Ac136ddd64DBA72';
const wallet = { stellarAddress: G, ethereumAddress: EVM };
const transfer = {
  userId: 'u1',
  direction: 'stellar_to_crosschain',
  sourceDomain: 27,
  destDomain: 6,
  status: 'CREATED',
  burnTxHash: null as string | null,
  srcAddress: G,
  destAddress: EVM.toLowerCase(),
};

describe('permissionBurnRefusal', () => {
  it('allows an unsent outbound Circle transfer from the person’s own wallet to their own Base address', () => {
    expect(permissionBurnRefusal(transfer, 'u1', wallet)).toBeNull();
    expect(
      permissionBurnRefusal({ ...transfer, direction: 'stellar_to_index' }, 'u1', wallet)
    ).toBeNull();
  });

  it('refuses someone else’s transfer', () => {
    expect(permissionBurnRefusal(transfer, 'u2', wallet)?.status).toBe(404);
    expect(permissionBurnRefusal(null, 'u1', wallet)?.status).toBe(404);
  });

  it('refuses a transfer that does not start on Stellar or does not go to Base', () => {
    expect(
      permissionBurnRefusal({ ...transfer, direction: 'crosschain_to_stellar' }, 'u1', wallet)
        ?.status
    ).toBe(400);
    expect(permissionBurnRefusal({ ...transfer, destDomain: 0 }, 'u1', wallet)?.status).toBe(400);
  });

  it('refuses a transfer already sent', () => {
    expect(permissionBurnRefusal({ ...transfer, burnTxHash: 'ab' }, 'u1', wallet)?.status).toBe(
      409
    );
    expect(
      permissionBurnRefusal({ ...transfer, status: 'BURN_SUBMITTED' }, 'u1', wallet)?.status
    ).toBe(409);
  });

  it('refuses a Stellar account or a Base address that is not the person’s own', () => {
    const other = 'GASJBZXXQVDKJBSKRJOTOE5TPVTIE36QY46BPWI6P7SMOY5K74KLXVYV';
    expect(permissionBurnRefusal({ ...transfer, srcAddress: other }, 'u1', wallet)?.status).toBe(
      403
    );
    expect(
      permissionBurnRefusal({ ...transfer, destAddress: '0x' + '1'.repeat(40) }, 'u1', wallet)
        ?.status
    ).toBe(403);
    expect(permissionBurnRefusal(transfer, 'u1', null)?.status).toBe(403);
  });
});

describe('relayStateOf', () => {
  const step = (kind: string, status: string, txHash: string | null = null) => ({
    kind,
    status,
    txHash,
    errorDetail: null as string | null,
  });

  it('is done with both hashes once every step landed', () => {
    expect(relayStateOf([step('approve', 'DONE', 'a1'), step('burn', 'DONE', 'b1')])).toMatchObject(
      {
        done: true,
        approveTxHash: 'a1',
        burnTxHash: 'b1',
        failed: null,
        pendingBurnTxHash: null,
      }
    );
  });

  it('a burn sent and not confirmed keeps its hash, so nobody sends a second one', () => {
    expect(relayStateOf([step('burn', 'SUBMITTED', 'b1')])).toMatchObject({
      done: false,
      burnTxHash: null,
      pendingBurnTxHash: 'b1',
    });
  });

  it('a failed or expired step says the money did not move', () => {
    expect(relayStateOf([step('approve', 'DONE', 'a1'), step('burn', 'EXPIRED')]).failed).toMatch(
      /still in your wallet/
    );
  });

  it('nothing prepared is not done', () => {
    expect(relayStateOf([]).done).toBe(false);
  });
});
