'use client';

import { useTranslate } from '@/locales';
import React, { useState, useEffect, useCallback } from 'react';
import { useSupabaseAuth } from '@/providers/SupabaseAuthProvider';
import { useNormalWallet } from '@/hooks/stellar/use-normal-wallet';
import { getLinkedWallets, type LinkedWallet } from '@/services/linked-wallets';
import {
  logger,
  format,
  validateMnemonic,
  normalizeMnemonic,
  validatePrivateKey,
  createKeypairFromSecret,
  createWalletFromMnemonic,
} from '@normalfinance/utils';

import {
  Box,
  Tab,
  Tabs,
  Stack,
  Alert,
  Paper,
  Dialog,
  Button,
  Skeleton,
  TextField,
  Typography,
  IconButton,
  DialogTitle,
  DialogContent,
  CircularProgress,
} from '@mui/material';

import { Iconify } from '@/components/template/iconify';

export type NormalWalletImportProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  showLinkedWallets?: boolean;
  onBack?: () => void;
};

type ImportStage = 'select' | 'import';
type ImportType = 'mnemonic' | 'private-key';

export default function NormalWalletImport({
  open,
  onClose,
  onSuccess,
  showLinkedWallets = true,
  onBack,
}: NormalWalletImportProps) {
  const { t } = useTranslate();
  const { importWalletFromMnemonic, importWalletFromPrivateKey } = useNormalWallet();
  const { session } = useSupabaseAuth();

  // Stage management
  const [stage, setStage] = useState<ImportStage>(showLinkedWallets ? 'select' : 'import');

  // Linked wallets state
  const [linkedWallets, setLinkedWallets] = useState<LinkedWallet[]>([]);
  const [isLoadingWallets, setIsLoadingWallets] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<LinkedWallet | null>(null);

  // Import form state
  const [importType, setImportType] = useState<ImportType>('private-key');
  const [mnemonic, setMnemonic] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [mnemonicError, setMnemonicError] = useState('');
  const [privateKeyError, setPrivateKeyError] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch linked wallets when modal opens
  useEffect(() => {
    const fetchLinkedWallets = async () => {
      if (!showLinkedWallets) {
        setLinkedWallets([]);
        setStage('import');
        return;
      }

      if (!open || !session) {
        setLinkedWallets([]);
        return;
      }

      setIsLoadingWallets(true);
      try {
        const wallets = await getLinkedWallets();
        setLinkedWallets(wallets);

        // If no linked wallets, skip directly to import stage
        if (wallets.length === 0) {
          setStage('import');
        } else {
          setStage('select');
        }
      } catch (err) {
        logger.error('[NormalWalletImport] Failed to fetch linked wallets:', err);
        // If fetching fails, just show the import form
        setLinkedWallets([]);
        setStage('import');
      } finally {
        setIsLoadingWallets(false);
      }
    };

    fetchLinkedWallets();
  }, [open, session, showLinkedWallets]);

  const handleSelectWallet = (wallet: LinkedWallet) => {
    setSelectedWallet(wallet);
    setStage('import');
    setError(null);
    setMnemonic('');
    setPrivateKey('');
  };

  const handleImportNew = () => {
    setSelectedWallet(null);
    setStage('import');
    setError(null);
  };

  const handleBackToSelect = () => {
    setSelectedWallet(null);
    setStage('select');
    setMnemonic('');
    setPrivateKey('');
    setMnemonicError('');
    setPrivateKeyError('');
    setError(null);
  };

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

  /**
   * Verify that the entered key derives to the expected public key
   */
  const verifyKeyMatchesWallet = useCallback(
    (derivedPublicKey: string): boolean => {
      if (!selectedWallet) return true; // No verification needed for new wallets

      if (derivedPublicKey !== selectedWallet.walletAddress) {
        setError(
          t(
            'This key does not match the selected account. Please make sure you are using the correct recovery phrase or password.'
          )
        );
        return false;
      }
      return true;
    },
    [selectedWallet, t]
  );

  const handleImport = async () => {
    try {
      setIsImporting(true);
      setError(null);

      if (importType === 'mnemonic') {
        const normalized = normalizeMnemonic(mnemonic);
        if (!validateMnemonic(normalized)) {
          setMnemonicError(t('Invalid recovery phrase'));
          setIsImporting(false);
          return;
        }

        // If a wallet is selected, verify the key matches before importing
        if (selectedWallet) {
          try {
            const walletData = createWalletFromMnemonic(normalized);
            if (!verifyKeyMatchesWallet(walletData.publicKey)) {
              setIsImporting(false);
              return;
            }
          } catch {
            setMnemonicError(t('Invalid recovery phrase'));
            setIsImporting(false);
            return;
          }
        }

        await importWalletFromMnemonic(
          normalized,
          undefined,
          selectedWallet?.walletName ?? undefined,
          { persistLocally: true }
        );
      } else {
        const trimmed = privateKey.trim();
        if (!validatePrivateKey(trimmed)) {
          setPrivateKeyError(
            t(
              'Invalid password. Please enter a valid password (starts with "S" and is 56 characters long)'
            )
          );
          setIsImporting(false);
          return;
        }

        // If a wallet is selected, verify the key matches before importing
        if (selectedWallet) {
          try {
            const keypair = createKeypairFromSecret(trimmed);
            if (!verifyKeyMatchesWallet(keypair.publicKey())) {
              setIsImporting(false);
              return;
            }
          } catch {
            setPrivateKeyError(t('Invalid password'));
            setIsImporting(false);
            return;
          }
        }

        await importWalletFromPrivateKey(trimmed, selectedWallet?.walletName ?? undefined, {
          persistLocally: true,
        });
      }

      // Reset form
      resetForm();
      onSuccess();
    } catch (err: any) {
      logger.error('Failed to import account:', err);
      setError(err.message || t('Failed to import account'));
      setIsImporting(false);
    }
  };

  const resetForm = () => {
    setStage(showLinkedWallets ? 'select' : 'import');
    setSelectedWallet(null);
    setMnemonic('');
    setPrivateKey('');
    setMnemonicError('');
    setPrivateKeyError('');
    setError(null);
    setIsImporting(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const canImport =
    (importType === 'mnemonic' && mnemonic.trim().length > 0) ||
    (importType === 'private-key' && privateKey.trim().length > 0);

  const renderWalletSelectStage = () => (
    <Stack spacing={3}>
      {onBack && (
        <Box>
          <Button startIcon={<Iconify icon="mingcute:left-line" />} onClick={onBack} sx={{ mb: 1 }}>
            {t('Back')}
          </Button>
        </Box>
      )}
      <Typography variant="body2" color="text.secondary">
        {t('Select a linked account, or import a new one.')}
      </Typography>

      {isLoadingWallets ? (
        <Stack spacing={2}>
          <Skeleton variant="rounded" height={72} />
          <Skeleton variant="rounded" height={72} />
        </Stack>
      ) : (
        <Stack spacing={2}>
          {linkedWallets.map((wallet) => (
            <Paper
              key={wallet.id}
              variant="outlined"
              sx={{
                p: 2,
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor: 'action.hover',
                },
              }}
              onClick={() => handleSelectWallet(wallet)}
            >
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 1,
                    bgcolor: 'primary.lighter',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Iconify icon="solar:wallet-bold" width={24} sx={{ color: 'primary.main' }} />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="subtitle2" noWrap>
                    {wallet.walletName || t('Unnamed Account')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {format.fTruncate(wallet.walletAddress, 20)}
                  </Typography>
                </Box>
                <Iconify icon="mingcute:right-line" width={20} sx={{ color: 'text.secondary' }} />
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}

      <Button
        variant="outlined"
        fullWidth
        onClick={handleImportNew}
        startIcon={<Iconify icon="mingcute:add-line" />}
        disabled={isLoadingWallets}
      >
        {t('Import New Account')}
      </Button>
    </Stack>
  );

  const renderImportStage = () => (
    <Stack spacing={3}>
      {showLinkedWallets && linkedWallets.length > 0 && (
        <Box>
          <Button
            startIcon={<Iconify icon="mingcute:left-line" />}
            onClick={handleBackToSelect}
            sx={{ mb: 2 }}
          >
            {t('Back')}
          </Button>
        </Box>
      )}

      {selectedWallet && (
        <Alert severity="info" sx={{ mb: 1 }}>
          {t('Reconnecting to')}:{' '}
          <strong>
            {selectedWallet.walletName || format.fTruncate(selectedWallet.walletAddress, 16)}
          </strong>
        </Alert>
      )}

      {error && <Alert severity="error">{error}</Alert>}

      <Tabs
        value={importType}
        onChange={handleImportTypeChange}
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label={t('Password')} value="private-key" />
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
            {t('Enter your private key below to import your account.')}
          </Typography>
          <TextField
            multiline
            rows={4}
            fullWidth
            placeholder={t('Enter your password (starts with S...)')}
            value={privateKey}
            onChange={(e) => handlePrivateKeyChange(e.target.value)}
            error={!!privateKeyError}
            helperText={privateKeyError || t('Your private key should be 56 characters long.')}
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
          {isImporting
            ? t('Importing...')
            : selectedWallet
              ? t('Reconnect Account')
              : t('Import Account')}
        </Button>
      </Stack>
    </Stack>
  );

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
          {showLinkedWallets && stage === 'select'
            ? t('Your Linked Accounts')
            : selectedWallet
              ? t('Reconnect Account')
              : t('Import Existing Normal Account')}
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
        {showLinkedWallets && stage === 'select' ? renderWalletSelectStage() : renderImportStage()}
      </DialogContent>
    </Dialog>
  );
}
