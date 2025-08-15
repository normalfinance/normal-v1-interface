'use client';

import type { AppStorePersist } from '@normalfinance/types';

import { useState } from 'react';
import { paths } from '@/routes/paths';
import { useTranslate } from '@/locales';
import { usePersistStore } from '@normalfinance/state';
import { InviteCodeService } from '@/lib/invite-code-service';

import {
  Box,
  Alert,
  Dialog,
  Button,
  Divider,
  TextField,
  Typography,
  DialogTitle,
  DialogContent,
  DialogActions,
  Link as MuiLink,
} from '@mui/material';

export type InviteCodeDialogProps = {
  /** Whether the dialog is visible */
  open: boolean;
  /** Called on cancel or after successful accept */
  onClose?: () => void;
};

export default function InviteCodeDialog({ open, onClose }: InviteCodeDialogProps) {
  const { t } = useTranslate();
  const setInviteCodeAccepted = usePersistStore((s: AppStorePersist) => s.setInviteCodeAccepted);

  const [inviteCode, setInviteCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmitCode = async () => {
    if (!inviteCode.trim()) {
      setError('Please enter an invite code');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await setInviteCodeAccepted(inviteCode.trim());
      setSuccess(true);
      setTimeout(() => {
        onClose?.();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Invalid invite code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTweetClick = () => {
    const tweetContent = InviteCodeService.generateTweetContent();
    window.open(tweetContent.url, '_blank', 'noopener,noreferrer');
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleSubmitCode();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={undefined} // Prevent closing by clicking outside
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown // Prevent closing with ESC key
    >
      <DialogTitle data-testid="invite-code-dialog-title">
        {t('Testnet Invite Required')}
      </DialogTitle>

      <DialogContent dividers>
        {success ? (
          <Alert severity="success" sx={{ mb: 2 }}>
            🎉 {t('Welcome to the Normal Finance testnet! Access granted.')}
          </Alert>
        ) : (
          <>
            <Typography variant="body1" sx={{ mb: 3 }}>
              {t(
                'Normal is currently in private testnet. Please enter your invite code to continue.'
              )}
            </Typography>

            <TextField
              fullWidth
              label="Invite Code"
              placeholder="Enter your invite code (e.g., NF8X9K2M)"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              onKeyPress={handleKeyPress}
              error={!!error}
              helperText={error}
              disabled={isLoading}
              sx={{ mb: 3 }}
              inputProps={{
                maxLength: 8,
                style: { textTransform: 'uppercase' },
              }}
            />

            <Divider sx={{ mb: 3 }}>
              <Typography variant="body2" color="text.secondary">
                {t("Don't have an invite code?")}
              </Typography>
            </Divider>

            <Box
              sx={{
                p: 3,
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                backgroundColor: 'background.paper',
              }}
            >
              <Typography variant="h6" sx={{ mb: 2 }}>
                🐦 {t('Get an invite code by tweeting about us!')}
              </Typography>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {t("Share your excitement about Normal on X and we'll send you an invite code.")}
              </Typography>

              <Button
                variant="outlined"
                color="primary"
                onClick={handleTweetClick}
                fullWidth
                sx={{ mb: 2 }}
              >
                📝 {t('Tweet about Normal')}
              </Button>

              <Typography variant="caption" color="text.secondary">
                {t('After tweeting, contact our team on')}{' '}
                <MuiLink
                  href={paths.socials.discord}
                  target="_blank"
                  rel="noopener noreferrer"
                  underline="always"
                >
                  {t('Discord')}
                </MuiLink>{' '}
                {t('or')}{' '}
                <MuiLink
                  href={paths.socials.telegram}
                  target="_blank"
                  rel="noopener noreferrer"
                  underline="always"
                >
                  {t('Telegram')}
                </MuiLink>{' '}
                {t('with your tweet link to receive your code.')}
              </Typography>
            </Box>
          </>
        )}
      </DialogContent>

      {!success && (
        <DialogActions>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSubmitCode}
            disabled={isLoading || !inviteCode.trim()}
            fullWidth
            data-testid="invite-code-submit-button"
          >
            {isLoading ? t('Verifying...') : t('Access Testnet')}
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
}
