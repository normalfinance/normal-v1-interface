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

// ----------------------------------------------------------------------

const CardBox = ({ children }: { children: React.ReactNode }) => (
  <Box
    sx={{
      p: '22px',
      borderRadius: '22px',
      border: '1px solid rgba(10,10,15,0.08)',
      bgcolor: '#FFFFFF',
    }}
  >
    {children}
  </Box>
);

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
    <Stack spacing={2}>
      {/* Profile card */}
      <CardBox>
        {/* Avatar + name */}
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: '20px' }}>
          <Avatar src={userAvatar} alt={displayName} sx={{ width: 64, height: 64 }} />
          <Box>
            <Typography sx={{ fontSize: '16px', fontWeight: 700, color: '#0A0A0F', letterSpacing: '-0.01em' }}>
              {displayName}
            </Typography>
            <Typography sx={{ fontSize: '13px', color: 'rgba(10,10,15,0.5)', mt: '2px' }}>
              {userEmail}
            </Typography>
          </Box>
        </Stack>

        <Box sx={{ height: '1px', bgcolor: 'rgba(10,10,15,0.06)', mb: '20px' }} />

        {/* Details rows */}
        <Stack spacing={0}>
          <InfoRow label={t('Display name')} value={displayName} />
          <InfoRow label={t('Email')} value={userEmail} />
          <InfoRow label={t('Account created')} value={createdAt} />
          <InfoRow
            label={t('Auth provider')}
            value={authProvider.charAt(0).toUpperCase() + authProvider.slice(1)}
            last
          />
        </Stack>
      </CardBox>

      {/* Notifications card */}
      <CardBox>
        <Typography sx={{ fontSize: '14px', fontWeight: 600, color: '#0A0A0F', mb: '16px' }}>
          {t('Notifications')}
        </Typography>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: '14px 16px',
            borderRadius: '14px',
            bgcolor: '#FAFAFB',
            border: '1px solid rgba(10,10,15,0.08)',
            gap: '12px',
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flex: 1, minWidth: 0 }}>
            <Box
              sx={{
                width: 38,
                height: 38,
                borderRadius: '10px',
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
                sx={{ color: marketingOptIn ? '#0A0A0F' : 'rgba(10,10,15,0.35)', transition: 'color 200ms ease' }}
              />
            </Box>

            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: '13px', fontWeight: 500, color: '#0A0A0F' }}>
                {t('Product updates')}
              </Typography>
              <Typography sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.5)', mt: '2px', lineHeight: 1.4 }}>
                {t('New features and announcements sent to')}{' '}
                <Box component="span" sx={{ color: '#0A0A0F', fontWeight: 500 }}>
                  {userEmail}
                </Box>
              </Typography>
            </Box>
          </Stack>

          {isFetchingOptIn ? (
            <Skeleton variant="rounded" width={44} height={24} sx={{ borderRadius: '12px', flexShrink: 0 }} />
          ) : (
            <Switch
              checked={marketingOptIn}
              onChange={(e) => handleMarketingToggle(e.target.checked)}
              disabled={isSaving}
              sx={{
                flexShrink: 0,
                '& .MuiSwitch-switchBase.Mui-checked': {
                  color: '#0A0A0F',
                  '& + .MuiSwitch-track': { bgcolor: '#0A0A0F' },
                },
              }}
            />
          )}
        </Box>
      </CardBox>
    </Stack>
  );
}

function InfoRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        py: '12px',
        borderBottom: last ? 'none' : '1px solid rgba(10,10,15,0.06)',
      }}
    >
      <Typography sx={{ fontSize: '13px', color: 'rgba(10,10,15,0.5)' }}>{label}</Typography>
      <Typography sx={{ fontSize: '13px', fontWeight: 500, color: '#0A0A0F' }}>{value}</Typography>
    </Box>
  );
}
