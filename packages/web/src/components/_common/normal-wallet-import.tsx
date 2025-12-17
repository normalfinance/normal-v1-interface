'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslate } from '@/locales';
import { logger, format } from '@normalfinance/utils';
import {
  validateMnemonic,
  validatePrivateKey,
  normalizeMnemonic,
  createKeypairFromSecret,
  createWalletFromMnemonic,
} from '@normalfinance/utils';
import { decryptMnemonic } from '@normalfinance/utils';
import { useNormalWallet } from '@/hooks/stellar/use-normal-wallet';
import { getLinkedWallets, type LinkedWallet } from '@/services/linked-wallets';
import { useSupabaseAuth } from '@/providers/SupabaseAuthProvider';
import { supabase } from '@/lib/createSupabaseClient';
import { useSnackbar } from '@/components/template/snackbar';

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
  Paper,
  Skeleton,
  Chip,
} from '@mui/material';

import { Iconify } from '@/components/template/iconify';

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
    async (walletAddress: string) => {
      if (!session?.user?.id || !session?.user?.email) {
        return;
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
          throw new Error('Could not load stored phrase');
        }

        const { encryptedMnemonic, encryptionIV, encryptionSalt } = await response.json();

        const userIdentifier = `${session.user.id}:${session.user.email}`;
        const decrypted = await decryptMnemonic(
          { encryptedMnemonic, iv: encryptionIV, salt: encryptionSalt },
          userIdentifier
        );

        setMnemonic(decrypted);
        setImportType('mnemonic');
        setAutoFilledMnemonic(true);
        enqueueSnackbar(t('Recovery phrase loaded from secure storage'), { variant: 'success' });
      } catch (err: any) {
        logger.warn('[NormalWalletImport] Failed to auto-fill mnemonic:', err);
        enqueueSnackbar(t('Could not load stored phrase. Enter manually.'), { variant: 'warning' });
      } finally {
        setIsLoadingMnemonic(false);
      }
    },
    [session, t]
  );

  const handleSelectWallet = async (wallet: LinkedWallet) => {
    setSelectedWallet(wallet);
    setStage('import');
    setError(null);
    setAutoFilledMnemonic(false);
    setMnemonic('');
    setPrivateKey('');

    if (wallet.custodyChoice === 'platform') {
      await autoFillMnemonic(wallet.walletAddress);
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
            'This key does not match the selected wallet. Please make sure you are using the correct recovery phrase or private key.'
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
          setMnemonicError(t('Invalid mnemonic phrase'));
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
            setMnemonicError(t('Invalid mnemonic phrase'));
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
              'Invalid private key. Please enter a valid Stellar private key (starts with "S" and is 56 characters long)'
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
            setPrivateKeyError(t('Invalid private key'));
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
      logger.error('Failed to import wallet:', err);
      setError(err.message || t('Failed to import wallet'));
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
        {t('Select a wallet linked to your account, or import a new wallet.')}
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
                      {wallet.walletName || t('Unnamed Wallet')}
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
        {t('Import New Wallet')}
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

      {autoFilledMnemonic && (
        <Alert severity="success" sx={{ mb: 1 }}>
          {t('Recovery phrase loaded from secure storage. Click "Reconnect Wallet".')}
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
            disabled={isImporting || isLoadingMnemonic}
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
          {isImporting
            ? t('Importing...')
            : selectedWallet
              ? t('Reconnect Wallet')
              : t('Import Wallet')}
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
            ? t('Your Linked Wallets')
            : selectedWallet
              ? t('Reconnect Wallet')
              : t('Import Existing Normal Wallet')}
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
