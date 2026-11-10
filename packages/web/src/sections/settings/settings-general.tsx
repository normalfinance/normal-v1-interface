'use client';

import { useTranslate } from '@/locales';
import { cdn } from '@normalfinance/utils';
import { useState, useEffect } from 'react';
import { buildAuthHeaders } from '@/utils/http';
import { supabase } from '@/lib/createSupabaseClient';
import { useSupabaseAuth } from '@/providers/SupabaseAuthProvider';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Switch from '@mui/material/Switch';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';

import { Iconify } from '@/components/template/iconify';
import { useSnackbar } from '@/components/template/snackbar';
import { RowList, AppBlock, appLocale } from '@/components/_common/app-ui';

// ----------------------------------------------------------------------

export function SettingsGeneral() {
  const { t } = useTranslate();
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
  const createdAt = user.created_at
    ? new Date(user.created_at).toLocaleDateString(appLocale(), {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'N/A';
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
    <Stack spacing={2}>
      {/* Profile: an open list, the person first, then their details (each
          row draws the line under itself, as every list in the app). */}
      <AppBlock flush open title={t('Profile')}>
        <Stack className="nf-row" direction="row" spacing={2} alignItems="center" sx={{ py: 2 }}>
          <Avatar src={userAvatar} alt={displayName} sx={{ width: 64, height: 64 }} />
          <Box>
            <Typography
              sx={{ fontSize: '16px', fontWeight: 500, color: '#0A0A0F', letterSpacing: '-0.01em' }}
            >
              {displayName}
            </Typography>
            {/* Without a name the email is already the line above: say it once. */}
            {userEmail && userEmail !== displayName && (
              <Typography sx={{ fontSize: '13px', color: '#6B6B76', mt: '2px' }}>
                {userEmail}
              </Typography>
            )}
          </Box>
        </Stack>

        <RowList>
          <InfoRow label={t('Display name')} value={displayName} />
          <InfoRow label={t('Email')} value={userEmail} />
          <InfoRow label={t('Account created')} value={createdAt} />
          <InfoRow
            label={t('Auth provider')}
            value={authProvider.charAt(0).toUpperCase() + authProvider.slice(1)}
          />
        </RowList>
      </AppBlock>

      {/* Emails */}
      <AppBlock flush open title={t('Emails')}>
        <Box
          className="nf-row"
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            py: 1.75,
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flex: 1, minWidth: 0 }}>
            <Box
              sx={{
                width: 38,
                height: 38,
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: marketingOptIn ? 'rgba(10,10,15,0.08)' : 'rgba(10,10,15,0.04)',
                flexShrink: 0,
                transition: 'background 200ms ease',
              }}
            >
              <Iconify
                icon="solar:mailbox-bold"
                width={20}
                sx={{
                  color: marketingOptIn ? '#0A0A0F' : '#9A9AA3',
                  transition: 'color 200ms ease',
                }}
              />
            </Box>

            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: '13px', fontWeight: 500, color: '#0A0A0F' }}>
                {t('Product updates')}
              </Typography>
              <Typography sx={{ fontSize: '12px', color: '#6B6B76', mt: '2px', lineHeight: 1.4 }}>
                {t('New features and announcements sent to')}{' '}
                <Box component="span" sx={{ color: '#0A0A0F', fontWeight: 500 }}>
                  {userEmail}
                </Box>
              </Typography>
            </Box>
          </Stack>

          {isFetchingOptIn ? (
            <Skeleton
              variant="rounded"
              width={44}
              height={24}
              sx={{ borderRadius: 'var(--radius-md)', flexShrink: 0 }}
            />
          ) : (
            <Switch
              checked={marketingOptIn}
              onChange={(e) => handleMarketingToggle(e.target.checked)}
              disabled={isSaving}
              sx={{
                flexShrink: 0,
                // MUI pads the switch by 12px; pull it out so the track lines up
                // with the values above (the right edge of the list).
                mr: '-12px',
                '& .MuiSwitch-switchBase.Mui-checked': {
                  color: '#0A0A0F',
                  '& + .MuiSwitch-track': { bgcolor: '#0A0A0F' },
                },
              }}
            />
          )}
        </Box>
      </AppBlock>
    </Stack>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <Box
      className="nf-row"
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 2,
        minHeight: 52,
        px: { xs: '20px', md: '24px' },
        py: 1,
      }}
    >
      <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>{label}</Typography>
      <Typography sx={{ fontSize: 14, fontWeight: 500, color: 'text.primary', textAlign: 'right' }}>
        {value}
      </Typography>
    </Box>
  );
}
