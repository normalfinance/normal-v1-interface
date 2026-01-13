import type { VariantType } from 'notistack';

import { enqueueSnackbar } from 'notistack';

import type { AppError } from './error-types';
import { ErrorSeverity } from './error-types';
import { logError } from './error-logger';

interface ShowErrorOptions {
  context?: string;
  showToast?: boolean;
  persist?: boolean;
}

// Map severity to notistack variant
function severityToVariant(severity: ErrorSeverity): VariantType {
  switch (severity) {
    case ErrorSeverity.INFO:
      return 'info';
    case ErrorSeverity.WARNING:
      return 'warning';
    case ErrorSeverity.ERROR:
      return 'error';
    default:
      return 'error';
  }
}

export function showError(error: unknown, options: ShowErrorOptions = {}): AppError {
  const { showToast = true, persist = false, context } = options;

  const appError = logError(error, { context });

  if (showToast) {
    enqueueSnackbar(appError.userMessage, {
      variant: severityToVariant(appError.severity),
      persist,
      autoHideDuration: persist ? undefined : 5000,
    });
  }

  return appError;
}

// For critical errors that should always show persistent toast
export function showCriticalError(error: unknown, context?: string): AppError {
  return showError(error, { context, showToast: true, persist: true });
}

// For inline errors that don't need toast (just logging)
export function getInlineError(error: unknown, context?: string): AppError {
  return logError(error, { context });
}
