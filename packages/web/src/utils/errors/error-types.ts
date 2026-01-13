// Error category definitions
export enum ErrorCategory {
  NETWORK = 'NETWORK',
  BLOCKCHAIN = 'BLOCKCHAIN',
  VALIDATION = 'VALIDATION',
  AUTH = 'AUTH',
  RATE_LIMIT = 'RATE_LIMIT',
  UNKNOWN = 'UNKNOWN',
}

// Error severity for UI treatment
export enum ErrorSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
}

// Structured error type
export interface AppError {
  category: ErrorCategory;
  severity: ErrorSeverity;
  userMessage: string;
  technicalMessage?: string;
  originalError?: Error;
  metadata?: Record<string, unknown>;
}

// Category titles for display
export const CATEGORY_TITLES: Record<ErrorCategory, string> = {
  [ErrorCategory.NETWORK]: 'Connection Issue',
  [ErrorCategory.BLOCKCHAIN]: 'Transaction Error',
  [ErrorCategory.VALIDATION]: 'Invalid Input',
  [ErrorCategory.AUTH]: 'Authentication Required',
  [ErrorCategory.RATE_LIMIT]: 'Please Wait',
  [ErrorCategory.UNKNOWN]: 'Error',
};
