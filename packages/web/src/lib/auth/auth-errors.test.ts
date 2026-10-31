import { friendlyAuthError, isExistingAccountSignUp } from './auth-errors';

describe('friendlyAuthError', () => {
  it('offers sign-up after a failed login', () => {
    expect(friendlyAuthError('Invalid login credentials', 'x')).toEqual({
      message: "That email and password don't match.",
      nudge: 'signup',
    });
  });

  it('offers login when the email is taken', () => {
    expect(friendlyAuthError('User already registered', 'x').nudge).toBe('login');
  });

  it('sends an unconfirmed account to the code screen', () => {
    expect(friendlyAuthError('Email not confirmed', 'x').nudge).toBe('verify-email');
  });

  it('keeps messages it has no rule for, which are already specific', () => {
    expect(friendlyAuthError('Password should be at least 6 characters', 'x').message).toBe(
      'Password should be at least 6 characters'
    );
  });

  it('falls back when there is no message', () => {
    expect(friendlyAuthError(undefined, 'Try again')).toEqual({ message: 'Try again' });
  });
});

describe('isExistingAccountSignUp', () => {
  it('recognises the empty-identities answer', () => {
    expect(isExistingAccountSignUp({ user: { identities: [] } })).toBe(true);
  });

  it('accepts a real new user', () => {
    expect(isExistingAccountSignUp({ user: { identities: [{}] } })).toBe(false);
    expect(isExistingAccountSignUp({ user: null })).toBe(false);
  });
});
