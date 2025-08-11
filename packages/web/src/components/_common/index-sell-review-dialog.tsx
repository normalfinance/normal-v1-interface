'use client';

import * as React from 'react';
import type { IndexDetails, StateToken as Token } from '@normalfinance/types';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';

/** Props for the sell confirmation */
export interface IndexSellReviewDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  index: IndexDetails;

  /** Amount the user entered. If isFiatMode is true -> USD; otherwise -> index token units */
  amountInput: number;
  isFiatMode: boolean;

  /** Optional: where proceeds will be received (e.g., USDC or XLM) */
  payoutToken?: Token | null;
}

/** helpers */
const fmtCurrency = (v: number) =>
  v.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

const fmtNum = (v: number, max = 6) =>
  Number.isFinite(v) ? v.toLocaleString(undefined, { maximumFractionDigits: max }) : '—';

export default function IndexSellReviewDialog({
  open,
  onClose,
  onConfirm,
  index,
  amountInput,
  isFiatMode,
  payoutToken,
}: IndexSellReviewDialogProps) {
  const theme = useTheme();

  // derive token + USD amounts from the input mode
  const indexTokens = React.useMemo(() => {
    if (!index?.priceUsd || index.priceUsd <= 0) return NaN;
    return isFiatMode ? amountInput / index.priceUsd : amountInput;
  }, [amountInput, isFiatMode, index]);

  const proceedsUsd = React.useMemo(() => {
    if (!index?.priceUsd || index.priceUsd <= 0) return NaN;
    return (Number.isFinite(indexTokens) ? indexTokens : 0) * index.priceUsd;
  }, [indexTokens, index]);

  // optional: if a payout token is given (e.g., USDC/XLM), show an estimated receive amount
  const payoutUnits = React.useMemo(() => {
    if (!payoutToken?.usdValue || payoutToken.usdValue <= 0 || !Number.isFinite(proceedsUsd)) {
      return NaN;
    }
    return proceedsUsd / payoutToken.usdValue;
  }, [payoutToken, proceedsUsd]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" scroll="paper">
      <DialogTitle>Confirm Index Sell</DialogTitle>

      <DialogContent dividers>
        <Box sx={{ display: 'grid', rowGap: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Index
          </Typography>
          <Typography variant="body1" sx={{ fontWeight: 600 }}>
            {index.name}
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Amount to sell
          </Typography>
          <Typography variant="body1">
            {isFiatMode
              ? `${fmtCurrency(amountInput)} (≈ ${fmtNum(indexTokens)} ${index.name ?? 'INDEX'})`
              : `${fmtNum(amountInput)} ${index.name ?? 'INDEX'} (≈ ${fmtCurrency(proceedsUsd)})`}
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Estimated proceeds
          </Typography>
          <Typography variant="body1">{fmtCurrency(proceedsUsd)}</Typography>

          {payoutToken && (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                You will receive (estimated)
              </Typography>
              <Typography variant="body1">
                {Number.isFinite(payoutUnits)
                  ? `${fmtNum(payoutUnits)} ${payoutToken.symbol ?? 'TOKEN'}`
                  : '—'}
              </Typography>
            </>
          )}

          <Typography variant="caption" color="text.secondary" sx={{ mt: 2 }}>
            This is an estimate. Final amounts may vary slightly due to pricing and fees.
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="outlined">
          Cancel
        </Button>
        <Button onClick={onConfirm ?? onClose} variant="contained" color="primary">
          Confirm Sell
        </Button>
      </DialogActions>
    </Dialog>
  );
}
