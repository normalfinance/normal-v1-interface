'use client';

import { useEffect } from 'react';
import { paths } from '@/routes/paths';
import { useTranslate } from '@/locales';
import { DashboardContent } from '@/layouts/dashboard';
import { useAppStore } from '@normalfinance/state';

import Grid2 from '@mui/material/Grid2';
import { Box, Card, Chip, Stack, Table, Paper, TableRow, Typography, TableBody, TableCell, TableHead, TableContainer, CircularProgress } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';

import { useIndexes } from '@/hooks';
import { createIndexSummary, getIndexStatusLabel, getIndexStatusColor } from '@/utils/index-mapper';
import { fCurrency, fShortenNumber } from '@/utils/format-number';
import { RouterLink } from '@/routes/components';

export default function IndexesView() {
  const { t } = useTranslate();
  const theme = useTheme();

  const { globalIsLoading, setGlobalIsLoading } = useAppStore();
  const { indexes, totalCount, loading, error, fetchIndexes } = useIndexes();

  // Effect hook to set global loading state
  useEffect(() => {
    setGlobalIsLoading(loading);
  }, [loading, setGlobalIsLoading]);

  const indexSummaries = indexes.map((idx) =>
    createIndexSummary(idx.info, idx.address, idx.sequence)
  );

  return (
    <Box sx={{ bgcolor: 'grey.100', minHeight: '100dvh' }}>
      <DashboardContent maxWidth="xl">
        <Stack spacing={1}>
          <Typography variant="h4" color="text.primary">
            {t('Indexes')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('Browse and invest in index funds')}
          </Typography>
        </Stack>

        {/* Stats */}
        <Grid2 container spacing={3} sx={{ mt: 3 }}>
          <Grid2 size={{ xs: 12, sm: 6, md: 4 }}>
            <Card
              sx={{
                p: 3,
                borderRadius: 3,
                border: 1,
                borderColor: alpha(theme.palette.grey[500], 0.32),
              }}
            >
              <Typography variant="subtitle2" color="text.secondary">
                {t('Total Indexes')}
              </Typography>
              <Typography variant="h4">{fShortenNumber(totalCount)}</Typography>
            </Card>
          </Grid2>
          <Grid2 size={{ xs: 12, sm: 6, md: 4 }}>
            <Card
              sx={{
                p: 3,
                borderRadius: 3,
                border: 1,
                borderColor: alpha(theme.palette.grey[500], 0.32),
              }}
            >
              <Typography variant="subtitle2" color="text.secondary">
                {t('Active Indexes')}
              </Typography>
              <Typography variant="h4">
                {indexSummaries.filter((s) => s.status.canMint && s.status.canRedeem).length}
              </Typography>
            </Card>
          </Grid2>
          <Grid2 size={{ xs: 12, sm: 6, md: 4 }}>
            <Card
              sx={{
                p: 3,
                borderRadius: 3,
                border: 1,
                borderColor: alpha(theme.palette.grey[500], 0.32),
              }}
            >
              <Typography variant="subtitle2" color="text.secondary">
                {t('Public Indexes')}
              </Typography>
              <Typography variant="h4">
                {indexSummaries.filter((s) => s.isPublic).length}
              </Typography>
            </Card>
          </Grid2>
        </Grid2>

        {/* Indexes Table */}
        <Grid2 sx={{ mt: 3 }}>
          <Paper sx={{ width: '100%', overflow: 'auto' }}>
            <Card
              sx={{
                borderRadius: 3,
                border: 1,
                borderColor: alpha(theme.palette.grey[500], 0.32),
              }}
            >
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                  <CircularProgress />
                </Box>
              ) : error ? (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                  <Typography color="error">{t('Error loading indexes')}</Typography>
                </Box>
              ) : indexes.length === 0 ? (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                  <Typography color="text.secondary">{t('No indexes found')}</Typography>
                </Box>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ backgroundColor: alpha(theme.palette.grey[500], 0.08) }}>
                        <TableCell>{t('Index')}</TableCell>
                        <TableCell align="right">{t('Total Shares')}</TableCell>
                        <TableCell align="right">{t('Base NAV')}</TableCell>
                        <TableCell align="right">{t('Total Mints')}</TableCell>
                        <TableCell align="center">{t('Status')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {indexSummaries.map((summary) => (
                        <TableRow
                          key={summary.address}
                          hover
                          component={RouterLink}
                          href={paths.indexes.details(summary.address)}
                          sx={{
                            textDecoration: 'none',
                            cursor: 'pointer',
                            '&:hover': {
                              backgroundColor: alpha(theme.palette.primary.main, 0.04),
                            },
                          }}
                        >
                          <TableCell>
                            <Stack>
                              <Typography variant="subtitle2">
                                Index #{summary.sequence}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {summary.address.slice(0, 8)}...{summary.address.slice(-6)}
                              </Typography>
                            </Stack>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2">
                              {fShortenNumber(summary.totalShares)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2">
                              {fShortenNumber(summary.baseNav)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2">
                              {fShortenNumber(summary.totalMints)}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={getIndexStatusLabel(indexes.find((i) => i.address === summary.address)!.info)}
                              color={getIndexStatusColor(indexes.find((i) => i.address === summary.address)!.info)}
                              size="small"
                              sx={{
                                borderRadius: 9999,
                                px: 1,
                                height: 28,
                              }}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Card>
          </Paper>
        </Grid2>
      </DashboardContent>
    </Box>
  );
}
