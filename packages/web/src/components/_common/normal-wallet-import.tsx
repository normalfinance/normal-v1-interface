'use client';

import React, { useState } from 'react';
import { useTranslate } from '@/locales';
import { logger } from '@normalfinance/utils';
import { validateMnemonic, validatePrivateKey, normalizeMnemonic } from '@normalfinance/utils';
import { useNormalWallet } from '@/hooks/stellar/use-normal-wallet';

import {
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
  Stack,
  Typography,
  IconButton,
  Box,
  TextField,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
} from '@mui/material';

import { Iconify } from '@/components/template/iconify';

export type NormalWalletImportProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

type ImportType = 'mnemonic' | 'private-key';

export default function NormalWalletImport({ open, onClose, onSuccess }: NormalWalletImportProps) {
  const { t } = useTranslate();
  const { importWalletFromMnemonic, importWalletFromPrivateKey } = useNormalWallet();

  const [importType, setImportType] = useState<ImportType>('private-key');
  const [mnemonic, setMnemonic] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [mnemonicError, setMnemonicError] = useState('');
  const [privateKeyError, setPrivateKeyError] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImportTypeChange = (_event: React.SyntheticEvent, newValue: ImportType) => {
    setImportType(newValue);
    setMnemonic('');
    setPrivateKey('');
    setMnemonicError('');
    setPrivateKeyError('');
    setError(null);
  };

  const handleMnemonicChange = (value: string) => {
    setMnemonic(value);
    if (mnemonicError) {
      setMnemonicError('');
    }
    setError(null);
  };

  const handlePrivateKeyChange = (value: string) => {
    setPrivateKey(value);
    if (privateKeyError) {
      setPrivateKeyError('');
    }
    setError(null);
  };

  const handleImport = async () => {
    try {
      setIsImporting(true);
      setError(null);

      if (importType === 'mnemonic') {
        const normalized = normalizeMnemonic(mnemonic);
        if (!validateMnemonic(normalized)) {
          setMnemonicError(t('Invalid mnemonic phrase'));
          setIsImporting(false);
          return;
        }

        await importWalletFromMnemonic(normalized);
      } else {
        const trimmed = privateKey.trim();
        if (!validatePrivateKey(trimmed)) {
          setPrivateKeyError(
            t(
              'Invalid private key. Please enter a valid Stellar private key (starts with "S" and is 56 characters long)'
            )
          );
          setIsImporting(false);
          return;
        }

        await importWalletFromPrivateKey(trimmed);
      }

      // Reset form
      setMnemonic('');
      setPrivateKey('');
      setMnemonicError('');
      setPrivateKeyError('');
      setIsImporting(false);
      onSuccess();
    } catch (err: any) {
      logger.error('Failed to import wallet:', err);
      setError(err.message || t('Failed to import wallet'));
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setMnemonic('');
    setPrivateKey('');
    setMnemonicError('');
    setPrivateKeyError('');
    setError(null);
    setIsImporting(false);
    onClose();
  };

  const canImport =
    (importType === 'mnemonic' && mnemonic.trim().length > 0) ||
    (importType === 'private-key' && privateKey.trim().length > 0);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="sm"
      slotProps={{
        paper: {
          sx: {
            borderRadius: 2,
          },
        },
      }}
    >
      <DialogTitle sx={{ pb: 2, position: 'relative' }}>
        <Typography variant="h5" component="div">
          {t('Import Existing Normal Wallet')}
        </Typography>
        <IconButton
          aria-label="close"
          onClick={handleClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <Iconify icon="mingcute:close-line" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ py: 5 }}>
        <Stack spacing={3}>
          {error && <Alert severity="error">{error}</Alert>}

          <Tabs
            value={importType}
            onChange={handleImportTypeChange}
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab label={t('Private Key')} value="private-key" />
            <Tab label={t('Recovery Phrase')} value="mnemonic" />
          </Tabs>

          {importType === 'mnemonic' ? (
            <Stack spacing={2}>
              <Typography variant="body2" color="text.secondary">
                {t('Enter your recovery phrase (12 or 24 words)')}
              </Typography>
              <TextField
                multiline
                rows={4}
                fullWidth
                placeholder={t('Enter your recovery phrase...')}
                value={mnemonic}
                onChange={(e) => handleMnemonicChange(e.target.value)}
                error={!!mnemonicError}
                helperText={mnemonicError}
                disabled={isImporting}
              />
            </Stack>
          ) : (
            <Stack spacing={2}>
              <Typography variant="body2" color="text.secondary">
                {t('Enter your private key below to import your Stellar wallet.')}
              </Typography>
              <TextField
                multiline
                rows={4}
                fullWidth
                placeholder={t('Enter your Stellar private key (starts with S...)')}
                value={privateKey}
                onChange={(e) => handlePrivateKeyChange(e.target.value)}
                error={!!privateKeyError}
                helperText={
                  privateKeyError ||
                  t('Your private key should start with "S" and be 56 characters long.')
                }
                disabled={isImporting}
              />
            </Stack>
          )}

          <Stack direction="row" spacing={2}>
            <Button variant="outlined" fullWidth onClick={handleClose} disabled={isImporting}>
              {t('Cancel')}
            </Button>
            <Button
              variant="contained"
              fullWidth
              onClick={handleImport}
              disabled={!canImport || isImporting}
              startIcon={isImporting ? <CircularProgress size={16} /> : null}
            >
              {isImporting ? t('Importing...') : t('Import Wallet')}
            </Button>
          </Stack>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
