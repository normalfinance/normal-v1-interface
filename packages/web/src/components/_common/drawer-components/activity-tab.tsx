'use client';

import type { Activity } from '@/types/activity';

import { useTranslate } from '@/locales';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import { ActivityRow } from './activity-row';

export interface ActivityTabsProps {
  activity?: Activity[];
}
export default function ActivityTab({ activity = [] }: { activity?: Activity[] }) {
  const { t } = useTranslate();
  const sorted = [...activity].sort((a, b) => b.timestamp - a.timestamp);

  if (sorted.length === 0) {
    return (
      <Box sx={{ pb: 2, bgcolor: 'background.paper' }}>
        <Typography variant="body2" color="text.secondary">
          {t('No activity yet')}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 2, bgcolor: 'background.paper' }}>
      {sorted.map((item) => (
        <Box key={item.id} py={2}>
          <ActivityRow activity={item} />
        </Box>
      ))}
    </Box>
  );
}
