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
  Chip,
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
import { useSnackbar } from '@/components/template/snackbar';

export type NormalWalletImportProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

type ImportStage = 'select' | 'import';
type ImportType = 'mnemonic' | 'private-key';

export default function NormalWalletImport({ open, onClose, onSuccess }: NormalWalletImportProps) {
  const { t } = useTranslate();
  const { enqueueSnackbar } = useSnackbar();
  const { importWalletFromMnemonic, importWalletFromPrivateKey } = useNormalWallet();
  const { session } = useSupabaseAuth();

  // Stage management
  const [stage, setStage] = useState<ImportStage>('select');

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
  const [autoFilledMnemonic, setAutoFilledMnemonic] = useState(false);
  const [isLoadingMnemonic, setIsLoadingMnemonic] = useState(false);

  // Fetch linked wallets when modal opens
  useEffect(() => {
    const fetchLinkedWallets = async () => {
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
  }, [open, session]);

  const autoFillMnemonic = useCallback(
    async (walletAddress: string): Promise<string | null> => {
      if (!session?.user?.id || !session?.user?.email) {
        return null;
      }

      setIsLoadingMnemonic(true);
      try {
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        };

        if (session?.access_token) {
          headers.Authorization = `Bearer ${session.access_token}`;
        }

        const response = await fetch(`/api/wallets/mnemonic/${walletAddress}`, {
          method: 'GET',
          headers,
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Could not load stored recovery phrase');
        }

        const { mnemonic: decryptedMnemonic } = await response.json();

        setMnemonic(decryptedMnemonic);
        setImportType('mnemonic');
        setAutoFilledMnemonic(true);
        return decryptedMnemonic;
      } catch (err: any) {
        logger.warn('[NormalWalletImport] Failed to auto-fill mnemonic:', err);
        enqueueSnackbar(t('Could not load stored recovery phrase. Enter manually.'), {
          variant: 'warning',
        });
        return null;
      } finally {
        setIsLoadingMnemonic(false);
      }
    },
    [session, enqueueSnackbar, t]
  );

  const handleSelectWallet = async (wallet: LinkedWallet) => {
    setSelectedWallet(wallet);
    setStage('import');
    setError(null);
    setAutoFilledMnemonic(false);
    setMnemonic('');
    setPrivateKey('');

    if (wallet.custodyChoice === 'platform') {
      const fetchedMnemonic = await autoFillMnemonic(wallet.walletAddress);
      if (fetchedMnemonic) {
        enqueueSnackbar(t('Recovery phrase loaded. Connecting automatically...'), {
          variant: 'success',
        });
        await handleAutoImport(fetchedMnemonic, wallet);
      }
    }
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

  const handleAutoImport = useCallback(
    async (mnemonicToImport: string, wallet: LinkedWallet) => {
      if (!mnemonicToImport || !wallet) {
        return;
      }

      try {
        setIsImporting(true);
        setError(null);

        const normalized = normalizeMnemonic(mnemonicToImport);
        if (!validateMnemonic(normalized)) {
          setMnemonicError(t('Invalid recovery phrase'));
          setIsImporting(false);
          return;
        }

        // Verify the key matches the selected wallet
        try {
          const walletData = createWalletFromMnemonic(normalized);
          if (walletData.publicKey !== wallet.walletAddress) {
            setError(
              t(
                'This key does not match the selected account. Please make sure you are using the correct recovery phrase or password.'
              )
            );
            setIsImporting(false);
            return;
          }
        } catch {
          setMnemonicError(t('Invalid mnemonic phrase'));
          setIsImporting(false);
          return;
        }

        await importWalletFromMnemonic(normalized, undefined, wallet.walletName ?? undefined);

        // Reset form
        resetForm();
        onSuccess();
      } catch (err: any) {
        logger.error('Failed to auto-import account:', err);
        setError(err.message || t('Failed to import account. Please try manually.'));
        setIsImporting(false);
      }
    },
    [importWalletFromMnemonic, t, onSuccess]
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
          selectedWallet?.walletName ?? undefined
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

        await importWalletFromPrivateKey(trimmed, selectedWallet?.walletName ?? undefined);
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
    setStage('select');
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
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="subtitle2" noWrap>
                      {wallet.walletName || t('Unnamed Account')}
                    </Typography>
                    {wallet.custodyChoice === 'platform' && (
                      <Chip label={t('Auto-Connect')} size="small" color="primary" />
                    )}
                  </Stack>
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
      {linkedWallets.length > 0 && (
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

      {autoFilledMnemonic && !isImporting && (
        <Alert severity="success" sx={{ mb: 1 }}>
          {t('Recovery phrase loaded from secure storage.')}
        </Alert>
      )}

      {error && <Alert severity="error">{error}</Alert>}

      {isLoadingMnemonic && (
        <Alert severity="info" sx={{ mb: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <CircularProgress size={16} />
            <Typography variant="body2">{t('Loading stored recovery phrase...')}</Typography>
          </Stack>
        </Alert>
      )}

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
            disabled={isImporting || isLoadingMnemonic}
          />
        </Stack>
      ) : (
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            {t('Enter your password (private key) below to import your account.')}
          </Typography>
          <TextField
            multiline
            rows={4}
            fullWidth
            placeholder={t('Enter your password (starts with S...)')}
            value={privateKey}
            onChange={(e) => handlePrivateKeyChange(e.target.value)}
            error={!!privateKeyError}
            helperText={
              privateKeyError || t('Your password should start with "S" and be 56 characters long.')
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
          {stage === 'select'
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
        {stage === 'select' ? renderWalletSelectStage() : renderImportStage()}
      </DialogContent>
    </Dialog>
  );
}
