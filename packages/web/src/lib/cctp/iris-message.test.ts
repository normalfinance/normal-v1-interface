// Doc 95 Wave 2: an Iris message must prove it belongs to THIS transfer before
// we mint it. The header decoder is what makes that check possible — if it
// drifts, we are back to trusting messages[0] blind (which mints the wrong
// message when a source tx carries two).
import { decodeMessageDomains } from './iris';

/** Build a CCTP message header: version | sourceDomain | destinationDomain. */
function header(version: number, source: number, dest: number, tailBytes = 32): string {
  const u32 = (n: number) => n.toString(16).padStart(8, '0');
  return `0x${u32(version)}${u32(source)}${u32(dest)}${'00'.repeat(tailBytes)}`;
}

describe('decodeMessageDomains', () => {
  it('reads source and destination domains from a v2 header', () => {
    // Stellar (domain 15) → Base (domain 6)
    expect(decodeMessageDomains(header(1, 15, 6))).toEqual({
      sourceDomain: 15,
      destinationDomain: 6,
    });
  });

  it('reads the reverse direction (Base → Stellar)', () => {
    expect(decodeMessageDomains(header(1, 6, 15))).toEqual({
      sourceDomain: 6,
      destinationDomain: 15,
    });
  });

  it('handles domain 0 (Ethereum) without treating it as missing', () => {
    expect(decodeMessageDomains(header(1, 0, 6))).toEqual({
      sourceDomain: 0,
      destinationDomain: 6,
    });
  });

  it('rejects anything that is not a 0x-prefixed hex message', () => {
    expect(decodeMessageDomains(undefined)).toBeNull();
    expect(decodeMessageDomains(null)).toBeNull();
    expect(decodeMessageDomains(123)).toBeNull();
    expect(decodeMessageDomains('deadbeef')).toBeNull(); // no 0x
    expect(decodeMessageDomains({ message: '0x00' })).toBeNull();
  });

  it('rejects a truncated header instead of guessing', () => {
    expect(decodeMessageDomains('0x0000000100000006')).toBeNull(); // only 8 bytes
    expect(decodeMessageDomains('0x')).toBeNull();
  });

  it('a mismatched destination is detectably different (the whole point)', () => {
    const ours = decodeMessageDomains(header(1, 15, 6));
    const someoneElses = decodeMessageDomains(header(1, 15, 0));
    expect(ours?.destinationDomain).not.toBe(someoneElses?.destinationDomain);
  });
});
