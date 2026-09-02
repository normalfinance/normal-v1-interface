import { ErrorCategory, ErrorSeverity } from './error-types';

import type { AppError } from './error-types';

// Pattern matching for error classification
interface ErrorPattern {
  pattern: RegExp;
  category: ErrorCategory;
  severity: ErrorSeverity;
  userMessage: string;
}

const ERROR_PATTERNS: ErrorPattern[] = [
  // Network errors
  {
    pattern: /fetch|network|timeout|ECONNREFUSED|net::ERR|Failed to fetch|NetworkError/i,
    category: ErrorCategory.NETWORK,
    severity: ErrorSeverity.ERROR,
    userMessage: 'Unable to connect. Please check your internet connection.',
  },
  // Rate limiting
  {
    pattern: /rate limit|429|too many requests/i,
    category: ErrorCategory.RATE_LIMIT,
    severity: ErrorSeverity.WARNING,
    userMessage: 'Too many requests. Please wait a moment and try again.',
  },
  // Wallet/Auth errors
  {
    pattern: /wallet|sign|unauthorized|authentication|not connected|connect.*wallet/i,
    category: ErrorCategory.AUTH,
    severity: ErrorSeverity.WARNING,
    userMessage: 'Please connect your wallet to continue.',
  },
  // Validation errors
  {
    pattern: /invalid|required|must be|cannot be|validation|minimum|maximum/i,
    category: ErrorCategory.VALIDATION,
    severity: ErrorSeverity.INFO,
    userMessage: 'Please check your input and try again.',
  },
  // Generic blockchain errors (catch-all for contract errors)
  {
    pattern: /soroban|stellar|contract|tx_failed|simulation|HostError/i,
    category: ErrorCategory.BLOCKCHAIN,
    severity: ErrorSeverity.ERROR,
    userMessage: 'Transaction failed. Please try again.',
  },
];

// Specific blockchain error messages - more precise mappings
const BLOCKCHAIN_ERROR_MESSAGES: Array<{ pattern: string; userMessage: string }> = [
  {
    pattern: 'HostError: Error(Contract, #1)',
    userMessage: 'Insufficient balance for this transaction.',
  },
  {
    pattern: 'HostError: Error(Contract, #2)',
    userMessage: 'Transaction amount exceeds available liquidity.',
  },
  {
    pattern: 'HostError: Error(Contract, #3)',
    userMessage: 'Price slippage exceeded. Please try again.',
  },
  {
    pattern: 'restore some contract state',
    userMessage: 'Contract state needs restoration. Processing...',
  },
  {
    pattern: 'insufficient funds',
    userMessage: 'Insufficient funds for this transaction.',
  },
  {
    pattern: 'trustline',
    userMessage: 'Asset trustline required. Please enable the asset first.',
  },
  {
    pattern: 'balance is not sufficient',
    userMessage: 'Your balance is not sufficient for this transaction.',
  },
  {
    pattern: 'slippage',
    userMessage: 'Price slippage exceeded. Please try again with higher tolerance.',
  },
];

export function classifyError(error: unknown): AppError {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const lowerMessage = errorMessage.toLowerCase();

  // Check for specific blockchain errors first (most precise)
  for (const { pattern, userMessage } of BLOCKCHAIN_ERROR_MESSAGES) {
    if (lowerMessage.includes(pattern.toLowerCase())) {
      return {
        category: ErrorCategory.BLOCKCHAIN,
        severity: ErrorSeverity.ERROR,
        userMessage,
        technicalMessage: errorMessage,
        originalError: error instanceof Error ? error : undefined,
      };
    }
  }

  // Pattern matching for category
  for (const { pattern, category, severity, userMessage } of ERROR_PATTERNS) {
    if (pattern.test(errorMessage)) {
      return {
        category,
        severity,
        userMessage,
        technicalMessage: errorMessage,
        originalError: error instanceof Error ? error : undefined,
      };
    }
  }

  // Default unknown error
  return {
    category: ErrorCategory.UNKNOWN,
    severity: ErrorSeverity.ERROR,
    userMessage: 'Something went wrong. Please try again.',
    technicalMessage: errorMessage,
    originalError: error instanceof Error ? error : undefined,
  };
}

// Helper to check if an error is of a specific category
export function isErrorCategory(error: AppError | null, category: ErrorCategory): boolean {
  return error?.category === category;
}

// Helper to check if error requires user action
export function requiresUserAction(error: AppError | null): boolean {
  if (!error) return false;
  return (
    error.category === ErrorCategory.AUTH ||
    error.category === ErrorCategory.VALIDATION ||
    error.category === ErrorCategory.RATE_LIMIT
  );
}

