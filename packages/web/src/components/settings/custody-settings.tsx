'use client';

import { useTranslate } from '@/locales';
import { useBoolean } from '@/hooks/use-boolean';
import React, { useState, useCallback } from 'react';
import { supabase } from '@/lib/createSupabaseClient';
import { useSupabaseAuth } from '@/providers/SupabaseAuthProvider';
import { logger, validateMnemonic, normalizeMnemonic } from '@normalfinance/utils';
import { updateWalletCustody, removePlatformCustody } from '@/services/linked-wallets';
import {
  generateAESKey,
  encryptWithAES,
  generateRSAKeyPair,
  exportAESKeyAsBase64,
  encryptWithRSAPublicKey,
  encryptPrivateKeyForStorage,
} from '@/lib/client-crypto';

import {
  Card,
  Stack,
  Alert,
  Button,
  Dialog,
  TextField,
  CardHeader,
  Typography,
  CardContent,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from '@mui/material';

import { useSnackbar } from '@/components/template/snackbar';

export interface CustodySettingsProps {
  walletAddress: string;
  walletName?: string | null;
  custodyChoice: 'self' | 'platform' | null;
  onUpdate?: () => void;
}

export function CustodySettings({
  walletAddress,
  walletName,
  custodyChoice,
  onUpdate,
}: CustodySettingsProps) {
  const { t } = useTranslate();
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useSupabaseAuth();
  const migrateToPlatformDialog = useBoolean();
  const migrateToSelfDialog = useBoolean();

  const [mnemonic, setMnemonic] = useState('');
  const [mnemonicError, setMnemonicError] = useState('');
  const [isMigrating, setIsMigrating] = useState(false);

  const handleMigrateToPlatform = useCallback(async () => {
    if (!user?.id || !user?.email) {
      enqueueSnackbar(t('User authentication required'), { variant: 'error' });
      return;
    }

    const normalized = normalizeMnemonic(mnemonic);
    if (!validateMnemonic(normalized)) {
      setMnemonicError(t('Invalid mnemonic phrase'));
      return;
    }

    setIsMigrating(true);
    setMnemonicError('');

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('Authentication required');
      }

      let rsaPublicKey: string;

      const rsaKeysCheckResponse = await fetch('/api/user/rsa-keys', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        credentials: 'include',
      });

      if (!rsaKeysCheckResponse.ok) {
        throw new Error('Failed to check RSA keys');
      }

      const rsaKeysData = await rsaKeysCheckResponse.json();

      if (!rsaKeysData.hasKeys) {
        const rsaKeyPair = await generateRSAKeyPair();

        const clientSecret = session.access_token.substring(0, 32);
        const encryptedPrivateKeyData = await encryptPrivateKeyForStorage(
          rsaKeyPair.privateKey,
          user.id,
          clientSecret
        );

        const storeRSAKeysResponse = await fetch('/api/user/rsa-keys', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          credentials: 'include',
          body: JSON.stringify({
            publicKey: rsaKeyPair.publicKey,
            encryptedPrivateKey: encryptedPrivateKeyData.encryptedPrivateKey,
            iv: encryptedPrivateKeyData.iv,
            salt: encryptedPrivateKeyData.salt,
          }),
        });

        if (!storeRSAKeysResponse.ok) {
          throw new Error('Failed to store RSA keys');
        }

        rsaPublicKey = rsaKeyPair.publicKey;
      } else {
        rsaPublicKey = rsaKeysData.publicKey;
      }

      const aesKey = await generateAESKey();
      const aesKeyBase64 = await exportAESKeyAsBase64(aesKey);
      const encryptedMnemonicData = await encryptWithAES(normalized, aesKey);
      const encryptedAESKey = await encryptWithRSAPublicKey(aesKeyBase64, rsaPublicKey);

      const encryptResponse = await fetch('/api/wallets/encrypt-mnemonic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          walletAddress,
          encryptedMnemonic: encryptedMnemonicData.ciphertext,
          encryptedAESKey,
          iv: encryptedMnemonicData.iv,
        }),
      });

      if (!encryptResponse.ok) {
        const error = await encryptResponse.json();
        throw new Error(error.error || 'Failed to encrypt mnemonic');
      }

      const { encryptedMnemonic, encryptionIV, encryptionSalt } = await encryptResponse.json();

      await updateWalletCustody(walletAddress, {
        custodyChoice: 'platform',
        encryptedMnemonic,
        encryptionIV,
        encryptionSalt,
        custodyConsentEmail: user.email,
      });

      enqueueSnackbar(t('Platform custody enabled successfully'), { variant: 'success' });
      migrateToPlatformDialog.onFalse();
      setMnemonic('');
      onUpdate?.();
    } catch (err: any) {
      logger.error('Failed to migrate to platform custody:', err);
      enqueueSnackbar(err.message || t('Failed to enable platform custody'), { variant: 'error' });
      setMnemonicError(err.message || t('Failed to enable platform custody'));
    } finally {
      setIsMigrating(false);
    }
  }, [mnemonic, user, walletAddress, migrateToPlatformDialog, enqueueSnackbar, t, onUpdate]);

  const handleMigrateToSelf = useCallback(async () => {
    setIsMigrating(true);

    try {
      await removePlatformCustody(walletAddress);
      enqueueSnackbar(t('Switched to self-custody. Encrypted phrase deleted.'), {
        variant: 'success',
      });
      migrateToSelfDialog.onFalse();
      onUpdate?.();
    } catch (err: any) {
      logger.error('Failed to migrate to self-custody:', err);
      enqueueSnackbar(err.message || t('Failed to switch to self-custody'), {
        variant: 'error',
      });
    } finally {
      setIsMigrating(false);
    }
  }, [walletAddress, migrateToSelfDialog, enqueueSnackbar, t, onUpdate]);

  return (
    <>
      <Card>
        <CardHeader title={t('Account Custody')} />
        <CardContent>
          <Stack spacing={3}>
            {custodyChoice === null && (
              <Alert severity="info">
                <Typography variant="body2" sx={{ mb: 2 }}>
                  {t('Your account was created before the custody feature was available.')}
                </Typography>
                <Button variant="contained" size="small" onClick={migrateToPlatformDialog.onTrue}>
                  {t('Upgrade to Platform Custody')}
                </Button>
              </Alert>
            )}

            {custodyChoice === 'self' && (
              <>
                <Alert severity="success">
                  <Typography variant="body2">
                    {t('Self-custody enabled. You manage your recovery phrase.')}
                  </Typography>
                </Alert>
                <Button variant="contained" onClick={migrateToPlatformDialog.onTrue}>
                  {t('Switch to Platform Custody')}
                </Button>
              </>
            )}

            {custodyChoice === 'platform' && (
              <>
                <Alert severity="info">
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    {t('Platform custody enabled. Auto-reconnect is active.')}
                  </Typography>
                  {user?.email && (
                    <Typography variant="caption" color="text.secondary">
                      {t('Consent email')}: {user.email}
                    </Typography>
                  )}
                </Alert>
                <Button variant="outlined" color="warning" onClick={migrateToSelfDialog.onTrue}>
                  {t('Switch to Self-Custody (Will delete stored phrase)')}
                </Button>
              </>
            )}
          </Stack>
        </CardContent>
      </Card>

      <Dialog
        open={migrateToPlatformDialog.value}
        onClose={migrateToPlatformDialog.onFalse}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t('Switch to Platform Custody')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {t(
                'Enter your recovery phrase to enable platform custody. Your phrase will be encrypted and stored securely.'
              )}
            </Typography>
            <TextField
              multiline
              rows={4}
              fullWidth
              label={t('Recovery Phrase')}
              placeholder={t('Enter your recovery phrase...')}
              value={mnemonic}
              onChange={(e) => {
                setMnemonic(e.target.value);
                if (mnemonicError) setMnemonicError('');
              }}
              error={!!mnemonicError}
              helperText={mnemonicError}
              disabled={isMigrating}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={migrateToPlatformDialog.onFalse} disabled={isMigrating}>
            {t('Cancel')}
          </Button>
          <Button
            variant="contained"
            onClick={handleMigrateToPlatform}
            disabled={!mnemonic.trim() || isMigrating}
            startIcon={isMigrating ? <CircularProgress size={16} /> : null}
          >
            {isMigrating ? t('Migrating...') : t('Enable Platform Custody')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={migrateToSelfDialog.value}
        onClose={migrateToSelfDialog.onFalse}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t('Switch to Self-Custody')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert severity="warning">
              <Typography variant="body2">
                {t(
                  'This will permanently delete your encrypted recovery phrase from our servers. You will need to manually enter your recovery phrase when reconnecting your account.'
                )}
              </Typography>
            </Alert>
            <Typography variant="body2" color="text.secondary">
              {t('Are you sure you want to switch to self-custody?')}
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={migrateToSelfDialog.onFalse} disabled={isMigrating}>
            {t('Cancel')}
          </Button>
          <Button
            variant="contained"
            color="warning"
            onClick={handleMigrateToSelf}
            disabled={isMigrating}
            startIcon={isMigrating ? <CircularProgress size={16} /> : null}
          >
            {isMigrating ? t('Switching...') : t('Switch to Self-Custody')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
