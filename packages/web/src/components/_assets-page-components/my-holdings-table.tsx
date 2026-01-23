'use client';

import { useTranslate } from '@/locales';

import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import CardHeader from '@mui/material/CardHeader';

import { Scrollbar } from '@/components/template/scrollbar';
import {
  useTable,
  TableNoData,
  TableHeadCustom,
  type TableHeadCellProps,
} from '@/components/template/table';

import MyHoldingsTableRow, { type HoldingData } from './my-holdings-table-row';

const TABLE_HEAD: TableHeadCellProps[] = [
  { id: 'asset', label: 'Asset', width: 180 },
  { id: 'balance', label: 'Balance', align: 'right' },
  { id: 'price', label: 'Price', align: 'right' },
  { id: 'value', label: 'Value', align: 'right' },
  { id: 'allocation', label: 'Allocation', align: 'right' },
];

interface MyHoldingsTableProps {
  holdingsData: HoldingData[];
}

export default function MyHoldingsTable({ holdingsData }: MyHoldingsTableProps) {
  const { t } = useTranslate();
  const table = useTable({ defaultRowsPerPage: 10 });

  return (
    <Card sx={{ borderRadius: 2, height: '100%' }}>
      <CardHeader title={t('Holdings')} />

      <Scrollbar sx={{ maxHeight: 400 }}>
        <Table stickyHeader sx={{ minWidth: 500 }}>
          <TableHeadCustom
            order={table.order}
            orderBy={table.orderBy}
            headCells={TABLE_HEAD}
            onSort={table.onSort}
          />
          <TableBody>
            {holdingsData
              .slice(
                table.page * table.rowsPerPage,
                table.page * table.rowsPerPage + table.rowsPerPage
              )
              .map((holding) => (
                <MyHoldingsTableRow key={holding.token.contract} holding={holding} />
              ))}
            <TableNoData notFound={holdingsData.length === 0} />
          </TableBody>
        </Table>
      </Scrollbar>
    </Card>
  );
}
