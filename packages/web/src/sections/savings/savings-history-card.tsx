'use client';

import type { SavingsDepositActivity, SavingsWithdrawActivity } from '@/types/activity';

import { useState } from 'react';
import { useUserActivity } from '@/hooks/stellar/use-user-activity';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';

const MONO = '"Geist Mono", "Courier New", monospace';
const PAGE_SIZE = 10;

type SavingsActivity = SavingsDepositActivity | SavingsWithdrawActivity;

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatAmount(raw: string): string {
  const n = parseFloat(raw);
  if (Number.isNaN(n)) return '—';
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function TypeBadge({ type }: { type: SavingsActivity['type'] }) {
  const isDeposit = type === 'Savings Deposit';
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignSelf: 'center',
        width: 'fit-content',
        px: '8px',
        py: '3px',
        borderRadius: '6px',
        bgcolor: isDeposit ? 'rgba(26,179,125,0.1)' : 'rgba(245,158,11,0.1)',
        border: `1px solid ${isDeposit ? 'rgba(26,179,125,0.2)' : 'rgba(245,158,11,0.2)'}`,
      }}
    >
      <Typography
        sx={{
          fontSize: '11.5px',
          fontWeight: 500,
          color: isDeposit ? '#1AB37D' : '#D97706',
          lineHeight: 1,
          whiteSpace: 'nowrap',
        }}
      >
        {isDeposit ? 'Deposit' : 'Withdraw'}
      </Typography>
    </Box>
  );
}

function EmptyState() {
  return (
    <Box
      sx={{
        py: '48px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
      }}
    >
      <Box
        sx={{
          width: 44,
          height: 44,
          borderRadius: '12px',
          bgcolor: '#F4F4F7',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: '4px',
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 2v20M2 12h20"
            stroke="rgba(10,10,15,0.25)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </Box>
      <Typography sx={{ fontSize: '14px', fontWeight: 500, color: '#0A0A0F' }}>
        No transactions yet
      </Typography>
      <Typography
        sx={{ fontSize: '13px', color: 'rgba(10,10,15,0.45)', textAlign: 'center', maxWidth: 240 }}
      >
        Your deposits and withdrawals will appear here.
      </Typography>
    </Box>
  );
}

function SkeletonRows() {
  return (
    <>
      {[1, 2, 3].map((i) => (
        <Box
          key={i}
          sx={{
            display: 'grid',
            gridTemplateColumns: '1fr auto 140px 80px',
            alignItems: 'center',
            gap: '16px',
            px: '20px',
            py: '14px',
            borderBottom: '1px solid rgba(10,10,15,0.05)',
          }}
        >
          <Skeleton variant="text" width={80} height={16} />
          <Skeleton variant="rounded" width={62} height={22} sx={{ borderRadius: '6px' }} />
          <Skeleton variant="text" width={90} height={16} sx={{ ml: 'auto' }} />
          <Skeleton variant="text" width={36} height={16} sx={{ ml: 'auto' }} />
        </Box>
      ))}
    </>
  );
}

function PaginationBar({
  page,
  totalPages,
  onPrev,
  onNext,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
  onPage: (p: number) => void;
}) {
  // Show at most 5 page buttons centered around current page
  const range: number[] = [];
  const delta = 2;
  const left = Math.max(1, page - delta);
  const right = Math.min(totalPages, page + delta);
  for (let i = left; i <= right; i++) range.push(i);

  const btnBase = {
    height: 32,
    minWidth: 32,
    px: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '8px',
    fontSize: '13px',
    fontFamily: MONO,
    cursor: 'pointer',
    border: '1px solid transparent',
    bgcolor: 'transparent',
    transition: 'all 0.15s',
    fontWeight: 400,
  };

  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="center"
      spacing={0.5}
      sx={{ px: '20px', py: '14px', borderTop: '1px solid rgba(10,10,15,0.06)' }}
    >
      {/* Prev */}
      <Box
        component="button"
        onClick={onPrev}
        disabled={page === 1}
        sx={{
          ...btnBase,
          color: page === 1 ? 'rgba(10,10,15,0.25)' : 'rgba(10,10,15,0.6)',
          cursor: page === 1 ? 'default' : 'pointer',
          '&:hover': page === 1 ? {} : { bgcolor: '#F4F4F7' },
        }}
      >
        ←
      </Box>

      {left > 1 && (
        <>
          <Box
            component="button"
            onClick={() => onPage(1)}
            sx={{ ...btnBase, color: 'rgba(10,10,15,0.6)', '&:hover': { bgcolor: '#F4F4F7' } }}
          >
            1
          </Box>
          {left > 2 && (
            <Typography sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.3)', px: '4px' }}>
              …
            </Typography>
          )}
        </>
      )}

      {range.map((p) => (
        <Box
          key={p}
          component="button"
          onClick={() => onPage(p)}
          sx={{
            ...btnBase,
            color: p === page ? '#FFFFFF' : 'rgba(10,10,15,0.6)',
            bgcolor: p === page ? '#0A0A0F' : 'transparent',
            borderColor: p === page ? '#0A0A0F' : 'transparent',
            '&:hover': p === page ? {} : { bgcolor: '#F4F4F7' },
          }}
        >
          {p}
        </Box>
      ))}

      {right < totalPages && (
        <>
          {right < totalPages - 1 && (
            <Typography sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.3)', px: '4px' }}>
              …
            </Typography>
          )}
          <Box
            component="button"
            onClick={() => onPage(totalPages)}
            sx={{ ...btnBase, color: 'rgba(10,10,15,0.6)', '&:hover': { bgcolor: '#F4F4F7' } }}
          >
            {totalPages}
          </Box>
        </>
      )}

      {/* Next */}
      <Box
        component="button"
        onClick={onNext}
        disabled={page === totalPages}
        sx={{
          ...btnBase,
          color: page === totalPages ? 'rgba(10,10,15,0.25)' : 'rgba(10,10,15,0.6)',
          cursor: page === totalPages ? 'default' : 'pointer',
          '&:hover': page === totalPages ? {} : { bgcolor: '#F4F4F7' },
        }}
      >
        →
      </Box>
    </Stack>
  );
}

