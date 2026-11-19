import type * as StellarSdk from '@stellar/stellar-sdk';
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

const { relayStateOf, firstTxRefusal, firstTxsRefusal, permissionBurnRefusal } =
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

describe('firstTxRefusal (doc 129 Phase 5: the XLM swap that goes first)', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const sdk = require('@stellar/stellar-sdk') as typeof StellarSdk;
  const person = sdk.Keypair.random();
  const other = sdk.Keypair.random();
  const sac = sdk.Asset.native().contractId(sdk.Networks.TESTNET);
  const call = () =>
    new sdk.Contract(sac).call(
      'transfer',
      new sdk.Address(person.publicKey()).toScVal(),
      new sdk.Address(other.publicKey()).toScVal(),
      sdk.nativeToScVal(1n, { type: 'i128' })
    );
  const build = (source = person, ops = [call()], signer: typeof person | null = person) => {
    const builder = new sdk.TransactionBuilder(new sdk.Account(source.publicKey(), '1'), {
      fee: '100',
      networkPassphrase: sdk.Networks.TESTNET,
    });
    ops.forEach((op) => builder.addOperation(op));
    const tx = builder.setTimeout(60).build();
    if (signer) tx.sign(signer);
    return tx;
  };
  const xlmTransfer = { srcAddress: person.publicKey(), srcAsset: 'XLM', srcSwapTxHash: null };

  it('accepts the person’s own signed Soroban call on an XLM transfer', () => {
    expect(firstTxRefusal(build(), xlmTransfer)).toBeNull();
  });

  it('refuses another wallet, a missing signature, or a transfer not from XLM', () => {
    expect(firstTxRefusal(build(other, [call()], other), xlmTransfer)?.status).toBe(403);
    expect(firstTxRefusal(build(person, [call()], null), xlmTransfer)?.status).toBe(400);
    expect(firstTxRefusal(build(person, [call()], other), xlmTransfer)?.status).toBe(400);
    expect(firstTxRefusal(build(), { ...xlmTransfer, srcAsset: 'USDC' })?.status).toBe(400);
  });

  it('refuses anything but one Soroban call (a classic payment, two calls)', () => {
    const pay = sdk.Operation.payment({
      destination: other.publicKey(),
      asset: sdk.Asset.native(),
      amount: '1',
    });
    expect(firstTxRefusal(build(person, [pay]), xlmTransfer)?.status).toBe(400);
    expect(firstTxRefusal(build(person, [call(), call()]), xlmTransfer)?.status).toBe(400);
  });

  it('a transfer keeps its first swap: a different one is refused, the same one is fine', () => {
    const tx = build();
    expect(firstTxRefusal(tx, { ...xlmTransfer, srcSwapTxHash: 'ab'.repeat(32) })?.status).toBe(
      409
    );
    expect(
      firstTxRefusal(tx, { ...xlmTransfer, srcSwapTxHash: tx.hash().toString('hex') })
    ).toBeNull();
  });
});

