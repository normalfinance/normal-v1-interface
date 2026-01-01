'use client';

import type { LeaderboardRanking } from '@/hooks/use-leaderboard';

import { paths } from '@/routes/paths';
import { useTranslate } from '@/locales';
import { useRouter } from 'next/navigation';
import { fCurrency, fShortenNumber } from '@/utils/format-number';

import { alpha, useTheme } from '@mui/material/styles';
import {
  Box,
  Card,
  Chip,
  Table,
  Stack,
  TableRow,
  TableBody,
  TableCell,
  TableHead,
  Typography,
  IconButton,
  Pagination,
  TableContainer,
} from '@mui/material';

import { Iconify } from '@/components/template/iconify';

interface LeaderboardTableProps {
  rankings: LeaderboardRanking[];
  loading: boolean;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function LeaderboardTable({
  rankings,
  loading,
  page,
  totalPages,
  onPageChange,
}: LeaderboardTableProps) {
  const { t } = useTranslate();
  const theme = useTheme();
  const router = useRouter();

  const handleRowClick = (address: string) => {
    router.push(paths.indexes.details(address));
  };

  const formatBigNumber = (value: string): string => {
    try {
      const num = parseFloat(value) / 10 ** 7;
      return fShortenNumber(num);
    } catch {
      return '0';
    }
  };

  const formatNetFlow = (value: string): { display: string; isPositive: boolean } => {
    try {
      const num = parseFloat(value) / 10 ** 7;
      const isPositive = num >= 0;
      return {
        display: `${isPositive ? '+' : ''}${fShortenNumber(num)}`,
        isPositive,
      };
    } catch {
      return { display: '0', isPositive: true };
    }
  };

  const getRankDisplay = (rank: number) => {
    if (rank === 1) return { icon: 'noto:1st-place-medal', color: 'gold' };
    if (rank === 2) return { icon: 'noto:2nd-place-medal', color: 'silver' };
    if (rank === 3) return { icon: 'noto:3rd-place-medal', color: '#cd7f32' };
    return null;
  };

  return (
    <Card
      sx={{
        borderRadius: 3,
        border: 1,
        borderColor: alpha(theme.palette.grey[500], 0.32),
      }}
    >
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: alpha(theme.palette.grey[500], 0.08) }}>
              <TableCell width={80}>{t('Rank')}</TableCell>
              <TableCell>{t('Index')}</TableCell>
              <TableCell>{t('Manager')}</TableCell>
              <TableCell align="right">{t('TVL')}</TableCell>
              <TableCell align="right">{t('Total Deposits')}</TableCell>
              <TableCell align="right">{t('Net Flow')}</TableCell>
              <TableCell align="center">{t('Status')}</TableCell>
              <TableCell width={60} />
            </TableRow>
          </TableHead>
          <TableBody>
            {rankings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                  <Typography color="text.secondary">{t('No index funds found')}</Typography>
                </TableCell>
              </TableRow>
            ) : (
              rankings.map((ranking) => {
                const rankDisplay = getRankDisplay(ranking.rank);
                const netFlow = formatNetFlow(ranking.netFlow);

                return (
                  <TableRow
                    key={ranking.id}
                    hover
                    sx={{
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor: alpha(theme.palette.primary.main, 0.04),
                      },
                    }}
                    onClick={() => handleRowClick(ranking.address)}
                  >
                    {/* Rank */}
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        {rankDisplay ? (
                          <Iconify icon={rankDisplay.icon} width={24} />
                        ) : (
                          <Typography variant="subtitle2" sx={{ ml: 0.5 }}>
                            {ranking.rank}
                          </Typography>
                        )}
                      </Stack>
                    </TableCell>

                    {/* Index */}
                    <TableCell>
                      <Stack>
                        <Typography variant="subtitle2">
                          {t('Index #')}
                          {ranking.sequence}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {ranking.address.slice(0, 8)}...{ranking.address.slice(-6)}
                        </Typography>
                      </Stack>
                    </TableCell>

                    {/* Manager */}
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {ranking.managerAddress.slice(0, 6)}...{ranking.managerAddress.slice(-4)}
                      </Typography>
                    </TableCell>

                    {/* TVL */}
                    <TableCell align="right">
                      <Typography variant="body2">
                        {fCurrency(parseFloat(ranking.tvlUsd))}
                      </Typography>
                    </TableCell>

                    {/* Total Deposits */}
                    <TableCell align="right">
                      <Typography variant="body2">{formatBigNumber(ranking.totalMints)}</Typography>
                    </TableCell>

                    {/* Net Flow */}
                    <TableCell align="right">
                      <Typography
                        variant="body2"
                        sx={{
                          color: netFlow.isPositive
                            ? theme.palette.success.main
                            : theme.palette.error.main,
                        }}
                      >
                        {netFlow.display}
                      </Typography>
                    </TableCell>

                    {/* Status */}
                    <TableCell align="center">
                      <Chip
                        label={ranking.isPublic ? t('Public') : t('Private')}
                        color={ranking.isPublic ? 'success' : 'default'}
                        size="small"
                        sx={{
                          borderRadius: 9999,
                          px: 1,
                          height: 28,
                        }}
                      />
                    </TableCell>

                    {/* Action */}
                    <TableCell align="right" sx={{ pr: 1 }}>
                      <IconButton
                        color="default"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRowClick(ranking.address);
                        }}
                      >
                        <Iconify icon="eva:external-link-fill" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, newPage) => onPageChange(newPage)}
            color="primary"
            shape="rounded"
          />
        </Box>
      )}
    </Card>
  );
}
