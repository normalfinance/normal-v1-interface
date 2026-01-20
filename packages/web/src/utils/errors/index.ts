// Error logging
export { logError, handleHookError } from './error-logger';
// Error types and interfaces
export { ErrorCategory, ErrorSeverity, CATEGORY_TITLES } from './error-types';

// Error display utilities
export { showError, getInlineError, showCriticalError } from './error-display';

// Error classification
export { classifyError, isErrorCategory, requiresUserAction } from './error-classifier';

export type { AppError } from './error-types';