describe('firstTxsRefusal (doc 129 Phase 5b: a Savings withdrawal and its commission go first)', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const sdk = require('@stellar/stellar-sdk') as typeof StellarSdk;
  const person = sdk.Keypair.random();
  const feeAddress = sdk.Keypair.random().publicKey();
  const issuer = sdk.Keypair.random().publicKey();
  const usdc = new sdk.Asset('USDC', issuer);
  const vault = sdk.StrKey.encodeContract(Buffer.alloc(32, 5));
  const rules = { vault, feeAddress, usdc };
  const NOW = 1_800_000_000_000;
  const i128 = (v: bigint) => sdk.nativeToScVal(v, { type: 'i128' });
  const withdrawal = (minOut: bigint, seq = '10') => {
    const tx = new sdk.TransactionBuilder(new sdk.Account(person.publicKey(), seq), {
      fee: '100',
      networkPassphrase: sdk.Networks.PUBLIC,
    })
      .addOperation(
        new sdk.Contract(vault).call(
          'withdraw',
          i128(1_000n),
          sdk.xdr.ScVal.scvVec([i128(minOut)]),
          new sdk.Address(person.publicKey()).toScVal()
        )
      )
      .setTimeout(300)
      .build();
    tx.sign(person);
    return tx;
  };
  // 100.00 USDC guaranteed (7 decimals); the transfer moves 98.00 (6-decimal wire).
  const guaranteed = 1_000_000_000n;
  const savingsTransfer = {
    srcAddress: person.publicKey(),
    srcAsset: 'USDC',
    srcSwapTxHash: null,
    amountWire: '98000000',
  };
  const commissionTx = (
    over: Partial<{
      seq: string;
      to: string;
      asset: StellarSdk.Asset;
      amount: string;
      until: number;
    }> = {}
  ) => {
    const tx = new sdk.TransactionBuilder(new sdk.Account(person.publicKey(), over.seq ?? '11'), {
      fee: '100',
      networkPassphrase: sdk.Networks.PUBLIC,
      timebounds: { minTime: 0, maxTime: over.until ?? NOW / 1000 + 900 },
    })
      .addOperation(
        sdk.Operation.payment({
          destination: over.to ?? feeAddress,
          asset: over.asset ?? usdc,
          amount: over.amount ?? '1.5000000',
        })
      )
      .build();
    tx.sign(person);
    return tx;
  };

  it('accepts a withdrawal that guarantees the transfer plus its commission', () => {
    // 98.00 + 1.50 = 99.50 <= 100.00 guaranteed.
    expect(
      firstTxsRefusal([withdrawal(guaranteed), commissionTx()], savingsTransfer, rules, NOW)
    ).toBeNull();
    // No earnings, no commission: the withdrawal alone.
    expect(firstTxsRefusal([withdrawal(guaranteed)], savingsTransfer, rules, NOW)).toBeNull();
  });

  it('refuses a withdrawal that does not guarantee enough', () => {
    // 98.00 + 2.50 = 100.50 > 100.00.
    const short = firstTxsRefusal(
      [withdrawal(guaranteed), commissionTx({ amount: '2.5000000' })],
      savingsTransfer,
      rules,
      NOW
    );
    expect(short?.status).toBe(400);
    expect(firstTxsRefusal([withdrawal(970_000_000n)], savingsTransfer, rules, NOW)?.status).toBe(
      400
    );
  });

  it('refuses a commission that is not Normal’s, not USDC, not chained, or about to expire', () => {
    const w = withdrawal(guaranteed);
    const cases = [
      commissionTx({ to: sdk.Keypair.random().publicKey() }),
      commissionTx({ asset: sdk.Asset.native() }),
      commissionTx({ seq: '12' }),
      commissionTx({ until: NOW / 1000 + 30 }),
    ];
    for (const c of cases) {
      expect(firstTxsRefusal([w, c], savingsTransfer, rules, NOW)?.status).toBe(400);
    }
  });

  it('refuses anything that is not a withdrawal of this vault, or without Savings here', () => {
    const otherVault = { ...rules, vault: sdk.StrKey.encodeContract(Buffer.alloc(32, 6)) };
    expect(
      firstTxsRefusal([withdrawal(guaranteed)], savingsTransfer, otherVault, NOW)?.status
    ).toBe(400);
    expect(firstTxsRefusal([withdrawal(guaranteed)], savingsTransfer, null, NOW)?.status).toBe(400);
    expect(
      firstTxsRefusal(
        [withdrawal(guaranteed), commissionTx(), commissionTx({ seq: '12' })],
        savingsTransfer,
        rules,
        NOW
      )?.status
    ).toBe(400);
  });

  it('an XLM transfer never takes a withdrawal pair', () => {
    expect(
      firstTxsRefusal(
        [withdrawal(guaranteed), commissionTx()],
        { ...savingsTransfer, srcAsset: 'XLM' },
        rules,
        NOW
      )?.status
    ).toBe(400);
  });
});
