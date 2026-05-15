'use client';

import { useTranslate } from '@/locales';
import { cdn } from '@normalfinance/utils';
import { useState, useEffect } from 'react';
import { buildAuthHeaders } from '@/utils/http';
import { supabase } from '@/lib/createSupabaseClient';
import { useSupabaseAuth } from '@/providers/SupabaseAuthProvider';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Switch from '@mui/material/Switch';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import { alpha, useTheme } from '@mui/material/styles';

import { Iconify } from '@/components/template/iconify';
import { useSnackbar } from '@/components/template/snackbar';

export function SettingsGeneral() {
  const { t } = useTranslate();
  const theme = useTheme();
  const { session } = useSupabaseAuth();
  const { enqueueSnackbar } = useSnackbar();

  const user = session?.user;
  const userMetadata = user?.user_metadata as
    | { picture?: string; avatar_url?: string; name?: string }
    | undefined;

  const [marketingOptIn, setMarketingOptIn] = useState<boolean>(false);
  const [isFetchingOptIn, setIsFetchingOptIn] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch live opt-in status on mount — session.user.user_metadata can be stale
  useEffect(() => {
    const fetchOptIn = async () => {
      try {
        const headers = await buildAuthHeaders();
        const res = await fetch('/api/marketing/opt-in', { headers });
        if (res.ok) {
          const data = await res.json();
          setMarketingOptIn(Boolean(data.optIn));
        }
      } catch {
        // leave as false
      } finally {
        setIsFetchingOptIn(false);
      }
    };
    fetchOptIn();
  }, []);

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
    <Stack spacing={3}>
      {/* Profile card */}
      <Card>
        <CardContent>
          <Stack spacing={3}>
            <Stack direction="row" spacing={2.5} alignItems="center">
              <Avatar src={userAvatar} alt={displayName} sx={{ width: 72, height: 72 }} />
              <Stack spacing={0.5}>
                <Typography variant="h6">{displayName}</Typography>
                <Typography variant="body2" color="text.secondary">{userEmail}</Typography>
              </Stack>
            </Stack>

            <Divider />

            <Stack spacing={1.5}>
              <Row label={t('Display name')} value={displayName} />
              <Row label={t('Email')} value={userEmail} />
              <Row label={t('Account created')} value={createdAt} />
              <Row
                label={t('Auth provider')}
                value={authProvider.charAt(0).toUpperCase() + authProvider.slice(1)}
              />
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* Notifications card */}
      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="subtitle1" fontWeight={600}>{t('Notifications')}</Typography>

            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{
                p: 2,
                borderRadius: 2,
                border: `1px solid ${theme.palette.divider}`,
                bgcolor: marketingOptIn
                  ? alpha(theme.palette.primary.main, 0.04)
                  : 'transparent',
                transition: 'background-color 0.2s',
              }}
            >
              <Stack direction="row" spacing={2} alignItems="center">
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: marketingOptIn
                      ? alpha(theme.palette.primary.main, 0.12)
                      : alpha(theme.palette.text.primary, 0.06),
                    transition: 'background-color 0.2s',
                  }}
                >
                  <Iconify
                    icon="solar:mailbox-bold"
                    width={22}
                    sx={{
                      color: marketingOptIn ? 'primary.main' : 'text.secondary',
                      transition: 'color 0.2s',
                    }}
                  />
                </Box>

                <Stack spacing={0.25}>
                  <Typography variant="body2" fontWeight={500}>
                    {t('Product updates')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {t('New features, improvements, and announcements sent to')}{' '}
                    <Typography component="span" variant="caption" fontWeight={500} color="text.primary">
                      {userEmail}
                    </Typography>
                  </Typography>
                </Stack>
              </Stack>

              {isFetchingOptIn ? (
                <Skeleton variant="rounded" width={44} height={24} sx={{ borderRadius: 3, flexShrink: 0 }} />
              ) : (
                <Switch
                  checked={marketingOptIn}
                  onChange={(e) => handleMarketingToggle(e.target.checked)}
                  disabled={isSaving}
                  sx={{ flexShrink: 0 }}
                />
              )}
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="center">
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="body2">{value}</Typography>
    </Stack>
  );
}
