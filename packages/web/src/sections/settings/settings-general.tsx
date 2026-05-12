'use client';

import { useState } from 'react';
import { useTranslate } from '@/locales';
import { cdn } from '@normalfinance/utils';
import { supabase } from '@/lib/createSupabaseClient';
import { buildAuthHeaders } from '@/utils/http';
import { useSupabaseAuth } from '@/providers/SupabaseAuthProvider';
import { useSnackbar } from '@/components/template/snackbar';

import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Switch from '@mui/material/Switch';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import FormControlLabel from '@mui/material/FormControlLabel';
import CircularProgress from '@mui/material/CircularProgress';

export function SettingsGeneral() {
  const { t } = useTranslate();
  const { session } = useSupabaseAuth();
  const { enqueueSnackbar } = useSnackbar();

  const user = session?.user;
  const userMetadata = user?.user_metadata as
    | { picture?: string; avatar_url?: string; name?: string; marketing_opt_in?: boolean }
    | undefined;

  const [marketingOptIn, setMarketingOptIn] = useState<boolean>(
    userMetadata?.marketing_opt_in ?? false
  );
  const [isSaving, setIsSaving] = useState(false);

  if (!user) return null;

  const userEmail = user.email ?? '';
  const userAvatar =
    userMetadata?.picture || userMetadata?.avatar_url || cdn('logo/logo-single.svg');
  const displayName = userMetadata?.name || userEmail || 'User';
  const createdAt = user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A';
  const authProvider = user.app_metadata?.provider || 'email';

  const handleMarketingToggle = async (checked: boolean) => {
    setMarketingOptIn(checked);
    setIsSaving(true);
    try {
      const headers = await buildAuthHeaders();
      await fetch('/api/marketing/opt-in', {
        method: 'POST',
        headers,
        body: JSON.stringify({ optIn: checked }),
      });
      await supabase.auth.updateUser({ data: { marketing_opt_in: checked } });
      enqueueSnackbar(
        checked ? t('Subscribed to product updates') : t('Unsubscribed from product updates'),
        { variant: 'success' }
      );
    } catch {
      setMarketingOptIn(!checked);
      enqueueSnackbar(t('Failed to update preference'), { variant: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardContent>
        <Stack spacing={3}>
          <Stack direction="row" spacing={3} alignItems="center">
            <Avatar src={userAvatar} alt={displayName} sx={{ width: 80, height: 80 }} />
            <Stack spacing={1}>
              <Typography variant="h6">{displayName}</Typography>
              <Typography variant="body2" color="text.secondary">
                {userEmail}
              </Typography>
            </Stack>
          </Stack>

          <Stack spacing={2}>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2" color="text.secondary">
                {t('Display Name')}
              </Typography>
              <Typography variant="body2">{displayName}</Typography>
            </Stack>

            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2" color="text.secondary">
                {t('Email')}
              </Typography>
              <Typography variant="body2">{userEmail}</Typography>
            </Stack>

            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2" color="text.secondary">
                {t('Account Created')}
              </Typography>
              <Typography variant="body2">{createdAt}</Typography>
            </Stack>

            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2" color="text.secondary">
                {t('Auth Provider')}
              </Typography>
              <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                {authProvider}
              </Typography>
            </Stack>
          </Stack>

          <Divider />

          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack spacing={0.5}>
              <Typography variant="body2" fontWeight={500}>
                {t('Product updates')}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t('Receive emails about new features and improvements.')}
              </Typography>
            </Stack>
            <Stack direction="row" alignItems="center" spacing={1}>
              {isSaving && <CircularProgress size={16} />}
              <FormControlLabel
                control={
                  <Switch
                    checked={marketingOptIn}
                    onChange={(e) => handleMarketingToggle(e.target.checked)}
                    disabled={isSaving}
                  />
                }
                label=""
                sx={{ mr: 0 }}
              />
            </Stack>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
