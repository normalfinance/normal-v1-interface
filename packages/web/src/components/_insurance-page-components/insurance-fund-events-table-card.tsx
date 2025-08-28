import type { events } from '@normalfinance/types';
import type { TableHeadCellProps } from '@/components/template/table';

import { format } from '@normalfinance/utils';
import { fDateTime } from '@/utils/format-time';
import { fTruncate } from '@normalfinance/utils/build/format';
import { createStellarExpertUrl } from '@/utils/transactions.utils';

import Table from '@mui/material/Table';
import { IconButton } from '@mui/material';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableBody from '@mui/material/TableBody';

import { Scrollbar } from '@/components/template/scrollbar';
import { TableHeadCustom } from '@/components/template/table';

import { Iconify } from '../template/iconify';

// ----------------------------------------------------------------------

const TABLE_HEAD: TableHeadCellProps[] = [
  { id: 'action', label: 'Action' },
  { id: 'amount', label: 'Amount' },
  { id: 'shares_before', label: 'Shares Before' },
  { id: 'shares_after', label: 'Shares After' },
  { id: 'user', label: 'User' },
  { id: 'timestamp', label: 'Timestamp' },
  { id: '' },
];

// ----------------------------------------------------------------------

type Props = {
  events: events.InsuranceFundEvent[] | undefined;
};

export function InsuranceFundEventsTableCard({ events }: Props) {
  return (
    <Scrollbar sx={{ minHeight: 0 }}>
      <Table
        sx={{
          minWidth: 800,
        }}
      >
        <TableHeadCustom
          headCells={TABLE_HEAD}
          sx={{
            backgroundColor: 'grey.100',
            borderBottom: 1,
            borderColor: 'divider',
          }}
        />

        <TableBody>
          {events &&
            events.map((event, index) => {
              const stellarExpertUrl = createStellarExpertUrl('tx', event.txHash);
              const viewOnStellarExpert = () =>
                window.open(stellarExpertUrl, '_blank', 'noopener,noreferrer');

              return (
                <TableRow
                  key={index}
                  sx={{ cursor: 'pointer' }}
                  onClick={() => window.open(stellarExpertUrl, '_blank', 'noopener,noreferrer')}
                >
                  <TableCell>{event.action}</TableCell>
                  <TableCell>{format.formatTokenAmount(event.amount.toString())} XLM</TableCell>
                  <TableCell>
                    {format.formatTokenAmount(event.totalSharesBefore.toString())}
                  </TableCell>
                  <TableCell>
                    {format.formatTokenAmount(event.totalSharesAfter.toString())}
                  </TableCell>
                  <TableCell>{fTruncate(event.user, 15)}</TableCell>
                  <TableCell>{event.timestamp ? fDateTime(event.timestamp) : ''}</TableCell>
                  <TableCell sx={{ pr: 1 }}>
                    <IconButton color="default" onClick={viewOnStellarExpert}>
                      <Iconify icon="eva:external-link-fill" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
        </TableBody>
      </Table>
    </Scrollbar>
  );
}
