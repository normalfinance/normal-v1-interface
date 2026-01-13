'use client';

import type { SxProps, Theme } from '@mui/material/styles';

import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Collapse from '@mui/material/Collapse';

import type { AppError } from '@/utils/errors';

import { CATEGORY_TITLES } from '@/utils/errors';

interface InlineErrorProps {
  error: AppError | null;
  onClose?: () => void;
  showTitle?: boolean;
  sx?: SxProps<Theme>;
}

export function InlineError({ error, onClose, showTitle = false, sx }: InlineErrorProps) {
  return (
    <Collapse in={!!error}>
      {error && (
        <Alert severity={error.severity} onClose={onClose} sx={{ mb: 2, ...sx }}>
          {showTitle && <AlertTitle>{CATEGORY_TITLES[error.category]}</AlertTitle>}
          {error.userMessage}
        </Alert>
      )}
    </Collapse>
  );
}
