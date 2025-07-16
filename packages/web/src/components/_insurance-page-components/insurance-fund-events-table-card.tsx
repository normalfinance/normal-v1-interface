import type { TableHeadCellProps } from '@/components/template/table';

import Table from '@mui/material/Table';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableBody from '@mui/material/TableBody';

import { Scrollbar } from '@/components/template/scrollbar';
import { TableHeadCustom } from '@/components/template/table';

import type { InsuranceFundEvent } from './insurance-actions-table-card';

// ----------------------------------------------------------------------

const TABLE_HEAD: TableHeadCellProps[] = [
  { id: 'action', label: 'Action' },
  { id: 'amount', label: 'Amount', align: 'right' },
  { id: 'shares_before', label: 'Total Shares Before', align: 'right' },
  { id: 'shares_after', label: 'Total Shares After', align: 'right' },
  { id: 'user', label: 'User', align: 'right' },
  { id: 'timestamp', label: 'Timestamp', align: 'right' },
];

// ----------------------------------------------------------------------

type Props = {
  events: InsuranceFundEvent[] | undefined;
};

export function InsuranceFundEventsTableCard({ events }: Props) {
  return (
    <Scrollbar sx={{ minHeight: 0 }}>
      <Table sx={{ minWidth: 800 }}>
        <TableHeadCustom headCells={TABLE_HEAD} />

        <TableBody>
          {events &&
            events.map((event) => (
              <TableRow key={event.ts}>
                <TableCell>{event.action}</TableCell>
                <TableCell align="right">{event.amount}</TableCell>
                <TableCell align="right">{event.total_if_shares_before}</TableCell>
                <TableCell align="right">{event.total_if_shares_after}</TableCell>
                <TableCell align="right">{event.user}</TableCell>
                <TableCell align="right">{event.ts}</TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </Scrollbar>
  );
}
