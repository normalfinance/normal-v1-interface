'use client';

import { TYPE } from '@/theme/type-scale';
import { GUTTER_SX, COLUMN_SX } from '@/theme/site-grid';
import { INK, HAIRLINE_COLOR } from '@/theme/brand-colors';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import { Backers } from '@/components/_common/backers';
import { StatementWord as Word } from '@/components/_common/brand';

// ----------------------------------------------------------------------

/** Who backs Normal, straight under the hero; then what Normal is, in one statement. */
export function HomeIntro() {
  return (
    <>
      <Box
        component="section"
        aria-label="Backers and auditors"
        sx={{
          // On phones the hero's words sit above the strip, so it draws its own
          // top line; on wider screens the photo's edge is that line.
          borderTop: { xs: `1px solid ${HAIRLINE_COLOR}`, md: 'none' },
          borderBottom: `1px solid ${HAIRLINE_COLOR}`,
        }}
      >
        <Box sx={COLUMN_SX}>
          <Backers />
        </Box>
      </Box>

      <Box component="section" aria-label="What Normal is">
        <Box
          sx={{
            ...COLUMN_SX,
            ...GUTTER_SX,
            py: 'var(--section-y)',
            textAlign: 'center',
          }}
        >
          <Typography sx={{ ...TYPE.statement, mx: 'auto', maxWidth: 1040, color: INK }}>
            The easiest <Word n={0}>crypto app</Word> to use, made for everyday people.{' '}
            <Word n={1}>Add money</Word>, <Word n={2}>send</Word> it anywhere and keep it{' '}
            <Word n={3}>self-custodial</Word>, in your own hands. Only{' '}
            <Word n={4}>assets that hold value</Word>, with <Word n={5}>Savings</Word> that earn
            daily.
          </Typography>
        </Box>
      </Box>
    </>
  );
}
