'use client';

import { useTranslate } from '@/locales';
import { useSupabaseAuth } from '@/providers/SupabaseAuthProvider';
import { cdn } from '@normalfinance/utils';

import Avatar from '@mui/material/Avatar';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';

export function SettingsGeneral() {
  const { t } = useTranslate();
  const { session } = useSupabaseAuth();

  if (!session?.user) {
    return null;
  }

  const user = session.user;
  const userMetadata = user.user_metadata as
    | { picture?: string; avatar_url?: string; name?: string }
    | undefined;
  const userEmail = user.email ?? '';
  const userAvatar = userMetadata?.picture || userMetadata?.avatar_url || cdn('logo/logo-single.svg');
  const displayName = userMetadata?.name || userEmail || 'User';
  const createdAt = user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A';
  const authProvider = user.app_metadata?.provider || 'email';

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
        </Stack>
      </CardContent>
    </Card>
  );
}

