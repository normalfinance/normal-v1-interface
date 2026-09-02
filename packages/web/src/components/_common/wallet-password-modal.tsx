'use client';

import { useState } from 'react';
import { useTranslate } from '@/locales';

import {
  Box,
  Alert,
  Button,
  Dialog,
  TextField,
  IconButton,
  Typography,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  CircularProgress,
} from '@mui/material';

import { Iconify } from '@/components/template/iconify';

export type WalletPasswordMode = 'set' | 'enter' | 'migrate';

type WalletPasswordModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (password: string) => void;
  onForgotPassword?: () => void;
  mode: WalletPasswordMode;
  error?: string | null;
  loading?: boolean;
};

const TITLES: Record<WalletPasswordMode, string> = {
  set: 'Set Encryption Password',
  enter: 'Unlock Wallet',
  migrate: 'Upgrade Wallet Security',
};

const DESCRIPTIONS: Record<WalletPasswordMode, string> = {
  set: 'This password encrypts your wallet key locally. It is never sent to any server.',
  enter:
    'Enter your encryption password to unlock your wallet. This is the password you set when you first created or imported your wallet.',
  migrate:
    'We have upgraded wallet security. Set a password to encrypt your wallet key locally. This password is never sent to any server.',
};

const MIN_PASSWORD_LENGTH = 8;

export default function WalletPasswordModal({
  open,
  onClose,
  onSubmit,
  onForgotPassword,
  mode,
  error,
  loading,
}: WalletPasswordModalProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const { t } = useTranslate();

  const needsConfirm = mode === 'set' || mode === 'migrate';
  const displayError = error || localError;

  const handleSubmit = () => {
    setLocalError(null);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setLocalError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    if (needsConfirm && password !== confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }

    onSubmit(password);
  };

  const handleClose = () => {
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setLocalError(null);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      handleSubmit();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>{TITLES[mode]}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {DESCRIPTIONS[mode]}
        </Typography>

        {displayError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {displayError}
          </Alert>
        )}

        <TextField
          autoFocus
          fullWidth
          label="Password"
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setLocalError(null);
          }}
          onKeyDown={handleKeyDown}
          disabled={loading}
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                    <Iconify icon={showPassword ? 'solar:eye-bold' : 'solar:eye-closed-bold'} />
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
          sx={{ mb: 2 }}
        />

        {needsConfirm && (
          <TextField
            fullWidth
            label="Confirm Password"
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              setLocalError(null);
            }}
            onKeyDown={handleKeyDown}
            disabled={loading}
            sx={{ mb: 2 }}
          />
        )}

        {mode === 'enter' && onForgotPassword && (
          <Box sx={{ textAlign: 'right' }}>
            <Button size="small" onClick={onForgotPassword} disabled={loading}>
              {t('Forgot password?')}
            </Button>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          {t('Cancel')}
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading || password.length < MIN_PASSWORD_LENGTH}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {loading ? 'Processing...' : mode === 'enter' ? 'Unlock' : 'Set Password'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
