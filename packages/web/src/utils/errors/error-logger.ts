import { logger } from '@/utils/logger';

import { classifyError } from './error-classifier';

import type { AppError } from './error-types';

interface LogErrorOptions {
  context?: string;
  metadata?: Record<string, unknown>;
}

export function logError(error: unknown, options: LogErrorOptions = {}): AppError {
  const appError = classifyError(error);

  if (process.env.NODE_ENV === 'development') {
    logger.error(`[${appError.category}] ${options.context || 'Error'}:`, error);
  }

  return appError;
}

// Convenience function for hook error handling
export function handleHookError(
  error: unknown,
  hookName: string,
  setError?: (error: AppError | null) => void
): AppError {
  const appError = logError(error, { context: hookName });
  setError?.(appError);
  return appError;
}
