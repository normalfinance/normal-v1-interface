'use client';

import type { LeaderboardMetric, LeaderboardVisibility } from '@/hooks/use-leaderboard';

import { paths } from '@/routes/paths';
import { useLeaderboard } from '@/hooks';
import { useTranslate } from '@/locales';
import { useState, useEffect } from 'react';
import { RouterLink } from '@/routes/components';
import { useAppStore } from '@normalfinance/state';
import { DashboardContent } from '@/layouts/dashboard';
import { fCurrency, fShortenNumber } from '@/utils/format-number';

import Grid2 from '@mui/material/Grid2';
import { alpha, useTheme } from '@mui/material/styles';
import {
  Box,
  Card,
  Stack,
  Button,
  Select,
  MenuItem,
  Typography,
  InputLabel,
  FormControl,
  CircularProgress,
} from '@mui/material';

import { LeaderboardTable } from '@/components/_leaderboard-components/leaderboard-table';

// ----------------------------------------------------------------------

export default function LeaderboardView() {
  const { t } = useTranslate();
  const theme = useTheme();

  const { setGlobalIsLoading } = useAppStore();

  // Filter state
  const [metric, setMetric] = useState<LeaderboardMetric>('tvl');
  const [visibility, setVisibility] = useState<LeaderboardVisibility>('all');
  const [page, setPage] = useState(1);
  const limit = 20;

  const { rankings, stats, pagination, loading, statsLoading, error, refetch } = useLeaderboard({
    metric,
    visibility,
    page,
    limit,
  });

  // Effect hook to set global loading state
  useEffect(() => {
    setGlobalIsLoading(loading);
  }, [loading, setGlobalIsLoading]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [metric, visibility]);

  const metricLabels: Record<LeaderboardMetric, string> = {
    tvl: t('TVL'),
    deposits: t('Total Deposits'),
    netFlow: t('Net Flow'),
  };

  const visibilityLabels: Record<LeaderboardVisibility, string> = {
    all: t('All Funds'),
    public: t('Public Only'),
    private: t('Private Only'),
  };

  return (
    <Box sx={{ bgcolor: 'grey.100', minHeight: '100dvh' }}>
      <DashboardContent maxWidth="xl">
        {/* Header */}
        <Stack spacing={1}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Box>
              <Typography variant="h4" color="text.primary">
                {t('Index Fund Leaderboard')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('Top performing index funds ranked by key metrics')}
              </Typography>
            </Box>
            <Button
              component={RouterLink}
              href={paths.indexes.root}
              variant="outlined"
              color="inherit"
              sx={{ borderRadius: 2 }}
            >
              {t('View All Indexes')}
            </Button>
          </Stack>
        </Stack>

        {/* Stats */}
        <Grid2 container spacing={3} sx={{ mt: 3 }}>
          <Grid2 size={{ xs: 12, sm: 6, md: 3 }}>
            <Card
              sx={{
                p: 3,
                borderRadius: 3,
                border: 1,
                borderColor: alpha(theme.palette.grey[500], 0.32),
              }}
            >
              <Typography variant="subtitle2" color="text.secondary">
                {t('Total Funds')}
              </Typography>
              <Typography variant="h4">
                {statsLoading ? '-' : fShortenNumber(stats?.totalFunds || 0)}
              </Typography>
            </Card>
          </Grid2>
          <Grid2 size={{ xs: 12, sm: 6, md: 3 }}>
            <Card
              sx={{
                p: 3,
                borderRadius: 3,
                border: 1,
                borderColor: alpha(theme.palette.grey[500], 0.32),
              }}
            >
              <Typography variant="subtitle2" color="text.secondary">
                {t('Public Funds')}
              </Typography>
              <Typography variant="h4">
                {statsLoading ? '-' : fShortenNumber(stats?.publicFunds || 0)}
              </Typography>
            </Card>
          </Grid2>
          <Grid2 size={{ xs: 12, sm: 6, md: 3 }}>
            <Card
              sx={{
                p: 3,
                borderRadius: 3,
                border: 1,
                borderColor: alpha(theme.palette.grey[500], 0.32),
              }}
            >
              <Typography variant="subtitle2" color="text.secondary">
                {t('Private Funds')}
              </Typography>
              <Typography variant="h4">
                {statsLoading ? '-' : fShortenNumber(stats?.privateFunds || 0)}
              </Typography>
            </Card>
          </Grid2>
          <Grid2 size={{ xs: 12, sm: 6, md: 3 }}>
            <Card
              sx={{
                p: 3,
                borderRadius: 3,
                border: 1,
                borderColor: alpha(theme.palette.grey[500], 0.32),
              }}
            >
              <Typography variant="subtitle2" color="text.secondary">
                {t('Total TVL')}
              </Typography>
              <Typography variant="h4">
                {statsLoading ? '-' : fCurrency(parseFloat(stats?.totalTvlUsd || '0'))}
              </Typography>
            </Card>
          </Grid2>
        </Grid2>

        {/* Filters */}
        <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>{t('Rank By')}</InputLabel>
            <Select
              value={metric}
              label={t('Rank By')}
              onChange={(e) => setMetric(e.target.value as LeaderboardMetric)}
              sx={{ borderRadius: 2 }}
            >
              {(Object.keys(metricLabels) as LeaderboardMetric[]).map((key) => (
                <MenuItem key={key} value={key}>
                  {metricLabels[key]}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>{t('Visibility')}</InputLabel>
            <Select
              value={visibility}
              label={t('Visibility')}
              onChange={(e) => setVisibility(e.target.value as LeaderboardVisibility)}
              sx={{ borderRadius: 2 }}
            >
              {(Object.keys(visibilityLabels) as LeaderboardVisibility[]).map((key) => (
                <MenuItem key={key} value={key}>
                  {visibilityLabels[key]}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button
            variant="outlined"
            color="inherit"
            onClick={refetch}
            disabled={loading}
            sx={{ borderRadius: 2 }}
          >
            {t('Refresh')}
          </Button>
        </Stack>

        {/* Table */}
        <Box sx={{ mt: 3 }}>
          {loading ? (
            <Card
              sx={{
                p: 8,
                display: 'flex',
                justifyContent: 'center',
                borderRadius: 3,
                border: 1,
                borderColor: alpha(theme.palette.grey[500], 0.32),
              }}
            >
              <CircularProgress />
            </Card>
          ) : error ? (
            <Card
              sx={{
                p: 4,
                textAlign: 'center',
                borderRadius: 3,
                border: 1,
                borderColor: alpha(theme.palette.grey[500], 0.32),
              }}
            >
              <Typography color="error">{t('Error loading leaderboard')}</Typography>
              <Button onClick={refetch} sx={{ mt: 2 }}>
                {t('Try Again')}
              </Button>
            </Card>
          ) : (
            <LeaderboardTable
              rankings={rankings}
              loading={loading}
              page={page}
              totalPages={pagination.totalPages}
              onPageChange={setPage}
            />
          )}
        </Box>
      </DashboardContent>
    </Box>
  );
}
