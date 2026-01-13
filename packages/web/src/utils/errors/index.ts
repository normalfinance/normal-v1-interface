// Error types and interfaces
export { ErrorCategory, ErrorSeverity, CATEGORY_TITLES } from './error-types';
export type { AppError } from './error-types';

// Error classification
export { classifyError, isErrorCategory, requiresUserAction } from './error-classifier';

// Error logging
export { logError, handleHookError } from './error-logger';

// Error display utilities
export { showError, showCriticalError, getInlineError } from './error-display';
