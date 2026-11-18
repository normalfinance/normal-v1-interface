'use client';

import { useTranslate } from '@/locales';
import { useRouter } from 'next/navigation';
import { loginHrefFrom } from '@/lib/auth/auth-routes';
import { useState, useEffect, useCallback } from 'react';
import { registerActionCodePrompt } from '@/lib/auth/action-code';
import { useSupabaseAuth } from '@/providers/SupabaseAuthProvider';
import { TwoFactorChallenge } from '@/sections/auth/two-factor-challenge';

import Dialog from '@mui/material/Dialog';

import { useSnackbar } from '@/components/template/snackbar';

// The one code screen every action uses (lib/auth/action-code.ts), mounted once
// for the whole app so hooks and plain modules can ask for it.
export default function ActionCodeGate() {
  const { t } = useTranslate();
  const router = useRouter();
  const { signOut } = useSupabaseAuth();
  const { enqueueSnackbar } = useSnackbar();

  const [settle, setSettle] = useState<((confirmed: boolean) => void) | null>(null);

  useEffect(() => {
    registerActionCodePrompt(() => new Promise<boolean>((resolve) => setSettle(() => resolve)));
    return () => registerActionCodePrompt(null);
  }, []);

  const finish = useCallback(
    (confirmed: boolean) => {
      settle?.(confirmed);
      setSettle(null);
    },
    [settle]
  );

  // A recovery code removed 2FA and ended every session, so the action is off.
  const handleRecovered = async () => {
    finish(false);
    await signOut();
    enqueueSnackbar(t('Two-factor authentication is off. Log in to continue.'), {
      variant: 'success',
    });
    router.replace(loginHrefFrom(window.location.pathname, window.location.search));
  };

  return (
    <Dialog
      open={!!settle}
      onClose={() => finish(false)}
      fullWidth
      maxWidth="xs"
      PaperProps={{ sx: { borderRadius: 'var(--radius-lg)', p: '24px' } }}
    >
      <TwoFactorChallenge
        onVerified={() => finish(true)}
        onCancel={() => finish(false)}
        onRecovered={handleRecovered}
      />
    </Dialog>
  );
}
