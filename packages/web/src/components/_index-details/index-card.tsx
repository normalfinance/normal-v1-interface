'use client';

import type { IndexDetails } from '@normalfinance/types';
import { Card, Stack, Typography, Avatar, Box, Chip } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { fCurrency, fPercent } from '@/utils/format-number';
import { groupAccentByIndex, groupAccentDarkByIndex } from '@/theme/accents';

export interface IndexCardProps {
  index: IndexDetails;
  highlightType?: 'staff-pick' | 'trending' | 'gainer';
  onClick?: () => void;
}

export function IndexCard({ index, highlightType, onClick }: IndexCardProps) {
  const theme = useTheme();

  const highlightMap: Record<
    NonNullable<IndexCardProps['highlightType']>,
    { label: string; color: 'primary' | 'secondary' | 'success' }
  > = {
    'staff-pick': { label: 'Staff Pick', color: 'secondary' },
    trending: { label: 'Trending', color: 'primary' },
    gainer: { label: 'Top Gainer', color: 'success' },
  };

  const highlight = highlightType ? highlightMap[highlightType] : undefined;

  const largest = [...index.constituents].sort((a, b) => b.weightPct - a.weightPct)[0];

  return (
    <Card
      onClick={onClick}
      sx={{
        p: 3,
        borderRadius: 3,
        border: 1,
        borderColor: alpha(theme.palette.grey[500], 0.24),
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        transition: 'all 0.2s ease',
        cursor: 'pointer',
        '&:hover': {
          boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
          transform: 'translateY(-2px)',
        },
        minHeight: 240,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Avatar src={largest?.icon} sx={{ width: 40, height: 40 }} />
          <Box>
            <Typography variant="subtitle1" fontWeight={600}>
              {index.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {index.coinCount} Coins · {index.weighting.label}
            </Typography>
          </Box>
        </Stack>
        {highlight && (
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              px: 1,
              py: 0.5,
              borderRadius: 1,
              bgcolor: alpha(
                highlightType === 'staff-pick'
                  ? groupAccentByIndex(1)
                  : highlightType === 'trending'
                    ? groupAccentByIndex(2)
                    : groupAccentByIndex(3),
                0.1
              ),
              width: 'fit-content',
              whiteSpace: 'nowrap',
              alignSelf: 'start',
            }}
          >
            <Typography
              variant="subtitle2"
              fontWeight={500}
              sx={{
                lineHeight: 1.3,
                color:
                  highlightType === 'staff-pick'
                    ? groupAccentDarkByIndex(1)
                    : highlightType === 'trending'
                      ? groupAccentDarkByIndex(2)
                      : groupAccentDarkByIndex(3),
              }}
            >
              {highlight.label}
            </Typography>
          </Box>
        )}
      </Stack>

      {/* Stats */}
      <Stack direction="row" justifyContent="space-between" mt={2}>
        <Box>
          <Typography variant="caption" color="text.secondary">
            Price
          </Typography>
          <Typography variant="body2" fontWeight={600}>
            {fCurrency(index.priceUsd)}
          </Typography>
        </Box>

        <Box>
          <Typography variant="caption" color="text.secondary">
            24h Change
          </Typography>
          <Typography
            variant="body2"
            fontWeight={600}
            color={index.priceChangePct24h >= 0 ? 'success.main' : 'error.main'}
          >
            {fPercent(index.priceChangePct24h)}
          </Typography>
        </Box>

        <Box>
          <Typography variant="caption" color="text.secondary">
            TVL
          </Typography>
          <Typography variant="body2" fontWeight={600}>
            {fCurrency(index.tvlUsd)}
          </Typography>
        </Box>
      </Stack>
    </Card>
  );
}