interface SavingsHistoryCardProps {
  walletAddress: string;
}

export function SavingsHistoryCard({ walletAddress }: SavingsHistoryCardProps) {
  const { recentActivity, isLoading } = useUserActivity(walletAddress);
  const [page, setPage] = useState(1);

  const savingsActivity = recentActivity.filter(
    (a): a is SavingsActivity => a.type === 'Savings Deposit' || a.type === 'Savings Withdraw'
  );

  const totalPages = Math.max(1, Math.ceil(savingsActivity.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageSlice = savingsActivity.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const expertUrl = (a: SavingsActivity) =>
    a.txHash ? `https://stellar.expert/explorer/public/tx/${a.txHash}` : null;

  const COLS = '1fr auto 140px 80px';

  return (
    <Box
      sx={{
        borderRadius: '22px',
        border: '1px solid rgba(10,10,15,0.08)',
        bgcolor: '#FFFFFF',
        overflow: 'clip',
        boxShadow:
          '0 1px 0 rgba(255,255,255,0.6) inset, 0 24px 60px rgba(10,10,15,0.08), 0 2px 8px rgba(10,10,15,0.04)',
      }}
    >
      {/* Header */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ px: '20px', py: '16px', borderBottom: '1px solid rgba(10,10,15,0.06)' }}
      >
        <Typography sx={{ fontSize: '15px', fontWeight: 600, color: '#0A0A0F' }}>
          Transaction History
        </Typography>
        {savingsActivity.length > 0 && (
          <Box sx={{ px: '8px', py: '2px', borderRadius: '20px', bgcolor: '#F4F4F7' }}>
            <Typography
              sx={{
                fontSize: '11px',
                fontWeight: 500,
                color: 'rgba(10,10,15,0.5)',
                fontFamily: MONO,
              }}
            >
              {savingsActivity.length}
            </Typography>
          </Box>
        )}
      </Stack>

      {/* Scrollable table */}
      <Box sx={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <Box sx={{ minWidth: 480 }}>
          {/* Column headers */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: COLS,
              alignItems: 'center',
              gap: '16px',
              px: '20px',
              py: '10px',
              bgcolor: '#FAFAFB',
              borderBottom: '1px solid rgba(10,10,15,0.06)',
            }}
          >
            {['Date', 'Type', 'Amount', 'Tx'].map((h, i) => (
              <Typography
                key={h}
                sx={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'rgba(10,10,15,0.4)',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  textAlign: i >= 2 ? 'right' : 'left',
                }}
              >
                {h}
              </Typography>
            ))}
          </Box>

          {/* Rows */}
          {isLoading ? (
            <SkeletonRows />
          ) : savingsActivity.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              {pageSlice.map((a) => {
                const url = expertUrl(a);
                return (
                  <Box
                    key={a.id}
                    onClick={
                      url ? () => window.open(url, '_blank', 'noopener,noreferrer') : undefined
                    }
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: COLS,
                      alignItems: 'center',
                      gap: '16px',
                      px: '20px',
                      py: '14px',
                      borderBottom: '1px solid rgba(10,10,15,0.05)',
                      cursor: url ? 'pointer' : 'default',
                      '&:hover': url ? { bgcolor: '#FAFAFB' } : {},
                      '&:last-child': { borderBottom: 'none' },
                    }}
                  >
                    <Typography sx={{ fontSize: '13px', color: 'rgba(10,10,15,0.6)' }}>
                      {formatDate(a.timestamp)}
                    </Typography>

                    <TypeBadge type={a.type} />

                    <Typography
                      sx={{
                        fontSize: '13.5px',
                        fontWeight: 400,
                        fontFamily: MONO,
                        letterSpacing: '-0.02em',
                        color: '#0A0A0F',
                        textAlign: 'right',
                      }}
                    >
                      {formatAmount(a.amount)} USDC
                    </Typography>

                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                      {url ? (
                        <Box
                          sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '12px',
                            fontWeight: 400,
                            color: 'rgba(10,10,15,0.35)',
                            fontFamily: MONO,
                          }}
                        >
                          View
                          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                            <path
                              d="M2.5 9.5L9.5 2.5M9.5 2.5H5M9.5 2.5V7"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </Box>
                      ) : (
                        <Typography
                          sx={{
                            fontSize: '12px',
                            fontWeight: 400,
                            color: 'rgba(10,10,15,0.2)',
                            fontFamily: MONO,
                          }}
                        >
                          —
                        </Typography>
                      )}
                    </Box>
                  </Box>
                );
              })}
            </>
          )}
        </Box>
        {/* minWidth */}
      </Box>
      {/* overflowX */}

      {totalPages > 1 && (
        <PaginationBar
          page={currentPage}
          totalPages={totalPages}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
          onPage={setPage}
        />
      )}
    </Box>
  );
}
