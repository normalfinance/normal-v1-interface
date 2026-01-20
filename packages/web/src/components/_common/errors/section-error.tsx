'use client';

import type { SxProps, Theme } from '@mui/material/styles';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import type { AppError } from '@/utils/errors';

import { ErrorCategory } from '@/utils/errors';

interface SectionErrorProps {
  error: AppError;
  onRetry?: () => void;
  sx?: SxProps<Theme>;
}

export function SectionError({ error, onRetry, sx }: SectionErrorProps) {
  // Show retry for recoverable errors
  const showRetry =
    onRetry &&
    (error.category === ErrorCategory.NETWORK || error.category === ErrorCategory.BLOCKCHAIN);

  return (
    <Box
      sx={{
        p: 4,
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        ...sx,
      }}
    >
      <Alert severity={error.severity} sx={{ width: '100%', maxWidth: 400 }}>
        <Typography variant="body2">{error.userMessage}</Typography>
      </Alert>

      {showRetry && (
        <Button variant="outlined" onClick={onRetry} size="small">
          Try Again
        </Button>
      )}
    </Box>
  );
}
