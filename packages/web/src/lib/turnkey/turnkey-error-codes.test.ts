// The live text was:
//   "Turnkey error 6: path already exists in wallet account
//    788f3142-7d87-4560-9cf8-ee44d849f089 (Details: [])"
// Misreading it as a failure left "Set up Ethereum wallet" unclickable-past
// forever, because the address it asked for already existed.

import { isPathAlreadyExistsError } from './turnkey-error-codes';

describe('isPathAlreadyExistsError', () => {
  it('recognises the live error text', () => {
    expect(
      isPathAlreadyExistsError(
        new Error(
          'Turnkey error 6: path already exists in wallet account 788f3142-7d87-4560-9cf8-ee44d849f089 (Details: [])'
        )
      )
    ).toBe(true);
  });

  it('recognises the bare code, in case the wording changes', () => {
    expect(isPathAlreadyExistsError(new Error('Turnkey error 6: something'))).toBe(true);
  });

  it('does NOT swallow other Turnkey failures', () => {
    // Adopting an address after one of these would be inventing a success.
    expect(isPathAlreadyExistsError(new Error('Turnkey error 16: credential not found'))).toBe(
      false
    );
    expect(isPathAlreadyExistsError(new Error('rate limit exceeded'))).toBe(false);
    expect(isPathAlreadyExistsError(new Error('NotAllowedError'))).toBe(false);
    expect(isPathAlreadyExistsError(undefined)).toBe(false);
  });
});
