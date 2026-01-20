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
