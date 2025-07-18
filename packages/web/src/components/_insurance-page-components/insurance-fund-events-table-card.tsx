import type { events } from '@normalfinance/types';
import type { TableHeadCellProps } from '@/components/template/table';

import { fTruncate } from '@normalfinance/utils/build/format';
import { createStellarExpertUrl } from '@/utils/transactions.utils';

import Table from '@mui/material/Table';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableBody from '@mui/material/TableBody';

import { Scrollbar } from '@/components/template/scrollbar';
import { TableHeadCustom } from '@/components/template/table';

// ----------------------------------------------------------------------

const TABLE_HEAD: TableHeadCellProps[] = [
  { id: 'action', label: 'Action' },
  { id: 'amount', label: 'Amount' },
  { id: 'shares_before', label: 'Total Shares Before' },
  { id: 'shares_after', label: 'Total Shares After' },
  { id: 'user', label: 'User' },
  { id: 'timestamp', label: 'Timestamp' },
];

// ----------------------------------------------------------------------

type Props = {
  events: events.InsuranceFundEvent[] | undefined;
};

export function InsuranceFundEventsTableCard({ events }: Props) {
  return (
    <Scrollbar sx={{ minHeight: 0 }}>
      <Table sx={{ minWidth: 800 }}>
        <TableHeadCustom headCells={TABLE_HEAD} />

        <TableBody>
          {events &&
            events.map((event) => {
              const stellarExpertUrl = createStellarExpertUrl('tx', event.txHash);

              return (
                <TableRow
                  key={event.timestamp}
                  sx={{ cursor: 'pointer' }}
                  onClick={() => window.open(stellarExpertUrl, '_blank', 'noopener,noreferrer')}
                >
                  <TableCell>{event.action}</TableCell>
                  <TableCell align="right">{event.amount}</TableCell>
                  <TableCell align="right">{event.total_if_shares_before}</TableCell>
                  <TableCell align="right">{event.total_if_shares_after}</TableCell>
                  <TableCell align="right">{fTruncate(event.user, 15)}</TableCell>
                  <TableCell align="right">{event.timestamp}</TableCell>
                </TableRow>
              );
            })}
        </TableBody>
      </Table>
    </Scrollbar>
  );
}
