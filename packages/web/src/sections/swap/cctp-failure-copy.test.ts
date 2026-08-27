import { classifyCctpFailure } from './cctp-failure-copy';

describe('classifyCctpFailure — messages already written for people survive', () => {
  it('does NOT re-map the fee shortfall (the live copy collision)', () => {
    // The reported bug: this sentence contains the word "network", and the
    // modal's old /network/ pattern replaced it with a connectivity message
    // telling the user to retry — which cannot succeed until they add ETH.
    expect(
      classifyCctpFailure(
        'Not enough ETH left to pay the network fee — try a slightly smaller amount.'
      )
    ).toBe('passthrough');
  });

  it('does not re-map our own network-fee wording from the LI.FI signer', () => {
    expect(
      classifyCctpFailure(
        'Could not determine a network fee for this swap — the network did not respond with a gas price. Nothing was signed; please try again.'
      )
    ).toBe('passthrough');
  });

  it('leaves the shared classifier’s own output alone', () => {
    expect(
      classifyCctpFailure(
        'The network did not answer in time — nothing is lost. Try again in a moment.'
      )
    ).toBe('passthrough');
    expect(
      classifyCctpFailure(
        'The passkey prompt was dismissed or timed out — try again and confirm with your fingerprint, face or PIN.'
      )
    ).toBe('passthrough');
    expect(classifyCctpFailure('Too many requests. Please wait a moment and try again.')).toBe(
      'passthrough'
    );
  });
});

describe('classifyCctpFailure — the one rule the modal keeps', () => {
  it('upgrades an on-chain rejection to the CCTP-specific advice', () => {
    // Worth upgrading: only here do we know the USDC is at the user's own
    // Base address and that bringing it back is an option.
    expect(classifyCctpFailure('execution reverted')).toBe('route-failed');
    expect(classifyCctpFailure('WrappedError: call failed')).toBe('route-failed');
    expect(
      classifyCctpFailure('The transaction was rejected on-chain — nothing was delivered.')
    ).toBe('route-failed');
  });

  it('treats no message as nothing to rewrite', () => {
    expect(classifyCctpFailure(null)).toBe('passthrough');
    expect(classifyCctpFailure('')).toBe('passthrough');
  });
});
