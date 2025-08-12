'use client';

import type { IndexDetails, StateToken as Token } from '@normalfinance/types';

import * as React from 'react';
import { useTranslate } from '@/locales';

import { alpha, useTheme } from '@mui/material/styles';
import {
  Box,
  Table,
  Dialog,
  Button,
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

/** Props */
export interface IndexPurchaseReviewDialogProps {
  open: boolean;
  onClose: () => void;
  index: IndexDetails;
  amountUsd: number; // parsed fiat value
  paymentToken?: Token | null; // XLM or USDC
  destinationLabel: string; // effective destination shown to user
}

/** Small helper formatters */
const fmtCurrency = (v: number) =>
  v.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

const fmtNum = (v: number, max = 6) =>
  Number.isFinite(v) ? v.toLocaleString(undefined, { maximumFractionDigits: max }) : '—';

/** Minimalist table for breakdown */
function AllocationTable({ index, investmentUsd }: { index: IndexDetails; investmentUsd: number }) {
  const { t } = useTranslate();
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down('sm'));
  const rows = [...index.constituents].sort((a, b) => b.weightPct - a.weightPct);

  return (
    <TableContainer
      sx={{
        mt: 2,
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
          },
          '& th:first-of-type, & td:first-of-type': { pl: 2 },
          '& th:last-of-type, & td:last-of-type': { pr: 2 },
        }}
      >
        <TableHead>
          <TableRow sx={{ '& th': { fontWeight: 600, color: 'text.secondary' } }}>
            <TableCell>{t('Asset')}</TableCell>
            <TableCell align="right">{isXs ? 'Wgt %' : 'Weight (%)'}</TableCell>
            <TableCell align="right">{isXs ? 'USD' : 'Allocation (USD)'}</TableCell>
            <TableCell align="right">{isXs ? 'Units' : 'Est. Units'}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((tok) => {
            const allocationUsd = (tok.weightPct / 100) * investmentUsd;
            const hasPrice = typeof tok.usdValue === 'number' && tok.usdValue! > 0;
            const estUnits = hasPrice ? allocationUsd / (tok.usdValue as number) : NaN;

            return (
              <TableRow key={`${tok.id}-${tok.shortname}`} hover>
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
                <TableCell align="right" sx={{ py: 1.25 }}>
                  {fmtCurrency(allocationUsd)}
                </TableCell>
                <TableCell align="right" sx={{ py: 1.25, color: 'text.secondary' }}>
                  {hasPrice ? `${fmtNum(estUnits)} ${tok.shortname}` : '—'}
                </TableCell>
              </TableRow>
            );
          })}
          {/* Optional total row */}
          <TableRow>
            <TableCell />
            <TableCell />
            <TableCell align="right" sx={{ fontWeight: 600 }}>
              {fmtCurrency(investmentUsd)}
            </TableCell>
            <TableCell />
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  );
}

/** Main dialog */
export default function IndexPurchaseReviewDialog({
  open,
  onClose,
  index,
  amountUsd,
  paymentToken,
  destinationLabel,
}: IndexPurchaseReviewDialogProps) {
  const { t } = useTranslate();
  const theme = useTheme();

  const indexTokens =
    typeof index.priceUsd === 'number' && index.priceUsd > 0 ? amountUsd / index.priceUsd : NaN;

  return (
    <Dialog open={open} onClose={onClose} scroll="paper" fullWidth maxWidth="sm">
      <DialogTitle>{t('Review Index Purchase')}</DialogTitle>

      <DialogContent dividers>
        <Box sx={{ display: 'grid', rowGap: 1, mb: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {t('Index')}
          </Typography>
          <Typography variant="body1" sx={{ fontWeight: 600 }}>
            {index.name}
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            {t('Destination')}
          </Typography>
          <Typography variant="body1" sx={{ wordBreak: 'break-all' }}>
            {destinationLabel}
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            {t('Investment')}
          </Typography>
          <Typography variant="body1">
            {fmtCurrency(amountUsd)} {paymentToken ? `(${paymentToken.symbol})` : ''}
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            {t('Est. Index Tokens Received')}
          </Typography>
          <Typography variant="body1">
            {Number.isFinite(indexTokens) ? `${fmtNum(indexTokens)} ${index.name ?? ''}` : '—'}
          </Typography>
        </Box>

        <Typography variant="subtitle2" sx={{ mt: 2 }}>
          {t('Asset Allocation')}
        </Typography>

        <AllocationTable index={index} investmentUsd={amountUsd} />
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="outlined">
          {t('Close')}
        </Button>
        <Button onClick={onClose} variant="contained" color="primary">
          {t('Confirm Buy')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
