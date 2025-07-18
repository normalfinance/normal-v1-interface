'use client';

import type { Activity } from '@/types/activity';

import { useTranslate } from '@/locales';

import Box from '@mui/material/Box';
import { Alert } from '@mui/material';

import { ActivityRow } from './activity-row';

export interface ActivityTabsProps {
  activity?: Activity[];
}
export default function ActivityTab({ activity = [] }: { activity?: Activity[] }) {
  const { t } = useTranslate();

  return (
    <Box sx={{ p: 2, pt: 0 }}>
      <Alert severity="info">{t('Coming soon')}</Alert>
      {activity
        .sort((a, b) => b.timestamp - a.timestamp)
        .map((item) => (
          <Box py={2}>
            <ActivityRow key={item.id} activity={item} />
          </Box>
        ))}
    </Box>
  );
}
