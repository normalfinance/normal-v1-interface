'use client';

import Box from '@mui/material/Box';

import { HAIRLINE, COLUMN_SX } from '@/components/_common/brand';
import { PartnerStrip } from '@/components/_common/partner-strip';

// ----------------------------------------------------------------------

/** Who stands behind Normal and what Savings is built on: the shared strip, under the mission. */
export function AboutPartners() {
  return (
    <Box component="section" aria-label="Backers and partners" sx={{ borderTop: HAIRLINE }}>
      <Box sx={COLUMN_SX}>
        <PartnerStrip />
      </Box>
    </Box>
  );
}
