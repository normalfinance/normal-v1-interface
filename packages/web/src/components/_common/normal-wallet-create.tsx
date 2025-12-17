'use client';

import { useTranslate } from '@/locales';
import { useBoolean } from '@/hooks/use-boolean';
import { supabase } from '@/lib/createSupabaseClient';
import React, { useMemo, useState, useCallback } from 'react';
import { useSupabaseAuth } from '@/providers/SupabaseAuthProvider';
import { useNormalWallet } from '@/hooks/stellar/use-normal-wallet';
import { linkWallet, updateWalletName } from '@/services/linked-wallets';
import {
  logger,
  splitMnemonicToWords,
  formatMnemonicForDisplay,
  getRandomVerificationWords,
} from '@normalfinance/utils';

import {
  Box,
  Stack,
  Paper,
  Alert,
  Radio,
  Dialog,
  Button,
  Checkbox,
  TextField,
  Typography,
  IconButton,
  RadioGroup,
  DialogTitle,
  DialogContent,
  CircularProgress,
  FormControlLabel,
} from '@mui/material';

import { Iconify } from '@/components/template/iconify';
import { useSnackbar } from '@/components/template/snackbar';
import { ConfirmDialog } from '@/components/template/custom-dialog';

export type NormalWalletCreateProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

type CreateStage = 'creating' | 'summary' | 'backup' | 'custody-choice' | 'verify';

interface VerificationQuestion {
  index: number;
  correctWord: string;
  options: string[];
}

const chunkArray = <T,>(array: T[], size: number): T[][] => {
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
};

