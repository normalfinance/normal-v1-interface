import { it, expect, describe } from '@jest/globals';
import { KNOWN_MEMO_REQUIRED, knownMemoRequirement } from '@/lib/stellar/memo-required-list';

// INCIDENT (2026-08-06, finding #48): 5 XLM sent to this exact address with no
// memo. On-chain success; Coinbase credited nothing — the memo is what routes
// a deposit inside their pooled account. If this test ever fails, the guard
// that prevents a repeat has lost the address that caused it.
const COINBASE_INCIDENT_ADDRESS = 'GDS2WFLIJID6BDM64FGUD7MNOVZUEWHJ5VJPO2GQ32KOZCYIYIRIQTG6';

describe('knownMemoRequirement', () => {
  it('flags the exact address from the lost-deposit incident', () => {
    const req = knownMemoRequirement(COINBASE_INCIDENT_ADDRESS);

    expect(req).not.toBeNull();
    expect(req?.required).toBe(true);
    expect(req?.name).toBe('Coinbase');
  });

  it('tolerates whitespace and lowercase from a sloppy paste', () => {
    const req = knownMemoRequirement(`  ${COINBASE_INCIDENT_ADDRESS.toLowerCase()}  `);

    expect(req?.required).toBe(true);
  });

  it('returns null for an ordinary wallet address', () => {
    // A regular user account must never trip the exchange gate — the memo
    // stays optional for wallet-to-wallet sends.
    expect(
      knownMemoRequirement('GA5GD6PTY7QHT5LR5QCPOC6CAJF64KOEDQJBV6RHKJ3QPPCIJDOFZG7F')
    ).toBeNull();
  });

  it('seed list entries are well-formed Stellar account IDs', () => {
    for (const [address, name] of KNOWN_MEMO_REQUIRED) {
      expect(address).toMatch(/^G[A-Z2-7]{55}$/);
      expect(name.length).toBeGreaterThan(0);
    }
  });
});
