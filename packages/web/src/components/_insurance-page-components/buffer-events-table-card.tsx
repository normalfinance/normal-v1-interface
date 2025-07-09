import type { TableHeadCellProps } from '@/components/template/table';

import Table from '@mui/material/Table';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableBody from '@mui/material/TableBody';

import { Scrollbar } from '@/components/template/scrollbar';
import { TableHeadCustom } from '@/components/template/table';

import type { BufferEvent } from './insurance-actions-table-card';

// ----------------------------------------------------------------------

const TABLE_HEAD: TableHeadCellProps[] = [
  { id: 'type', label: 'Type' },
  { id: 'amount', label: 'Amount', align: 'right' },
  { id: 'token', label: 'Token', align: 'right' },
  { id: 'user', label: 'User', align: 'right' },
  { id: 'timestamp', label: 'Timestamp', align: 'right' },
];

// ----------------------------------------------------------------------

type Props = {
  events: BufferEvent[] | undefined;
};

export function BufferEventsTableCard({ events }: Props) {
  return (
    <Scrollbar sx={{ minHeight: 0 }}>
      <Table sx={{ minWidth: 800 }}>
        <TableHeadCustom headCells={TABLE_HEAD} />

        <TableBody>
          {events &&
            events.map((event) => (
              <TableRow key={event.ts}>
                <TableCell>{event.type}</TableCell>
                <TableCell align="right">{event.amount}</TableCell>
                <TableCell align="right">{event.token}</TableCell>
                <TableCell align="right">{event.user}</TableCell>
                <TableCell align="right">{event.ts}</TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </Scrollbar>
  );
}
