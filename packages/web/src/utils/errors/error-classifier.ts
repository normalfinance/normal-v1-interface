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
    'Not enough XLM to cover the network fee. Add a little XLM and try again.',
  tx_insufficient_fee: 'The network fee was too low. Try again.',
  tx_bad_seq: 'The network was mid-update. Try again: it usually works straight away.',
  tx_too_late: 'The transaction took too long and expired. Try again.',
  tx_too_early: 'The transaction was submitted too early. Try again.',
  tx_bad_auth: 'The transaction signature was not accepted. Try again.',
  tx_no_account: 'The sending account does not exist on the network.',
  tx_failed: 'The network rejected the transaction, so nothing was sent.',
  op_underfunded: 'Not enough balance to complete this transaction.',
  op_no_trust: 'A trustline is missing. Enable the asset first.',
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
  /\bLogs:|getLogs\(\)|Error processing Instruction|custom program error/i, // Solana node dumps
  // JavaScript and library internals: short, so they used to pass as human
  // ("Reached end of buffer unexpectedly", seen 2026-11-09).
  /cannot read propert|is not a function|is not defined|unexpected token|end of buffer|unexpected end of JSON/i,
];

/** Map any thrown thing to the one string a user should see. */
export function friendlyAppError(raw: unknown): string {
  const msg = String(
    (raw as { shortMessage?: string })?.shortMessage ??
      (raw as { message?: string })?.message ??
      raw ??
      ''
  ).trim();
  // Every error says what to do next (Niko 2026-11-09: "there should be a
  // solution for every error"), the fallback included.
  const generic =
    'That didn\u2019t go through. Try again in a moment. If it keeps happening, contact support.';
  if (!msg || msg === 'undefined' || msg === 'null' || msg === '[object Object]') return generic;

  // 1. Horizon/Soroban result codes anywhere in the text (most specific).
  const code = /\b(tx_[a-z_]+|op_[a-z_]+)\b/.exec(msg)?.[1];
  if (code && HORIZON_CODE_MESSAGES[code]) return HORIZON_CODE_MESSAGES[code];

  // 2. Passkey / Turnkey (context-rich variants live in friendlyTurnkeyError;
  //    these are the safe generics for funnels without that context).
  if (/CREDENTIAL_NOT_FOUND|credential ID could not be found/i.test(msg)) {
    return 'Your device signed with a passkey from a different account. Reload the page and try again.';
  }
  if (
    /NotAllowedError|operation (was )?not allowed|passkey confirmation did not complete/i.test(msg)
  ) {
    return 'The passkey prompt was dismissed or timed out. Try again and confirm with your fingerprint, face or PIN.';
  }
  if (/turnkey|organizationId=/i.test(msg)) {
    return 'The signing service rejected the request. Try again in a moment.';
  }
  // The exchange handed over a Bitcoin transaction we refuse to sign as it is
  // (lib/lifi/execute.ts, btc-sign.ts): nothing was signed or sent.
  if (/\bPSBT\b|witness_utxo|Refusing to sign/i.test(msg)) {
    return 'The exchange sent a Bitcoin transaction we could not sign safely. Nothing was sent. Try again in a moment.';
  }

  // 3. EVM/viem races and rejections.
  if (/nonce too low|replacement transaction underpriced|already known/i.test(msg)) {
    return 'The network was mid-update. Try again: it usually works straight away.';
  }
  if (/insufficient funds for gas|gas required exceeds|max fee per gas/i.test(msg)) {
    return 'Not enough left to pay the network fee. Try a slightly smaller amount.';
  }
  if (/user rejected|user denied|rejected the request/i.test(msg)) {
    return 'The request was declined in your wallet, so nothing was sent.';
  }
  if (/\breverted\b/i.test(msg)) {
    return 'The transaction was rejected on-chain, so nothing was delivered. You can try again.';
  }

  // 3b. Solana. Its node answers read almost like sentences ("Simulation
  //     failed. Message: Transaction simulation failed: Blockhash not found.
  //     Logs: []. Catch the SendTransactionError...") and are short, so they
  //     used to pass rule 5 as human text and reach the screen (live
  //     2026-11-09). Every one of these comes from the check Solana runs
  //     BEFORE it takes a transaction, so nothing was sent.
  if (/blockhash not found|block ?height exceeded/i.test(msg)) {
    return 'This waited too long and expired before it was sent, so nothing left your wallet. Try again.';
  }
  if (/insufficient funds for rent|InsufficientFundsForRent/i.test(msg)) {
    return 'This would leave less than Solana’s minimum balance (about 0.001 SOL) in your wallet. Try a slightly smaller amount.';
  }
  if (/insufficient lamports|InsufficientFundsForFee|no record of a prior credit/i.test(msg)) {
    return 'Not enough SOL left to pay the network fee. Try a slightly smaller amount.';
  }
  // Solana's own wording only: LI.FI's quote errors say "Step simulation
  // failed" and belong to the price, not to a send.
  if (/SendTransactionError|transaction simulation failed/i.test(msg)) {
    return 'The network turned this down before it was sent, so nothing left your wallet. Try again in a moment.';
  }

  // 3c. A piece of the page itself could not load: the server stopped, a new
  //     version was deployed while the page was open, or the connection
  //     dropped (live 2026-11-09: "Loading chunk ... failed. (error: http://
  //     ...)" reached the screen mid-swap). Before rule 4: Chrome's wording
  //     says "Failed to fetch", which is not this.
  if (
    /ChunkLoadError|Loading (CSS )?chunk \S+ failed|dynamically imported module|Importing a module script failed/i.test(
      msg
    )
  ) {
    return 'Part of this page could not load. Reload the page to carry on.';
  }

  // 4. Throttling and connectivity.
  if (/rate ?limit|429|too many requests/i.test(msg)) {
    return 'Too many requests. Please wait a moment and try again.';
  }
  if (
    /timeout|timed out|aborted|failed to fetch|networkerror|econnrefused|fetch failed/i.test(msg)
  ) {
    return 'The network did not answer in time. Nothing is lost: try again in a moment.';
  }

  const technical = TECHNICAL_MARKERS.some((re) => re.test(msg));

  // 4b. A developer's terse note ("Failed to load accounts", "Could not add
  //     the trustline", "Invalid amount") says what broke but not what to do.
  //     Keep the what, add the way out.
  if (/^invalid amount\b/i.test(msg)) return 'Check the amount and try again.';
  const terse = /^(?:failed to|could not|couldn['’]t|unable to)\s+(.+?)[.!]?$/i.exec(msg);
  if (terse && !technical && terse[1].length <= 60 && !/[.!?]/.test(terse[1])) {
    return `Couldn’t ${terse[1].charAt(0).toLowerCase()}${terse[1].slice(1)}. Try again in a moment.`;
  }

  // 5. Text written for people passes through: a sentence (it ends like one)
  //    or a full line from a partner ("MoneyGram: amount is less than the
  //    minimum limit of 15 USD"). A short fragment with no full stop is a
  //    library's or a developer's note (live 2026-11-09: "Reached end of
  //    buffer unexpectedly", "Loading chunk ... failed"), so it gets the
  //    generic sentence, which says what to do.
  const sentence = /[.!?)]$/.test(msg) || msg.split(/\s+/).length >= 7;
  if (msg.length <= 200 && !technical && sentence) return msg;
  return generic;
}
