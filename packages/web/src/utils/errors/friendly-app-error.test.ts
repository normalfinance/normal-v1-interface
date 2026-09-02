// Doc 90 Wave 1b: the one classifier every error surface funnels through.
import { friendlyAppError } from './error-classifier';

describe('friendlyAppError — technical text maps to friendly copy', () => {
  it('Turnkey credential machine text', () => {
    expect(
      friendlyAppError(
        new Error(
          'Turnkey error 16: credential ID could not be found in organization organizationId=abc credentialId=xyz'
        )
      )
    ).toMatch(/different account/);
  });
  it('Horizon result codes, including the previously unmapped tx_insufficient_balance', () => {
    expect(friendlyAppError('Transaction failed: tx_insufficient_balance')).toMatch(/XLM/);
    expect(friendlyAppError('tx_bad_seq op_underfunded')).toMatch(/mid-update/);
    expect(friendlyAppError(new Error('op_underfunded'))).toMatch(/Not enough balance/);
  });
  it('viem races and gas errors', () => {
    expect(friendlyAppError({ shortMessage: 'nonce too low' })).toMatch(/mid-update/);
    expect(friendlyAppError(new Error('insufficient funds for gas * price + value'))).toMatch(
      /network fee/
    );
  });
  it('on-chain reverts', () => {
    expect(friendlyAppError(new Error(`transaction reverted (0x${'a'.repeat(64)})`))).toMatch(
      /rejected on-chain/
    );
  });
  it('rate limits and timeouts', () => {
    expect(friendlyAppError('Too many requests')).toMatch(/wait a moment/);
    expect(friendlyAppError(new Error('The operation was aborted due to timeout'))).toMatch(
      /did not answer in time/
    );
  });
  it('passkey dismissal', () => {
    expect(friendlyAppError(new Error('NotAllowedError: operation not allowed'))).toMatch(
      /dismissed or timed out/
    );
  });
});

describe('friendlyAppError — dumps collapse, human text survives', () => {
  it('JSON diagnostic dumps collapse to the generic sentence', () => {
    expect(
      friendlyAppError(
        new Error('deposit_for_burn submit failed: {"_attributes":{"feeCharged":"123"}}')
      )
    ).toMatch(/try again in a moment/i);
  });
  it('key=value diagnostic dumps collapse', () => {
    expect(
      friendlyAppError(new Error('PSBT rejected bytes=1842 signWith=bc1qabcdef inputs=2'))
    ).toMatch(/try again in a moment/i);
  });
  it('internal config names collapse (env-var leak)', () => {
    expect(friendlyAppError(new Error('Ensure SOROSWAP_API_KEY is set on the server.'))).toMatch(
      /try again in a moment/i
    );
  });
  it('server stacks collapse', () => {
    expect(
      friendlyAppError(new Error('Server error\n    at POST (webpack-internal:///route.ts:57:20)'))
    ).toMatch(/try again in a moment/i);
  });
  it('our own hand-written copy passes through untouched', () => {
    const ours = 'Set up your SOL wallet first to receive the funds.';
    expect(friendlyAppError(new Error(ours))).toBe(ours);
    const anchor = 'MoneyGram: amount is less than the minimum limit of 15 USD';
    expect(friendlyAppError(new Error(anchor))).toBe(anchor);
  });
  it('empty and object-ish messages go generic', () => {
    expect(friendlyAppError(undefined)).toMatch(/try again/i);
    expect(friendlyAppError({})).toMatch(/try again/i);
  });
});
