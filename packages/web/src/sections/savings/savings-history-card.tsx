'use client';

import type { SavingsDepositActivity, SavingsWithdrawActivity } from '@/types/activity';

import { useState } from 'react';
import { CHAINS } from '@/lib/chains/registry';
import { BRAND_COLORS } from '@/theme/brand-colors';
import { useUserActivity } from '@/hooks/stellar/use-user-activity';

import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';
import SavingsOutlined from '@mui/icons-material/SavingsOutlined';
import ChevronLeftRounded from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded';

import { HAIRLINE } from '@/components/_common/brand';
import {
  ListRow,
  RowList,
  RowIcon,
  AppBlock,
  appLocale,
  formatUsd,
  RowsSkeleton,
} from '@/components/_common/app-ui';

// ----------------------------------------------------------------------

const PAGE_SIZE = 10;

type SavingsActivity = SavingsDepositActivity | SavingsWithdrawActivity;

const dateOf = (timestamp: number) =>
  new Date(timestamp).toLocaleDateString(appLocale(), {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

interface SavingsHistoryCardProps {
  walletAddress: string;
}

/**
 * Every move in and out of Savings, newest first, as feed rows: what moved,
 * when, and how much. A row opens the transaction on Stellar's explorer
 * (from the chain registry, so testnet links go to testnet).
 */
export function SavingsHistoryCard({ walletAddress }: SavingsHistoryCardProps) {
  const { recentActivity, isLoading, error: historyError } = useUserActivity(walletAddress);
  const historyFailed = !!historyError && recentActivity.length === 0 && !isLoading;
  const [page, setPage] = useState(1);

  const savingsActivity = recentActivity.filter(
    (a): a is SavingsActivity => a.type === 'Savings Deposit' || a.type === 'Savings Withdraw'
  );

  const totalPages = Math.max(1, Math.ceil(savingsActivity.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageSlice = savingsActivity.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const arrowSx = (disabled: boolean) => ({
    width: 36,
    height: 36,
    borderRadius: 'var(--radius-md)',
    opacity: disabled ? 0.4 : 1,
    '&:hover': disabled ? {} : { bgcolor: 'action.hover' },
  });

  return (
    <AppBlock
      flush
      title="History"
      action={
        historyFailed ? (
          <Typography sx={{ fontSize: 13, color: BRAND_COLORS.yellow.deep }}>
            Couldn&apos;t load. Trying again…
          </Typography>
        ) : undefined
      }
    >
      {isLoading ? (
        <RowsSkeleton rows={3} />
      ) : pageSlice.length === 0 ? (
        <Typography sx={{ py: 5, fontSize: 14, textAlign: 'center', color: 'text.secondary' }}>
          Nothing has moved in or out of Savings yet.
        </Typography>
      ) : (
        <RowList>
          {pageSlice.map((activity) => {
            const deposit = activity.type === 'Savings Deposit';
            const explorer = activity.txHash ? CHAINS.stellar.explorerTx(activity.txHash) : null;
            return (
              <ListRow
                key={activity.id}
                onClick={
                  explorer
                    ? () => window.open(explorer, '_blank', 'noopener,noreferrer')
                    : undefined
                }
                icon={
                  <RowIcon>
                    <SavingsOutlined />
                  </RowIcon>
                }
                title={deposit ? 'Moved to Savings' : 'Moved out of Savings'}
                subtitle={dateOf(Number(activity.timestamp) || 0)}
                value={formatUsd(parseFloat(activity.amount) || 0)}
              />
            );
          })}
        </RowList>
      )}

      {totalPages > 1 && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 1,
            px: { xs: '20px', md: '24px' },
            py: 1.25,
            borderTop: HAIRLINE,
          }}
        >
          <Typography sx={{ mr: 1, fontSize: 13, color: 'text.secondary' }}>
            Page {currentPage} of {totalPages}
          </Typography>
          <ButtonBase
            aria-label="Newer"
            disabled={currentPage === 1}
            onClick={() => setPage(currentPage - 1)}
            sx={arrowSx(currentPage === 1)}
          >
            <ChevronLeftRounded />
          </ButtonBase>
          <ButtonBase
            aria-label="Older"
            disabled={currentPage === totalPages}
            onClick={() => setPage(currentPage + 1)}
            sx={arrowSx(currentPage === totalPages)}
          >
            <ChevronRightRounded />
          </ButtonBase>
        </Box>
      )}
    </AppBlock>
  );
}
