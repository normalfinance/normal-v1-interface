import posthog from 'posthog-js';

import type { AppError } from './error-types';
import { classifyError } from './error-classifier';

interface LogErrorOptions {
  context?: string;
  metadata?: Record<string, unknown>;
}

export function logError(error: unknown, options: LogErrorOptions = {}): AppError {
  const appError = classifyError(error);

  // Capture to PostHog
  try {
    posthog.capture('error_occurred', {
      error_category: appError.category,
      error_severity: appError.severity,
      error_message: appError.technicalMessage,
      user_message: appError.userMessage,
      context: options.context,
      ...options.metadata,
    });

    // Also capture as exception for error tracking
    if (appError.originalError) {
      posthog.captureException(appError.originalError, {
        tags: {
          category: appError.category,
          severity: appError.severity,
          context: options.context,
        },
      });
    }
  } catch {
    // PostHog might not be initialized in some contexts
  }

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error(`[${appError.category}] ${options.context || 'Error'}:`, error);
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
