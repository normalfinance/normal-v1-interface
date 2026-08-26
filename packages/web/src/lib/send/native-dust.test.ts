// Pins the live 2026-08-26 incident: MAX send of 347,445,350 lamports from a
// 347,450,359-lamport balance left 9 lamports -> InsufficientFundsForRent.
import {
  SOL_FEE_LAMPORTS,
  checkSolRemainder,
  solMaxSendLamports,
  lamportsToSolString,
  SOL_RENT_MIN_LAMPORTS,
} from './native-dust';

const BALANCE = 347450359n; // the real wallet balance from the incident

describe('solMaxSendLamports', () => {
  it('MAX leaves the account at exactly zero (allowed)', () => {
    const max = solMaxSendLamports(BALANCE);
    expect(max).toBe(347445359n);
    expect(BALANCE - max - SOL_FEE_LAMPORTS).toBe(0n);
    expect(checkSolRemainder(BALANCE, max)).toBe('ok');
  });
  it('never goes negative on tiny balances', () => {
    expect(solMaxSendLamports(4999n)).toBe(0n);
    expect(solMaxSendLamports(0n)).toBe(0n);
  });
});

describe('checkSolRemainder', () => {
  it('REGRESSION: the exact failed send classifies as rent-dust', () => {
    expect(checkSolRemainder(BALANCE, 347445350n)).toBe('rent-dust'); // left 9 lamports
  });
  it('amount + fee over balance is insufficient', () => {
    expect(checkSolRemainder(BALANCE, BALANCE)).toBe('insufficient');
  });
  it('boundary: leaving exactly the rent minimum is ok, one lamport less is dust', () => {
    const sendLeavingMin = BALANCE - SOL_FEE_LAMPORTS - SOL_RENT_MIN_LAMPORTS;
    expect(checkSolRemainder(BALANCE, sendLeavingMin)).toBe('ok');
    expect(checkSolRemainder(BALANCE, sendLeavingMin + 1n)).toBe('rent-dust');
  });
  it('a comfortable remainder is ok', () => {
    expect(checkSolRemainder(BALANCE, 100000000n)).toBe('ok');
  });
});

describe('lamportsToSolString', () => {
  it('renders full 9dp precision the incident math needs', () => {
    expect(lamportsToSolString(347445359n)).toBe('0.347445359');
  });
  it('trims trailing zeros and handles whole numbers', () => {
    expect(lamportsToSolString(100000000n)).toBe('0.1');
    expect(lamportsToSolString(2000000000n)).toBe('2');
    expect(lamportsToSolString(0n)).toBe('0');
  });
  it('round-trips through parseFloat exactly at 9dp', () => {
    expect(Math.round(parseFloat(lamportsToSolString(347445359n)) * 1e9)).toBe(347445359);
  });
});
