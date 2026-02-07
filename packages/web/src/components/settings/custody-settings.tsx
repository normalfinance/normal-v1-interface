'use client';

import { useTranslate } from '@/locales';
import { useBoolean } from '@/hooks/use-boolean';
import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/createSupabaseClient';
import { useSupabaseAuth } from '@/providers/SupabaseAuthProvider';
import {
  logger,
  validateMnemonic,
  normalizeMnemonic,
  createKeypairFromMnemonic,
} from '@normalfinance/utils';
import { updateWalletCustody, removePlatformCustody } from '@/services/linked-wallets';
import {
  generateAESKey,
  encryptWithAES,
  generateRSAKeyPair,
  exportAESKeyAsBase64,
  encryptWithRSAPublicKey,
  encryptPrivateKeyForStorage,
} from '@/lib/client-crypto';
import { Turnstile } from '@marsidev/react-turnstile';

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
  InputAdornment,
  IconButton,
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import ContentCopy from '@mui/icons-material/ContentCopy';

import { useSnackbar } from '@/components/template/snackbar';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';

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
  const { copy } = useCopyToClipboard();
  const migrateToPlatformDialog = useBoolean();
  const migrateToSelfDialog = useBoolean();
  const exportMnemonicDialog = useBoolean();

  const [mnemonic, setMnemonic] = useState('');
  const [mnemonicError, setMnemonicError] = useState('');
  const [isMigrating, setIsMigrating] = useState(false);

  const [exportStage, setExportStage] = useState<'confirm' | 'otp' | 'reveal'>('confirm');
  const [exportOtp, setExportOtp] = useState('');
  const [exportCaptchaToken, setExportCaptchaToken] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportedMnemonic, setExportedMnemonic] = useState<string | null>(null);
  const [isHoldingReveal, setIsHoldingReveal] = useState(false);
  const [exportedSecretKey, setExportedSecretKey] = useState<string | null>(null);
  const [isSecretKeyVisible, setIsSecretKeyVisible] = useState(false);

  const resetExportState = useCallback(() => {
    setExportStage('confirm');
    setExportOtp('');
    setExportCaptchaToken(null);
    setIsExporting(false);
    setExportError(null);
    setExportedMnemonic(null);
    setIsHoldingReveal(false);
    setExportedSecretKey(null);
    setIsSecretKeyVisible(false);
  }, []);

  const handleCloseExport = useCallback(() => {
    exportMnemonicDialog.onFalse();
    resetExportState();
  }, [exportMnemonicDialog, resetExportState]);

  useEffect(() => {
    if (!exportMnemonicDialog.value) return;

    const hide = () => setIsHoldingReveal(false);
    const onVisibility = () => {
      if (document.visibilityState !== 'visible') hide();
    };

    window.addEventListener('blur', hide);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.removeEventListener('blur', hide);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [exportMnemonicDialog.value]);

  const handleSendExportOtp = useCallback(async () => {
    if (!user?.email) {
      enqueueSnackbar(t('User authentication required'), { variant: 'error' });
      return;
    }

    if (!exportCaptchaToken) {
      enqueueSnackbar(t('Invalid captcha'), { variant: 'error' });
      return;
    }

    setIsExporting(true);
    setExportError(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: user.email,
        options: {
          shouldCreateUser: false,
          captchaToken: exportCaptchaToken,
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        throw error;
      }

      setExportStage('otp');
    } catch (e: any) {
      setExportError(e?.message.toString() || t('Unable to send code. Please try again.'));
    } finally {
      setIsExporting(false);
    }
  }, [user?.email, exportCaptchaToken, enqueueSnackbar, t]);

  const handleVerifyExportOtp = useCallback(async () => {
    if (!user?.email) {
      enqueueSnackbar(t('User authentication required'), { variant: 'error' });
      return;
    }

    const token = exportOtp.trim();
    if (token.length !== 8) {
      setExportError(t('Please enter the 8-digit code'));
      return;
    }

    setIsExporting(true);
    setExportError(null);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: user.email,
        token,
        type: 'email',
      });
      if (error) {
        throw error;
      }

      const session = data?.session;
      if (!session?.access_token) {
        throw new Error('Authentication required');
      }

      const resp = await fetch(`/api/wallets/export-mnemonic/${walletAddress}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        credentials: 'include',
      });

      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(body?.error || t('Failed to export recovery phrase'));
      }

      const body = await resp.json();
      if (!body?.mnemonic || typeof body.mnemonic !== 'string') {
        throw new Error(t('Failed to export recovery phrase'));
      }

      setExportedMnemonic(body.mnemonic);

      try {
        const keypair = createKeypairFromMnemonic(body.mnemonic, '', 0);
        const secretKey = keypair.secret();
        setExportedSecretKey(secretKey);
      } catch (error) {
        logger.error('Failed to derive secret key:', error);
        setExportedSecretKey(null);
      }

      setExportStage('reveal');
      enqueueSnackbar(t('Recovery phrase ready to reveal'), { variant: 'success' });
    } catch (e: any) {
      logger.error('Failed to verify export OTP:', e);
      setExportError(e?.message || t('Invalid code. Please try again.'));
    } finally {
      setIsExporting(false);
    }
  }, [user?.email, exportOtp, walletAddress, enqueueSnackbar, t]);

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
                <Button variant="soft" onClick={migrateToPlatformDialog.onTrue}>
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
                <Button variant="soft" color="info" onClick={migrateToSelfDialog.onTrue}>
                  {t('Switch to Self-Custody (Will delete stored phrase)')}
                </Button>
                <Button variant="outlined" onClick={exportMnemonicDialog.onTrue}>
                  {t('Export Recovery Phrase')}
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
            variant="soft"
            color="info"
            onClick={handleMigrateToSelf}
            disabled={isMigrating}
            startIcon={isMigrating ? <CircularProgress size={16} /> : null}
          >
            {isMigrating ? t('Switching...') : t('Switch to Self-Custody')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={exportMnemonicDialog.value} onClose={handleCloseExport} maxWidth="sm" fullWidth>
        <DialogTitle>{t('Export Recovery Phrase')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert severity="warning">
              <Typography variant="body2">
                {t(
                  'Anyone with this recovery phrase can take your funds. Only export on a trusted device and never share it.'
                )}
              </Typography>
            </Alert>

            {exportStage === 'confirm' && (
              <>
                <Typography variant="body2" color="text.secondary">
                  {t('We will send an 8-digit verification code to confirm it is you.')}
                </Typography>
                <Turnstile
                  siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ''}
                  onSuccess={(token) => setExportCaptchaToken(token)}
                />
              </>
            )}

            {exportStage === 'otp' && (
              <>
                <Typography variant="body2" color="text.secondary">
                  {t('Enter the 8-digit code sent to')} {user?.email}
                </Typography>
                <TextField
                  label={t('Enter 8-digit code')}
                  value={exportOtp}
                  onChange={(e) => {
                    const numeric = e.target.value.replace(/\\D/g, '').slice(0, 8);
                    setExportOtp(numeric);
                    if (exportError) setExportError(null);
                  }}
                  fullWidth
                  disabled={isExporting}
                  inputProps={{
                    maxLength: 8,
                    style: { textAlign: 'center', letterSpacing: '0.5em', fontSize: '1.5rem' },
                  }}
                />
              </>
            )}

            {exportStage === 'reveal' && (
              <>
                <Typography variant="body2" color="text.secondary">
                  {t('Press and hold to reveal. Release to hide.')}
                </Typography>
                <TextField
                  multiline
                  rows={4}
                  fullWidth
                  label={t('Recovery Phrase')}
                  value={
                    isHoldingReveal ? (exportedMnemonic ?? '') : '••••••••••••••••••••••••••••'
                  }
                  InputProps={{ readOnly: true }}
                />
                <Button
                  variant="contained"
                  onPointerDown={() => setIsHoldingReveal(true)}
                  onPointerUp={() => setIsHoldingReveal(false)}
                  onPointerCancel={() => setIsHoldingReveal(false)}
                  onPointerLeave={() => setIsHoldingReveal(false)}
                  disabled={!exportedMnemonic}
                >
                  {t('Hold to Reveal')}
                </Button>

                {exportedSecretKey && (
                  <>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                      {t('Secret Key')}
                    </Typography>
                    <TextField
                      fullWidth
                      value={isSecretKeyVisible ? exportedSecretKey : '••••••••••••••••••••••••••••'}
                      InputProps={{
                        readOnly: true,
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setIsSecretKeyVisible(!isSecretKeyVisible)}
                              edge="end"
                              aria-label={isSecretKeyVisible ? t('Hide secret key') : t('Show secret key')}
                            >
                              {isSecretKeyVisible ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                            <IconButton
                              onClick={() => {
                                copy(exportedSecretKey);
                                enqueueSnackbar(t('Secret key copied to clipboard'), {
                                  variant: 'success',
                                });
                              }}
                              edge="end"
                              aria-label={t('Copy secret key')}
                            >
                              <ContentCopy />
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                  </>
                )}
              </>
            )}

            {exportError && (
              <Alert severity="error">
                <Typography variant="body2">{exportError}</Typography>
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseExport} disabled={isExporting}>
            {t('Close')}
          </Button>
          {exportStage === 'confirm' && (
            <Button
              variant="contained"
              onClick={handleSendExportOtp}
              disabled={isExporting || !exportCaptchaToken}
              startIcon={isExporting ? <CircularProgress size={16} /> : null}
            >
              {isExporting ? t('Sending...') : t('Send Code')}
            </Button>
          )}
          {exportStage === 'otp' && (
            <Button
              variant="contained"
              onClick={handleVerifyExportOtp}
              disabled={isExporting || exportOtp.trim().length !== 8}
              startIcon={isExporting ? <CircularProgress size={16} /> : null}
            >
              {isExporting ? t('Verifying...') : t('Verify & Export')}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
}
