'use client';

import type { Activity } from '@/types/activity';

import Box from '@mui/material/Box';

import { ActivityRow } from './activity-row';

export interface ActivityTabsProps {
  activity?: Activity[];
}
export default function ActivityTab({ activity = [] }: { activity?: Activity[] }) {
  return (
    <Box sx={{ p: 2, pt: 0 }}>
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
