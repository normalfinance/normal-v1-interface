'use client';

import { useTranslate } from '@/locales';
import { updateWalletName } from '@/services/linked-wallets';
import { useNormalWallet } from '@/hooks/stellar/use-normal-wallet';
import React, { useMemo, useState, useEffect, useCallback } from 'react';
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
  Dialog,
  Button,
  Checkbox,
  TextField,
  Typography,
  DialogTitle,
  DialogContent,
  CircularProgress,
  FormControlLabel,
} from '@mui/material';

import { Iconify } from '@/components/template/iconify';
import { useSnackbar } from '@/components/template/snackbar';
import ModalCloseButton from '@/components/_common/modal-close-button';

export type NormalWalletCreateProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

type CreateStage = 'creating' | 'summary' | 'backup' | 'verify';

interface VerificationQuestion {
  index: number;
  correctWord: string;
  options: string[];
}

// Number of words the user must correctly identify before their wallet is
// considered "backed up". Self-custody is the only option — make this strict.
const VERIFICATION_WORD_COUNT = 3;

// After this many seconds, the clipboard is overwritten to blank so the
// recovery phrase does not linger across paste operations.
const CLIPBOARD_CLEAR_SECONDS = 30;

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

  const [stage, setStage] = useState<CreateStage>('creating');
  const [mnemonic, setMnemonic] = useState<string | null>(null);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [walletName, setWalletName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [verificationQuestions, setVerificationQuestions] = useState<VerificationQuestion[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [answerErrors, setAnswerErrors] = useState<Record<number, string>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [backupAcknowledged, setBackupAcknowledged] = useState(false);

  const formattedMnemonic = useMemo(
    () => (mnemonic ? formatMnemonicForDisplay(mnemonic) : []),
    [mnemonic]
  );

  // Stages during which the dialog must not be dismissable. The user has just
  // seen their recovery phrase and they have one chance to write it down —
  // letting them accidentally close the dialog (ESC, backdrop click, X button)
  // would strand them with a wallet they cannot recover.
  const isLocked = stage === 'backup' || stage === 'verify';

  // Create wallet on mount
  useEffect(() => {
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
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, stage]);

  const handleBackupWallet = () => {
    setStage('backup');
  };

  const handleCopyMnemonic = async () => {
    if (!mnemonic) return;
    try {
      await navigator.clipboard.writeText(mnemonic);
      enqueueSnackbar(
        t('Backup phrase copied. Clipboard will be cleared in ') +
          CLIPBOARD_CLEAR_SECONDS +
          t('s.'),
        { variant: 'success' }
      );
      // Overwrite the clipboard after a short delay. We cannot verify the
      // clipboard contents without prompting for permission, so we just blank
      // it out — the user has been warned.
      setTimeout(() => {
        navigator.clipboard.writeText('').catch(() => {
          /* ignore — user may have lost focus */
        });
      }, CLIPBOARD_CLEAR_SECONDS * 1000);
    } catch (err) {
      logger.error('Failed to copy mnemonic:', err);
      enqueueSnackbar(t('Failed to copy backup phrase'), { variant: 'error' });
    }
  };

  const startVerification = useCallback(() => {
    if (!mnemonic) return;

    const words = splitMnemonicToWords(mnemonic);
    const requiredCount = Math.min(VERIFICATION_WORD_COUNT, words.length);
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

  const resetState = useCallback(() => {
    setMnemonic(null);
    setPublicKey(null);
    setWalletName('');
    setStage('creating');
    setVerificationQuestions([]);
    setSelectedAnswers({});
    setAnswerErrors({});
    setCurrentQuestionIndex(0);
    setError(null);
    setBackupAcknowledged(false);
  }, []);

  const handleComplete = useCallback(async () => {
    if (walletName.trim() && publicKey) {
      try {
        await updateWalletName(publicKey, walletName.trim());
      } catch (err) {
        logger.warn('Failed to update wallet name:', err);
      }
    }

    resetState();
    enqueueSnackbar(t('Account created successfully!'), { variant: 'success' });
    onSuccess();
  }, [walletName, publicKey, onSuccess, enqueueSnackbar, t, resetState]);

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
        newErrors[index] = t('Incorrect selection');
        hasError = true;
      }
    });

    if (hasError) {
      // Any wrong answer sends the user back to re-read the phrase. Self-custody
      // means we cannot afford a user who half-remembered their words.
      setAnswerErrors(newErrors);
      setSelectedAnswers({});
      setCurrentQuestionIndex(0);
      setBackupAcknowledged(false);
      enqueueSnackbar(
        t('One or more words were incorrect. Please re-read your recovery phrase carefully.'),
        { variant: 'error' }
      );
      setStage('backup');
      return;
    }

    handleComplete();
  };

  const handleClose = () => {
    if (isLocked) return;
    resetState();
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={(_event, reason) => {
        // Block backdrop clicks and ESC during the locked stages.
        if (isLocked && (reason === 'backdropClick' || reason === 'escapeKeyDown')) {
          return;
        }
        handleClose();
      }}
      disableEscapeKeyDown={isLocked}
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
          {stage === 'backup' && t('Back Up Your Recovery Phrase')}
          {stage === 'verify' && t('Verify Your Recovery Phrase')}
        </Typography>
        {!isLocked && (
          <ModalCloseButton
            onClick={handleClose}
            sx={{ position: 'absolute', right: 12, top: 12 }}
          />
        )}
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
              <Iconify icon="solar:banknote-2-bold" width={80} sx={{ color: 'success.main' }} />
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

            <Alert severity="error">
              <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
                {t('IMPORTANT — READ THIS')}
              </Typography>
              <Typography variant="body2">
                {t(
                  'Normal does NOT store your recovery phrase. If you lose it, your funds are gone forever and no one can recover them for you. You must back it up now.'
                )}
              </Typography>
            </Alert>

            <Paper
              variant="outlined"
              sx={{
                p: 3,
                backgroundColor: 'background.neutral',
              }}
            >
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {t(
                  'You will now be shown your recovery phrase. Once you proceed, you cannot close this dialog until you have written it down and verified it.'
                )}
              </Typography>
              <Button variant="contained" fullWidth size="large" onClick={handleBackupWallet}>
                {t('Show My Recovery Phrase')}
              </Button>
            </Paper>
          </Stack>
        )}

        {stage === 'backup' && mnemonic && (
          <Stack spacing={3}>
            <Alert severity="error">
              <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
                {t('Your Recovery Phrase — NEVER SHARE')}
              </Typography>
              <Typography variant="body2">
                {t(
                  'Anyone with this phrase can steal all of your funds. Normal will NEVER ask for it. Normal CANNOT recover it for you.'
                )}
              </Typography>
            </Alert>

            <Typography variant="body2" color="text.secondary">
              {t(
                'Write down these words in order on paper and keep them in a safe, offline location. You will need them to recover your account on a new device.'
              )}
            </Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}>
              {chunkArray(formattedMnemonic, 3).map((row) =>
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
                    <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>
                      {item.index}.
                    </Typography>
                    <Typography variant="body2" fontWeight={600} component="span">
                      {item.word}
                    </Typography>
                  </Paper>
                ))
              )}
            </Box>

            <FormControlLabel
              control={
                <Checkbox
                  checked={backupAcknowledged}
                  onChange={(e) => setBackupAcknowledged(e.target.checked)}
                />
              }
              label={
                <Typography variant="body2">
                  {t(
                    'I have written down my recovery phrase and stored it in a secure location. I understand Normal cannot recover it for me.'
                  )}
                </Typography>
              }
            />

            <Stack spacing={2}>
              <Button
                variant="contained"
                fullWidth
                size="large"
                disabled={!backupAcknowledged}
                onClick={startVerification}
              >
                {t("I've Written It Down — Verify Now")}
              </Button>
              <Button variant="outlined" fullWidth onClick={handleCopyMnemonic}>
                {t('Copy Recovery Phrase (clears in ') + CLIPBOARD_CLEAR_SECONDS + t('s)')}
              </Button>
            </Stack>
          </Stack>
        )}

        {stage === 'verify' && verificationQuestions.length > 0 && (
          <Stack spacing={3}>
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
                {t('Final Step')}
              </Typography>
              <Typography variant="body2">
                {t(
                  'Prove you have written down your recovery phrase. If any answer is wrong, you will be sent back to re-read it.'
                )}
              </Typography>
            </Alert>

            <Box>
              <Typography variant="h6" sx={{ mb: 1 }}>
                {(() => {
                  const index = verificationQuestions[currentQuestionIndex]?.index;
                  const ordinal =
                    index === 1 ? 'st' : index === 2 ? 'nd' : index === 3 ? 'rd' : 'th';
                  return t('Select the') + ` ${index}${ordinal} ` + t('word of your backup phrase');
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
                <Alert severity="error" sx={{ mt: 1 }}>
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
    </Dialog>
  );
}
