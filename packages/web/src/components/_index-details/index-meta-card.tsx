'use client';

import type { IndexDetails } from '@normalfinance/types';

import { format } from 'date-fns';
import { useTranslate } from '@/locales';
import { useMemo, useState } from 'react';

import { alpha, useTheme } from '@mui/material/styles';
import {
  Box,
  Card,
  Stack,
  Table,
  Button,
  Dialog,
  Divider,
  TableRow,
  TableBody,
  TableCell,
  TableHead,
  Typography,
  DialogTitle,
  DialogContent,
  DialogActions,
  useMediaQuery,
  TableContainer,
} from '@mui/material';

interface Props {
  index: IndexDetails;
}

/** Reusable minimalist table for token rows */
function ConstituentsTable({
  rows,
  showHead = true,
}: {
  rows: IndexDetails['constituents'];
  showHead?: boolean;
}) {
  const { t } = useTranslate();
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <TableContainer
      sx={{
        border: '1px solid',
        borderColor: alpha(theme.palette.grey[500], 0.18),
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      <Table
        size="small"
        sx={{
          '& th, & td': {
            borderBottom: `1px solid ${alpha(theme.palette.text.primary, 0.08)}`,
            borderColor: alpha(theme.palette.divider, 0.6),
          },
          '& th:first-of-type, & td:first-of-type': { pl: 2 },
          '& th:last-of-type, & td:last-of-type': { pr: 2 },
        }}
      >
        {showHead && (
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 600, color: 'text.secondary' } }}>
              <TableCell>{t('Asset')}</TableCell>
              <TableCell align="right">{isXs ? 'Wgt %' : 'Weight (%)'}</TableCell>
            </TableRow>
          </TableHead>
        )}
        <TableBody>
          {rows.map((tok) => (
            <TableRow key={tok.id} hover>
              <TableCell sx={{ py: 1.25 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    component="img"
                    src={tok.icon}
                    alt={tok.shortname}
                    sx={{ width: 20, height: 20, borderRadius: 9999, flexShrink: 0 }}
                  />
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {tok.shortname}
                  </Typography>
                </Box>
              </TableCell>
              <TableCell align="right" sx={{ py: 1.25, color: 'text.secondary' }}>
                {tok.weightPct.toFixed(2)} %
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default function IndexMetaCard({ index }: Props) {
  const { t } = useTranslate();
  const fmt = (iso: string) => format(new Date(iso), 'yyyy-MM-dd');
  const theme = useTheme();

  const [dialogOpen, setDialogOpen] = useState(false);

  const isEqualWeighting =
    index.weighting?.type === 'EQUAL' || index.weighting?.label?.toLowerCase().includes('equal');

  // Sorted list + largest/smallest for display
  const { largest, smallest, allTokensSorted } = useMemo(() => {
    const sorted = [...index.constituents].sort((a, b) => b.weightPct - a.weightPct);

    if (sorted.length === 0) {
      return {
        largest: null as IndexDetails['constituents'][number] | null,
        smallest: null as IndexDetails['constituents'][number] | null,
        allTokensSorted: sorted,
      };
    }

    const lg = sorted[0];
    const sm = sorted[sorted.length - 1];
    const smallestFinal = lg.id === sm.id ? null : sm;

    return {
      largest: lg,
      smallest: smallestFinal,
      allTokensSorted: sorted,
    };
  }, [index.constituents]);

  // Truncate table to first 5, show dialog for full list
  const MAX_SHOW = 5;
  const needsTruncate = allTokensSorted.length > MAX_SHOW;
  const displayedRows = needsTruncate ? allTokensSorted.slice(0, MAX_SHOW) : allTokensSorted;

  return (
    <>
      <Card
        sx={{
          p: 4,
          borderRadius: 3,
          alignItems: 'center',
          border: 1,
          borderColor: alpha(theme.palette.grey[500], 0.32),
        }}
      >
        <Stack spacing={1.5}>
          {/* Index Name and Description */}
          <Typography variant="h6">{index.name}</Typography>
          <Typography variant="body2" color="text.secondary">
            {index.description}
          </Typography>

          <Divider flexItem sx={{ my: 1 }} />

          {/* Index Details */}
          <Typography variant="subtitle2">{t('Details')}</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', rowGap: 0.5, columnGap: 2 }}>
            {[
              { label: 'Created', value: fmt(index.creationDate) },
              { label: 'Last update', value: fmt(index.updatedAt) },
              { label: 'Weighting strategy', value: index.weighting.label },
            ].map((row) => (
              <Box key={row.label} sx={{ display: 'contents' }}>
                <Typography variant="body2" color="text.secondary">
                  {row.label}:
                </Typography>
                <Typography
                  variant="body2"
                  fontWeight={700}
                  color="text.primary"
                  sx={{ textAlign: 'right' }}
                >
                  {row.value}
                </Typography>
              </Box>
            ))}
          </Box>

          <Divider flexItem sx={{ my: 1 }} />

          {/* Constituents */}
          <Typography variant="subtitle2">{t('Constituents')}</Typography>

          {/* Non-equal weighting: show Largest/Smallest as simple rows (no table/borders) */}
          {!isEqualWeighting && (
            <>
              {[
                { label: 'Largest asset', token: largest },
                { label: 'Smallest asset', token: smallest },
              ]
                .filter((r) => r.token)
                .map((row) => (
                  <Box
                    key={row.label}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      width: 1,
                      py: 0.75,
                    }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      {row.label}:
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', columnGap: 1 }}>
                      <Box
                        component="img"
                        src={row.token!.icon}
                        alt={row.token!.shortname}
                        sx={{
                          width: 20,
                          height: 20,
                          display: 'inline-block',
                          flexShrink: 0,
                          borderRadius: 9999,
                        }}
                      />
                      <Typography variant="body2" color="text.primary" sx={{ fontWeight: 500 }}>
                        {row.token!.shortname}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {row.token!.weightPct.toFixed(2)} %
                      </Typography>
                    </Box>
                  </Box>
                ))}
            </>
          )}

          {/* All assets table (truncated to 5) */}
          <ConstituentsTable rows={displayedRows} />

          {/* View all button if truncated */}
          {needsTruncate && (
            <Button
              onClick={() => setDialogOpen(true)}
              size="small"
              sx={{ alignSelf: 'flex-end', mt: 1 }}
            >
              {t('View all constituents')}
            </Button>
          )}
        </Stack>
      </Card>

      {/* Dialog showing ALL constituents */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        scroll="paper"
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>{t('All Constituents')}</DialogTitle>
        <DialogContent dividers>
          <ConstituentsTable rows={allTokensSorted} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>{t('Close')}</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
