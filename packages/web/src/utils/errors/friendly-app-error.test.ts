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
  it('a Bitcoin transaction we refuse to sign reads as plain words, not PSBT', () => {
    for (const raw of [
      'Unrecognised PSBT encoding from LI.FI: expected hex or base64',
      'PSBT input 0 carries no witness_utxo. This wallet can only sign segwit',
      'Refusing to sign: the quote reports a zero amount',
    ]) {
      const out = friendlyAppError(new Error(raw));
      expect(out).toMatch(/could not sign safely/);
      expect(out).not.toMatch(/PSBT|witness_utxo/);
    }
  });
  it('Solana node answers read as plain words (live 2026-11-09, SOL to USDC)', () => {
    // The exact text the review page showed.
    const live =
      'Simulation failed. \nMessage: Transaction simulation failed: Blockhash not found. \nLogs: \n[]. \nCatch the `SendTransactionError` and call `getLogs()` on it for full details.';
    const out = friendlyAppError(new Error(live));
    expect(out).toMatch(/expired before it was sent, so nothing left your wallet/);
    expect(out).not.toMatch(/Blockhash|getLogs|SendTransactionError|Logs/);

    expect(
      friendlyAppError(
        new Error(
          'Simulation failed. \nMessage: Transaction simulation failed: Attempt to debit an account but found no record of a prior credit.. \nLogs: \n[]. \nCatch the `SendTransactionError` and call `getLogs()` on it for full details.'
        )
      )
    ).toMatch(/Not enough SOL/);
    expect(
      friendlyAppError(new Error('Transfer: insufficient lamports 1000, need 2039280'))
    ).toMatch(/Not enough SOL/);
    expect(
      friendlyAppError(
        new Error(
          'Transaction simulation failed: Transaction results in an account (1) with insufficient funds for rent'
        )
      )
    ).toMatch(/minimum balance/);
    expect(
      friendlyAppError(
        new Error(
          'Simulation failed. \nMessage: Transaction simulation failed: Error processing Instruction 2: custom program error: 0x1. \nLogs: \n["Program log: Error: insufficient funds"].'
        )
      )
    ).toMatch(/turned this down before it was sent/);
    expect(
      friendlyAppError(new Error('Signature 5abc has expired: block height exceeded.'))
    ).toMatch(/expired before it was sent/);
  });
  it('JavaScript and library internals collapse to the plain sentence', () => {
    for (const raw of [
      'Reached end of buffer unexpectedly',
      "Cannot read properties of undefined (reading 'tool')",
      'quote.estimate.toFixed is not a function',
      'Unexpected end of JSON input',
    ]) {
      expect(friendlyAppError(new Error(raw))).toMatch(/try again in a moment/i);
    }
  });
  it('a piece of the page that could not load says to reload (live 2026-11-09)', () => {
    for (const raw of [
      // The exact text the swap page showed.
      'Loading chunk _app-pages-browser_src_lib_lifi_gas-shortfall_ts failed. (error: http://localhost:8082/_next/static/chunks/_app-pages-browser_src_lib_lifi_gas-shortfall_ts.js)',
      'ChunkLoadError: Loading chunk 4521 failed.',
      'Loading CSS chunk 77 failed.',
      'Failed to fetch dynamically imported module: https://app.example/_next/static/chunks/abc.js',
      'error loading dynamically imported module',
      'Importing a module script failed.',
    ]) {
      expect(friendlyAppError(new Error(raw))).toBe(
        'Part of this page could not load. Reload the page to carry on.'
      );
    }
  });
  it('every error says what to do next (Niko 2026-11-09)', () => {
    // A developer's terse note keeps what broke and gains the way out.
    expect(friendlyAppError(new Error('Failed to load accounts'))).toBe(
      'Couldn’t load accounts. Try again in a moment.'
    );
    expect(friendlyAppError(new Error('Could not add the USDC trustline.'))).toBe(
      'Couldn’t add the USDC trustline. Try again in a moment.'
    );
    expect(friendlyAppError('Invalid amount')).toBe('Check the amount and try again.');
    // A short fragment that is not a sentence is somebody's internals.
    expect(friendlyAppError(new Error('Missing Ethereum address'))).toMatch(
      /Try again in a moment\. If it keeps happening, contact support\./
    );
    // Our own sentences, with their own way out, stay as written.
    const ours = 'Could not revoke. Try again.';
    expect(friendlyAppError(new Error(ours))).toBe(ours);
    const prepared = 'The deposit could not be prepared, so nothing moved. Try again in a moment.';
    expect(friendlyAppError(new Error(prepared))).toBe(prepared);
  });
  it('a LI.FI price error is not worded as a refused send', () => {
    const out = friendlyAppError(
      new Error(
        'None of the available routes could successfully generate a tx. Step simulation failed: instruction 7: {"Custom":17}'
      )
    );
    expect(out).not.toMatch(/before it was sent/);
  });
  it('empty and object-ish messages go generic', () => {
    expect(friendlyAppError(undefined)).toMatch(/try again/i);
    expect(friendlyAppError({})).toMatch(/try again/i);
  });
});
