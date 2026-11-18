import { it, expect, describe } from '@jest/globals';

import { bridgeName, readBridgeStatus } from './lifi-status';

describe('readBridgeStatus', () => {
  it('reads where the bridge has the money while it is pending', () => {
    expect(
      readBridgeStatus({ status: 'PENDING', substatus: 'WAIT_SOURCE_CONFIRMATIONS' }).phase
    ).toBe('source');
    expect(
      readBridgeStatus({ status: 'PENDING', substatus: 'WAIT_DESTINATION_TRANSACTION' }).phase
    ).toBe('sending');
    expect(readBridgeStatus({ status: 'PENDING', substatus: 'REFUND_IN_PROGRESS' }).phase).toBe(
      'refunding'
    );
    expect(readBridgeStatus({ status: 'PENDING', substatus: 'BRIDGE_NOT_AVAILABLE' }).phase).toBe(
      'waiting'
    );
  });

  it('delivered: the receiving transaction and the amount that arrived', () => {
    const p = readBridgeStatus({
      status: 'DONE',
      substatus: 'COMPLETED',
      receiving: {
        txHash: '0xabc',
        chainId: 1,
        amount: '170571000000000000',
        token: { decimals: 18 },
      },
    });
    expect(p).toEqual({
      phase: 'delivered',
      receivingTxHash: '0xabc',
      receivingChainId: 1,
      deliveredAmount: '0.170571',
    });
  });

  it('a refund (or a partial) is the same verdict the rest of the app uses', () => {
    expect(readBridgeStatus({ status: 'DONE', substatus: 'REFUNDED' }).phase).toBe('refunded');
    expect(readBridgeStatus({ status: 'DONE', substatus: 'PARTIAL' }).phase).toBe('refunded');
  });

  it('failed and invalid are failures; anything else is unknown, never a guess', () => {
    expect(readBridgeStatus({ status: 'FAILED' }).phase).toBe('failed');
    expect(readBridgeStatus({ status: 'INVALID' }).phase).toBe('failed');
    expect(readBridgeStatus({ status: 'NOT_FOUND' }).phase).toBe('unknown');
    expect(readBridgeStatus(undefined).phase).toBe('unknown');
    expect(readBridgeStatus('nonsense').phase).toBe('unknown');
  });

  it('an amount it cannot trust stays out', () => {
    const p = readBridgeStatus({
      status: 'DONE',
      substatus: 'COMPLETED',
      receiving: { amount: '1e18', token: { decimals: 18 } },
    });
    expect(p.deliveredAmount).toBeNull();
  });
});

describe('bridgeName', () => {
  it("prefers LI.FI's own display name", () => {
    expect(bridgeName({ tool: 'chainflip', toolDetails: { name: 'Chainflip' } })).toBe('Chainflip');
  });
  it('tidies a known key, capitalises an unknown one', () => {
    expect(bridgeName({ tool: 'relaydepository' })).toBe('Relay');
    expect(bridgeName({ tool: 'thorchain' })).toBe('THORChain');
    expect(bridgeName({ tool: 'newbridge' })).toBe('Newbridge');
  });
  it('says something sensible with nothing to go on', () => {
    expect(bridgeName(null)).toBe('The exchange');
  });
});
