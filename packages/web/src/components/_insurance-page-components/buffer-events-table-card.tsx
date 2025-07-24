import type { events } from '@normalfinance/types';
import type { TableHeadCellProps } from '@/components/template/table';

import { fDateTime } from '@/utils/format-time';
import { createStellarExpertUrl } from '@/utils/transactions.utils';
import { fTruncate, fShortenNumber } from '@normalfinance/utils/build/format';

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
  { id: 'type', label: 'Type' },
  { id: 'amount', label: 'Amount' },
  { id: 'token', label: 'Token' },
  { id: 'user', label: 'User' },
  { id: 'timestamp', label: 'Timestamp' },
  { id: '' },
];

// ----------------------------------------------------------------------

type Props = {
  events: events.BufferEvent[] | undefined;
};

export function BufferEventsTableCard({ events }: Props) {
  return (
    <Scrollbar sx={{ minHeight: 0 }}>
      <Table sx={{ minWidth: 800 }} data-testid="buffer-events-table">
        <TableHeadCustom headCells={TABLE_HEAD} />

        <TableBody>
          {events &&
            events.map((event, index) => {
              const stellarExpertUrl = createStellarExpertUrl('tx', event.txHash);
              const viewOnStellarExpert = () =>
                window.open(stellarExpertUrl, '_blank', 'noopener,noreferrer');

              return (
                <TableRow key={index} sx={{ cursor: 'pointer' }} onClick={viewOnStellarExpert}>
                  <TableCell>{event.type}</TableCell>
                  <TableCell>{fShortenNumber(event.amount.toString())}</TableCell>
                  <TableCell>{fTruncate(event.token, 15)}</TableCell>
                  <TableCell>{fTruncate(event.user, 15)}</TableCell>
                  <TableCell>{event.timestamp ? fDateTime(event.timestamp) : ''}</TableCell>
                  <TableCell align="right" sx={{ pr: 1 }}>
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