// ---------------------------------------------------------------------------
// friendlyAppError (doc 90 Wave 1b): THE one string every user-facing error
// surface renders. Rules, in order:
//   1. precise technical patterns map to specific friendly copy;
//   2. text that already reads as human (short, no dumps/ids/hashes) passes
//      through untouched — our own hand-written messages survive;
//   3. anything else (JSON dumps, stacks, XDR, key=value diagnostics)
//      collapses to a neutral sentence. The raw text stays in console/logs —
//      hidden from users, never from support.
// ---------------------------------------------------------------------------

// Horizon/Soroban result codes → copy. Kept here (self-contained, pure) —
// extends the transactions.utils maps with the codes they were missing.
const HORIZON_CODE_MESSAGES: Record<string, string> = {
  tx_insufficient_balance:
    'Not enough XLM to cover the network fee — add a little XLM and try again.',
  tx_insufficient_fee: 'The network fee was too low — try again.',
  tx_bad_seq: 'The network was mid-update — try again, it usually works immediately.',
  tx_too_late: 'The transaction took too long and expired — try again.',
  tx_too_early: 'The transaction was submitted too early — try again.',
  tx_bad_auth: 'The transaction signature was not accepted — try again.',
  tx_no_account: 'The sending account does not exist on the network.',
  tx_failed: 'The transaction was rejected by the network — nothing was sent.',
  op_underfunded: 'Not enough balance to complete this transaction.',
  op_no_trust: 'A trustline is missing — enable the asset first.',
  op_no_destination: 'The destination account does not exist on the Stellar network.',
  op_not_authorized: 'This asset is not authorized for the destination account.',
  op_line_full: 'The receiving account cannot hold any more of this asset.',
  op_low_reserve: 'The balance would fall below Stellar\u2019s minimum reserve.',
  op_no_issuer: 'The asset issuer account does not exist.',
};

const TECHNICAL_MARKERS = [
  /\{\s*"/, // JSON dumps
  /\bat\s+\w+.*\d+:\d+/, // stack frames
  /0x[0-9a-fA-F]{16,}/, // long hex (hashes, calldata)
  /[a-zA-Z_]+=[A-Za-z0-9_/+-]{6,}/, // key=value diagnostic dumps
  /[A-Z]{3,}_[A-Z_]{3,}/, // SCREAMING_SNAKE internals (env vars, enum codes)
  /webpack|node_modules|_attributes|xdr|ECONN|ERR_/i,
];

/** Map any thrown thing to the one string a user should see. */
export function friendlyAppError(raw: unknown): string {
  const msg = String(
    (raw as { shortMessage?: string })?.shortMessage ??
      (raw as { message?: string })?.message ??
      raw ??
      ''
  ).trim();
  const generic = 'That didn\u2019t go through. Please try again in a moment.';
  if (!msg || msg === 'undefined' || msg === 'null' || msg === '[object Object]') return generic;

  // 1. Horizon/Soroban result codes anywhere in the text (most specific).
  const code = /\b(tx_[a-z_]+|op_[a-z_]+)\b/.exec(msg)?.[1];
  if (code && HORIZON_CODE_MESSAGES[code]) return HORIZON_CODE_MESSAGES[code];

  // 2. Passkey / Turnkey (context-rich variants live in friendlyTurnkeyError;
  //    these are the safe generics for funnels without that context).
  if (/CREDENTIAL_NOT_FOUND|credential ID could not be found/i.test(msg)) {
    return 'Your device signed with a passkey from a different account — reload the page and try again.';
  }
  if (
    /NotAllowedError|operation (was )?not allowed|passkey confirmation did not complete/i.test(msg)
  ) {
    return 'The passkey prompt was dismissed or timed out — try again and confirm with your fingerprint, face or PIN.';
  }
  if (/turnkey|organizationId=/i.test(msg)) {
    return 'The signing service rejected the request — try again in a moment.';
  }

  // 3. EVM/viem races and rejections.
  if (/nonce too low|replacement transaction underpriced|already known/i.test(msg)) {
    return 'The network was mid-update — try again, it usually works immediately.';
  }
  if (/insufficient funds for gas|gas required exceeds|max fee per gas/i.test(msg)) {
    return 'Not enough left to pay the network fee — try a slightly smaller amount.';
  }
  if (/user rejected|user denied|rejected the request/i.test(msg)) {
    return 'The request was declined in your wallet — nothing was sent.';
  }
  if (/\breverted\b/i.test(msg)) {
    return 'The transaction was rejected on-chain — nothing was delivered. You can try again.';
  }

  // 4. Throttling and connectivity.
  if (/rate ?limit|429|too many requests/i.test(msg)) {
    return 'Too many requests. Please wait a moment and try again.';
  }
  if (
    /timeout|timed out|aborted|failed to fetch|networkerror|econnrefused|fetch failed/i.test(msg)
  ) {
    return 'The network did not answer in time — nothing is lost. Try again in a moment.';
  }

  // 5. Already-human text passes through; dumps collapse to the generic.
  if (msg.length <= 200 && !TECHNICAL_MARKERS.some((re) => re.test(msg))) return msg;
  return generic;
}