export default function NormalWalletCreate({ open, onClose, onSuccess }: NormalWalletCreateProps) {
  const { t } = useTranslate();
  const { enqueueSnackbar } = useSnackbar();
  const { createWallet } = useNormalWallet();
  const { user } = useSupabaseAuth();
  const confirmSkip = useBoolean();

  const [stage, setStage] = useState<CreateStage>('creating');
  const [mnemonic, setMnemonic] = useState<string | null>(null);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [walletName, setWalletName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [verificationQuestions, setVerificationQuestions] = useState<VerificationQuestion[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [answerErrors, setAnswerErrors] = useState<Record<number, string>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [custodyChoice, setCustodyChoice] = useState<'self' | 'platform' | null>(null);
  const [custodyConsent, setCustodyConsent] = useState(false);
  const [isSavingCustody, setIsSavingCustody] = useState(false);

  const formattedMnemonic = useMemo(
    () => (mnemonic ? formatMnemonicForDisplay(mnemonic) : []),
    [mnemonic]
  );

  // Create wallet on mount
  // eslint-disable-next-line consistent-return
  React.useEffect(() => {
    if (open && stage === 'creating') {
      let cancelled = false;

      const createWalletAsync = async () => {
        try {
          setError(null);
          const result = await createWallet();
          if (!cancelled) {
            setMnemonic(result.mnemonic);
            setPublicKey(result.publicKey);
            setStage('summary');
          }
        } catch (err: any) {
          if (!cancelled) {
            logger.error('Failed to create wallet:', err);
            setError(err.message || 'Failed to create wallet');
          }
        }
      };

      createWalletAsync();

      return () => {
        cancelled = true;
      };
    }
  }, [open, stage]); // Removed createWallet from dependencies to prevent infinite loop

  const handleBackupWallet = () => {
    setStage('backup');
  };

  const handleSkipBackup = () => {
    confirmSkip.onTrue();
  };

  const handleConfirmSkip = () => {
    confirmSkip.onFalse();
    handleComplete();
  };

  const handleCopyMnemonic = async () => {
    if (!mnemonic) return;
    try {
      await navigator.clipboard.writeText(mnemonic);
      enqueueSnackbar(t('Backup phrase copied to clipboard'), { variant: 'success' });
    } catch (err) {
      logger.error('Failed to copy mnemonic:', err);
      enqueueSnackbar(t('Failed to copy backup phrase'), { variant: 'error' });
    }
  };

  const encryptAndSaveMnemonic = useCallback(async () => {
    if (!mnemonic || !publicKey || !user?.id || !user?.email) {
      throw new Error('Missing required data for encryption');
    }

    setIsSavingCustody(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('Authentication required');
      }

      const encryptResponse = await fetch('/api/wallets/encrypt-mnemonic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          walletAddress: publicKey,
          mnemonic,
        }),
      });

      if (!encryptResponse.ok) {
        const e = await encryptResponse.json();
        throw new Error(e.error || 'Failed to encrypt mnemonic');
      }

      const { encryptedMnemonic, encryptionIV, encryptionSalt } = await encryptResponse.json();

      await linkWallet(publicKey, walletName.trim() || undefined, {
        custodyChoice: 'platform',
        encryptedMnemonic,
        encryptionIV,
        encryptionSalt,
        custodyConsentEmail: user.email,
      });
    } finally {
      setIsSavingCustody(false);
    }
  }, [mnemonic, publicKey, walletName, user]);

  const startVerification = useCallback(() => {
    if (!mnemonic) return;

    const words = splitMnemonicToWords(mnemonic);
    const requiredCount = words.length >= 24 ? 3 : 2;
    const verificationWords = getRandomVerificationWords(mnemonic, requiredCount);
    const formatted = formatMnemonicForDisplay(mnemonic);

    const questions: VerificationQuestion[] = verificationWords.map(({ index, word }) => {
      const otherOptions = formatted
        .filter((item) => item.index !== index)
        .map((item) => item.word);

      const distractors = otherOptions.sort(() => 0.5 - Math.random()).slice(0, 3);

      const options = [...distractors, word].sort(() => 0.5 - Math.random());

      return {
        index,
        correctWord: word,
        options,
      };
    });

    setVerificationQuestions(questions);
    setSelectedAnswers({});
    setAnswerErrors({});
    setCurrentQuestionIndex(0);
    setStage('verify');
  }, [mnemonic]);

  const handleComplete = useCallback(async () => {
    if (walletName.trim() && publicKey) {
      try {
        await updateWalletName(publicKey, walletName.trim());
      } catch (err) {
        logger.warn('Failed to update wallet name:', err);
      }
    }

    setMnemonic(null);
    setPublicKey(null);
    setWalletName('');
    setStage('creating');
    setVerificationQuestions([]);
    setSelectedAnswers({});
    setAnswerErrors({});
    setCurrentQuestionIndex(0);
    setError(null);
    setCustodyChoice(null);
    setCustodyConsent(false);
    setIsSavingCustody(false);
    onSuccess();
  }, [walletName, publicKey, onSuccess]);

  const handleCustodyConfirm = useCallback(async () => {
    if (custodyChoice === 'self') {
      startVerification();
    } else if (custodyChoice === 'platform') {
      if (!custodyConsent) {
        enqueueSnackbar(t('Please provide consent to store your recovery phrase'), {
          variant: 'warning',
        });
        return;
      }

      try {
        await encryptAndSaveMnemonic();
        await handleComplete();
      } catch (err: any) {
        logger.error('Failed to save encrypted mnemonic:', err);
        enqueueSnackbar(
          err.message || t('Failed to save encrypted recovery phrase. Please try self-custody.'),
          { variant: 'error' }
        );
        setError(err.message || t('Failed to save encrypted recovery phrase'));
      }
    }
  }, [
    custodyChoice,
    custodyConsent,
    encryptAndSaveMnemonic,
    handleComplete,
    startVerification,
    enqueueSnackbar,
    t,
  ]);

  const handleSelectAnswer = useCallback(
    (index: number, value: string) => {
      setSelectedAnswers((prev) => ({
        ...prev,
        [index]: value,
      }));

      if (answerErrors[index]) {
        setAnswerErrors((prev) => ({
          ...prev,
          [index]: '',
        }));
      }

      // Automatically move to next question after a short delay
      if (currentQuestionIndex < verificationQuestions.length - 1) {
        setTimeout(() => {
          setCurrentQuestionIndex((prev) => prev + 1);
        }, 300);
      }
    },
    [answerErrors, currentQuestionIndex, verificationQuestions.length]
  );

  const handleVerifyBackup = () => {
    if (!mnemonic) return;

    const newErrors: Record<number, string> = {};
    let hasError = false;

    verificationQuestions.forEach(({ index, correctWord }) => {
      const answer = selectedAnswers[index];
      if (!answer) {
        newErrors[index] = t('Please select an option');
        hasError = true;
      } else if (answer.toLowerCase() !== correctWord.toLowerCase()) {
        newErrors[index] = t('Incorrect word');
        hasError = true;
      }
    });

    if (hasError) {
      setAnswerErrors(newErrors);
      return;
    }

    handleComplete();
  };

  const handleClose = () => {
    if (stage === 'creating') {
      onClose();
      return;
    }

    if (
      stage === 'summary' ||
      stage === 'backup' ||
      stage === 'custody-choice' ||
      stage === 'verify'
    ) {
      confirmSkip.onTrue();
      return;
    }

    setMnemonic(null);
    setPublicKey(null);
    setWalletName('');
    setStage('creating');
    setVerificationQuestions([]);
    setSelectedAnswers({});
    setAnswerErrors({});
    setCurrentQuestionIndex(0);
    setError(null);
    setCustodyChoice(null);
    setCustodyConsent(false);
    setIsSavingCustody(false);
    onClose();
  };

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
          {stage === 'creating' && t('Creating Account...')}
          {stage === 'summary' && t('Account Created Successfully!')}
          {stage === 'backup' && t('Backup Your Account')}
          {stage === 'custody-choice' && t('Choose Custody Option')}
          {stage === 'verify' && t('Verify Your Account')}
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
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {stage === 'creating' && (
          <Stack spacing={2} alignItems="center" sx={{ py: 4 }}>
            <CircularProgress />
          </Stack>
        )}

        {stage === 'summary' && mnemonic && (
          <Stack spacing={3}>
            <Box sx={{ textAlign: 'center', py: 2 }}>
              <Iconify icon="solar:wallet-bold" width={80} sx={{ color: 'primary.main' }} />
            </Box>

            {/* Wallet Name Input */}
            <TextField
              label={t('Account Name (Optional)')}
              placeholder={t('e.g., Trading Account, Savings')}
              value={walletName}
              onChange={(e) => setWalletName(e.target.value)}
              fullWidth
              inputProps={{ maxLength: 50 }}
              helperText=""
            />

            <Paper
              variant="outlined"
              sx={{
                p: 3,
                backgroundColor: 'background.neutral',
              }}
            >
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {t('Backup your recovery phrase to ensure you can recover your account later.')}
              </Typography>
              <Button variant="contained" fullWidth onClick={handleBackupWallet} sx={{ mb: 1 }}>
                {t('Back up')}
              </Button>
              <Button variant="outlined" fullWidth onClick={handleSkipBackup}>
                {t('Skip for Now')}
              </Button>
            </Paper>
          </Stack>
        )}

        {stage === 'backup' && mnemonic && (
          <Stack spacing={3}>
            <Box>
              <Button
                startIcon={<Iconify icon="mingcute:left-line" />}
                onClick={() => setStage('summary')}
                sx={{ mb: 2 }}
              >
                {t('Back')}
              </Button>
            </Box>

            <Typography variant="body2" color="text.secondary">
              {t(
                'Write down these words in order and keep them in a safe place. You will need them to recover your wallet.'
              )}
            </Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}>
              {chunkArray(formattedMnemonic, 3).map((row, rowIndex) =>
                row.map((item) => (
                  <Paper
                    key={item.index}
                    variant="outlined"
                    sx={{
                      p: 1.5,
                      textAlign: 'center',
                      backgroundColor: 'background.paper',
                    }}
                  >
                    <Typography variant="body2" fontWeight={600}>
                      {item.word}
                    </Typography>
                  </Paper>
                ))
              )}
            </Box>

            <Stack spacing={2}>
              <Button variant="contained" fullWidth onClick={() => setStage('custody-choice')}>
                {t("I've Written It Down")}
              </Button>
              <Button variant="outlined" fullWidth onClick={handleCopyMnemonic}>
                {t('Copy to Clipboard')}
              </Button>
            </Stack>
          </Stack>
        )}

        {stage === 'custody-choice' && (
          <Stack spacing={3}>
            <Box>
              <Button
                startIcon={<Iconify icon="mingcute:left-line" />}
                onClick={() => setStage('backup')}
                sx={{ mb: 2 }}
              >
                {t('Back')}
              </Button>
            </Box>

            <Typography variant="h6">
              {t('How would you like to secure your recovery phrase?')}
            </Typography>

            <RadioGroup
              value={custodyChoice || ''}
              onChange={(e) => {
                setCustodyChoice(e.target.value as 'self' | 'platform');
                if (e.target.value === 'self') {
                  setCustodyConsent(false);
                }
              }}
            >
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  mb: 2,
                  cursor: 'pointer',
                  borderColor: custodyChoice === 'self' ? 'primary.main' : 'divider',
                  bgcolor: custodyChoice === 'self' ? 'action.selected' : 'background.paper',
                  '&:hover': {
                    borderColor: 'primary.main',
                  },
                }}
                onClick={() => {
                  setCustodyChoice('self');
                  setCustodyConsent(false);
                }}
              >
                <FormControlLabel
                  value="self"
                  control={<Radio />}
                  label={
                    <Box>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {t("I'll Store It Myself (Self-Custody)")}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {t('Maximum security. You keep your phrase.')}
                      </Typography>
                    </Box>
                  }
                  sx={{ m: 0 }}
                />
              </Paper>

              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  mb: 2,
                  cursor: 'pointer',
                  borderColor: custodyChoice === 'platform' ? 'primary.main' : 'divider',
                  bgcolor: custodyChoice === 'platform' ? 'action.selected' : 'background.paper',
                  '&:hover': {
                    borderColor: 'primary.main',
                  },
                }}
                onClick={() => setCustodyChoice('platform')}
              >
                <FormControlLabel
                  value="platform"
                  control={<Radio />}
                  label={
                    <Box>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {t('Store Securely with Normal Finance')}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {t('Convenience. Auto-reconnect without re-entering.')}
                      </Typography>
                    </Box>
                  }
                  sx={{ m: 0 }}
                />
              </Paper>
            </RadioGroup>

            {custodyChoice === 'platform' && (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={custodyConsent}
                    onChange={(e) => setCustodyConsent(e.target.checked)}
                  />
                }
                label={t('I authorize Normal Finance to store my encrypted recovery phrase')}
              />
            )}

            <Button
              variant="contained"
              fullWidth
              onClick={handleCustodyConfirm}
              disabled={
                !custodyChoice ||
                (custodyChoice === 'platform' && !custodyConsent) ||
                isSavingCustody
              }
              startIcon={isSavingCustody ? <CircularProgress size={16} /> : null}
            >
              {isSavingCustody ? t('Saving...') : t('Continue')}
            </Button>
          </Stack>
        )}

        {stage === 'verify' && verificationQuestions.length > 0 && (
          <Stack spacing={3}>
            <Box>
              <Button
                startIcon={<Iconify icon="mingcute:left-line" />}
                onClick={() => setStage('backup')}
                sx={{ mb: 2 }}
              >
                {t('Back')}
              </Button>
            </Box>

            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                {t('Final Step')}
              </Typography>
              <Typography variant="body2">
                {t(
                  'This is your only chance to verify your backup phrase. Once you complete this step, the phrase will be permanently removed for security. Make sure you have safely written it down before proceeding.'
                )}
              </Typography>
            </Alert>

            <Box>
              <Typography variant="h6" sx={{ mb: 1 }}>
                {(() => {
                  const index = verificationQuestions[currentQuestionIndex]?.index;
                  const ordinal =
                    index === 1 ? 'st' : index === 2 ? 'nd' : index === 3 ? 'rd' : 'th';
                  return t('Select the') + ` ${index}${ordinal} ` + t('word');
                })()}
              </Typography>

              {/* Progress indicators */}
              <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
                {verificationQuestions.map((_, index) => (
                  <Box
                    key={index}
                    sx={{
                      flex: 1,
                      height: 4,
                      borderRadius: 1,
                      backgroundColor:
                        index === currentQuestionIndex
                          ? 'primary.main'
                          : index < currentQuestionIndex
                            ? 'success.main'
                            : 'divider',
                    }}
                  />
                ))}
              </Stack>

              <Stack spacing={1}>
                {verificationQuestions[currentQuestionIndex]?.options.map((option, optIndex) => {
                  const isSelected =
                    selectedAnswers[verificationQuestions[currentQuestionIndex].index] === option;
                  const hasError = answerErrors[verificationQuestions[currentQuestionIndex].index];

                  return (
                    <Button
                      key={optIndex}
                      variant={isSelected ? 'contained' : 'outlined'}
                      color={hasError && isSelected ? 'error' : 'primary'}
                      fullWidth
                      onClick={() =>
                        handleSelectAnswer(
                          verificationQuestions[currentQuestionIndex].index,
                          option
                        )
                      }
                      sx={{ textTransform: 'none' }}
                    >
                      {option}
                    </Button>
                  );
                })}
              </Stack>

              {answerErrors[verificationQuestions[currentQuestionIndex]?.index] && (
                <Alert severity="error">
                  {answerErrors[verificationQuestions[currentQuestionIndex].index]}
                </Alert>
              )}

              {currentQuestionIndex === verificationQuestions.length - 1 && (
                <Button variant="contained" fullWidth onClick={handleVerifyBackup} sx={{ mt: 2 }}>
                  {t('Verify Backup')}
                </Button>
              )}
            </Box>
          </Stack>
        )}
      </DialogContent>

      <ConfirmDialog
        open={confirmSkip.value}
        onClose={confirmSkip.onFalse}
        title={t('Skip Backup?')}
        content={t(
          "Without backing up your wallet, you won't be able to recover it if you lose access. Are you sure?"
        )}
        action={
          <Button variant="contained" onClick={handleConfirmSkip}>
            {t('Skip Anyway')}
          </Button>
        }
      />
    </Dialog>
  );
}
