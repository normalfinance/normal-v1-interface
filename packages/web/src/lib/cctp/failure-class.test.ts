// The contract under test: pivotRevertDetail() writes what parseFailedTool()
// reads. If the grammar drifts, bridge failover silently stops excluding the
// failed bridge — these tests pin the round-trip (QA R25 companion).
import {
  sanitizeTool,
  sanitizeTxHash,
  parseFailedTool,
  sanitizeToolList,
  pivotRevertDetail,
  parseFailedExchanges,
} from './failure-class';

const HASH = `0x${'ab'.repeat(32)}`;

describe('sanitizeTool', () => {
  it('accepts real LI.FI tool slugs', () => {
    expect(sanitizeTool('mayan')).toBe('mayan');
    expect(sanitizeTool('across-v3')).toBe('across-v3');
    expect(sanitizeTool('gas_zip')).toBe('gas_zip');
  });
  it('rejects injection-shaped and non-string input', () => {
    expect(sanitizeTool('mayan (0x00) via evil')).toBeNull();
    expect(sanitizeTool('')).toBeNull();
    expect(sanitizeTool(null)).toBeNull();
    expect(sanitizeTool(42)).toBeNull();
    expect(sanitizeTool({ tool: 'mayan' })).toBeNull();
  });
  it('rejects overlong slugs (bound: 32 chars)', () => {
    expect(sanitizeTool('a'.repeat(33))).toBeNull();
    expect(sanitizeTool('a'.repeat(32))).toBe('a'.repeat(32));
  });
});

describe('sanitizeTxHash', () => {
  it('accepts a 32-byte 0x hash and nothing else', () => {
    expect(sanitizeTxHash(HASH)).toBe(HASH);
    expect(sanitizeTxHash('0x1234')).toBeNull();
    expect(sanitizeTxHash('not-a-hash')).toBeNull();
    expect(sanitizeTxHash(undefined)).toBeNull();
  });
});

describe('pivotRevertDetail <-> parseFailedTool round-trip', () => {
  it('records tool + hash and parses the tool back out', () => {
    const detail = pivotRevertDetail('mayan', HASH);
    expect(detail).toContain('via mayan');
    expect(detail).toContain(HASH);
    expect(detail).toContain('USDC is still in your own account');
    expect(parseFailedTool(detail)).toBe('mayan');
  });
  it('tool-less detail parses to null (failover just quotes unfiltered)', () => {
    const detail = pivotRevertDetail(null, HASH);
    expect(detail).not.toContain(' via ');
    expect(parseFailedTool(detail)).toBeNull();
  });
  it('junk tool is DROPPED from the detail, never embedded', () => {
    const detail = pivotRevertDetail('bad tool!', HASH);
    expect(detail).not.toContain('bad tool!');
    expect(parseFailedTool(detail)).toBeNull();
  });
});

describe('parseFailedTool on foreign errorDetail copy', () => {
  it('returns null for empty/absent detail', () => {
    expect(parseFailedTool(null)).toBeNull();
    expect(parseFailedTool(undefined)).toBeNull();
    expect(parseFailedTool('')).toBeNull();
  });
  it('never false-matches other errorDetail sentences containing "via"', () => {
    expect(parseFailedTool('Refunded — USDC is returning to your Stellar wallet')).toBeNull();
    expect(parseFailedTool('delivered via LI.FI to your wallet')).toBeNull();
    expect(
      parseFailedTool('Cancelled before any transaction was sent — no funds moved')
    ).toBeNull();
  });
});

describe('exchange (DEX) step recording — 2026-08-26 forensic', () => {
  it('records swap-step tools and parses BOTH tool kinds back', () => {
    const detail = pivotRevertDetail('mayan', HASH, ['fly']);
    expect(detail).toContain('via mayan through fly');
    expect(parseFailedTool(detail)).toBe('mayan');
    expect(parseFailedExchanges(detail)).toEqual(['fly']);
  });
  it('multiple exchanges join with + and junk is filtered', () => {
    const detail = pivotRevertDetail('relay', HASH, ['fly', 'bad tool!', 'sushiswap']);
    expect(parseFailedExchanges(detail)).toEqual(['fly', 'sushiswap']);
  });
  it('no exchanges → no "through" segment, parse returns []', () => {
    const detail = pivotRevertDetail('mayan', HASH);
    expect(detail).not.toContain(' through ');
    expect(parseFailedExchanges(detail)).toEqual([]);
    expect(parseFailedExchanges(null)).toEqual([]);
  });
  it('sanitizeToolList bounds and filters', () => {
    expect(sanitizeToolList(['a', 'b', 'c', 'd', 'e'])).toEqual(['a', 'b', 'c', 'd']);
    expect(sanitizeToolList('fly')).toEqual([]);
    expect(sanitizeToolList([42, null, 'ok'])).toEqual(['ok']);
  });
});
