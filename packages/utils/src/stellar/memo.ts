export type StellarMemoType = 'MEMO_ID' | 'MEMO_TEXT';

const UINT64_MAX = BigInt('18446744073709551615');

// digits only
const memoIdRegex = /^\d+$/;

export function detectMemoType(input: string): StellarMemoType {
  const trimmed = input.trim();

  // If it contains anything other than digits -> TEXT
  if (!memoIdRegex.test(trimmed)) {
    return 'MEMO_TEXT';
  }

  try {
    const value = BigInt(trimmed);

    // Check uint64 bounds
    if (value >= BigInt(0) && value <= UINT64_MAX) {
      return 'MEMO_ID';
    }

    return 'MEMO_TEXT';
  } catch {
    // BigInt failed (extremely large number)
    return 'MEMO_TEXT';
  }
}
