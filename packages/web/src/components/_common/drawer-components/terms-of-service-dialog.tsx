'use client';

/** ------------------------------------------------------------------
 * TermsOfServiceDialog
 * -------------------------------------------------------------------
 * A standalone MUI dialog that forces a user to accept the latest
 * Terms of Service (ToS) **before** they can interact with Connect
 * Wallet.  Acceptance is persisted to localStorage via the zustand
 * `usePersistStore` slice.
 *
 * 👉  Admin override: simply bump `CURRENT_TOS_VERSION` whenever the
 *     ToS text changes.  Any user with an older accepted version will
 *     be prompted again on their next visit / page refresh.
 *
 * ------------------------------------------------------------------
 * Integration sketch ↓
 * ------------------------------------------------------------------
 * import TermsOfServiceDialog, { CURRENT_TOS_VERSION } from
 *   '@/components/_common/terms-of-service-dialog';
 * import { usePersistStore } from '@normalfinance/state';
 *
 * const acceptedVersion = usePersistStore((s) => s.disclaimer.version);
 * const [showTos, setShowTos] = useState(false);
 *
 * const handleConnectWalletClick = () => {
 *   if (acceptedVersion < CURRENT_TOS_VERSION) {
 *     setShowTos(true);
 *   } else {
 *     // ↪ existing connect‑wallet logic
 *   }
 * };
 *
 * <TermsOfServiceDialog open={showTos} onClose={() => setShowTos(false)} />
 * ------------------------------------------------------------------
 * Zustand slice additions (usePersistStore) ↓
 * ------------------------------------------------------------------
 * acceptedTosVersion: typeof window !== 'undefined'
 *   ? Number(localStorage.getItem('accepted_tos_version') || 0)
 *   : 0,
 * setAcceptedTosVersion: (v: number) => {
 *   localStorage.setItem('accepted_tos_version', String(v));
 *   set({ acceptedTosVersion: v });
 * },
 * ------------------------------------------------------------------ */

import type { AppStorePersist } from '@normalfinance/types';

import { paths } from '@/routes/paths';
import { useTranslate } from '@/locales';
import { usePersistStore } from '@normalfinance/state';

import {
  List,
  Dialog,
  Button,
  ListItem,
  Typography,
  DialogTitle,
  ListItemText,
  DialogContent,
  DialogActions,
  Link as MuiLink,
} from '@mui/material';

// 🔑  Bump this constant whenever the legal text is updated

export type TermsOfServiceDialogProps = {
  /** Whether the dialog is visible */
  open: boolean;
  /** Called on cancel or after successful accept */
  onClose?: () => void;
};

export default function TermsOfServiceDialog({ open, onClose }: TermsOfServiceDialogProps) {
  const { t } = useTranslate();
  const setDisclaimerAccepted = usePersistStore((s: AppStorePersist) => s.setDisclaimerAccepted);

  const handleAccept = () => {
    setDisclaimerAccepted(true);
    onClose?.();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle data-testid="tos-dialog-title">{t('Terms of Service')}</DialogTitle>

      <DialogContent dividers sx={{ maxHeight: 600 }}>
        <Typography variant="body2" sx={{ mb: 2 }}>
          {t('By continuing and using this protocol:')}
        </Typography>

        {/* Bullet list */}
        <List dense disablePadding component="ul" sx={{ pl: 2 }}>
          <ListItem
            component="li"
            sx={{
              display: 'list-item',
              listStyleType: 'disc',
              pl: 1,
            }}
          >
            <ListItemText
              primary={
                <Typography variant="body2" component="span" color="text.secondary">
                  {t('You understand and agree to the')}{' '}
                  <MuiLink
                    href={`${paths.docs}/other/legal/terms-of-service`}
                    underline="always"
                    color="secondary"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t('Normal Terms of Service')}
                  </MuiLink>{' '}
                  {t('and')}{' '}
                  <MuiLink
                    href={`${paths.docs}/other/legal/disclaimer`}
                    underline="always"
                    color="secondary"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t('Normal Protocol Disclaimer')}
                  </MuiLink>
                </Typography>
              }
            />
          </ListItem>
          <ListItem
            component="li"
            sx={{
              display: 'list-item',
              listStyleType: 'disc',
              pl: 1,
            }}
          >
            <ListItemText
              primary={
                <Typography variant="body2" component="span" color="text.secondary">
                  {t(
                    'You understand the rules and risks associated with settlement of pool liquidity, synthetic assets, insurance, and socialised losses.'
                  )}
                </Typography>
              }
            />
          </ListItem>
        </List>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>{t('Decline')}</Button>
        <Button variant="contained" color="secondary" onClick={handleAccept} autoFocus data-testid="tos-dialog-accept-button">
          {t('Accept')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
