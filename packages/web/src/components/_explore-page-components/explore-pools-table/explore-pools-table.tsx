
'use client';

import type { IMarketTableFilters } from '@/types/marketTable';
import type { TableHeadCellProps } from '@/components/template/table';

import { useState } from 'react';
import { useSetState } from 'minimal-shared/hooks';

import { Card, Table, Divider, TableBody } from '@mui/material';

import { Scrollbar } from '@/components/template/scrollbar';
import {
  useTable,
  emptyRows,
  TableNoData,
  getComparator,
  TableEmptyRows,
  TableHeadCustom,
  TablePaginationCustom,
} from '@/components/template/table';

import { ExplorePoolsTableRow } from './components/explore-pools-table-row';
import { ExplorePoolsTableToolbar } from './components/explore-pools-toolbar';

/* ------------------------------------------------------------------ */
/* columns                                                             */
/* ------------------------------------------------------------------ */

type HeadCell = TableHeadCellProps;

const TABLE_HEAD: HeadCell[] = [
  { id: 'rank', label: '#', width: 64, align: 'left' },
  { id: 'name', label: 'Name', width: 160 },
  { id: 'price', label: 'Price', align: 'left' },
  { id: 'change1h', label: '1 H', align: 'left' },
  { id: 'change1d', label: '1 D', align: 'left' },
  { id: 'fdv', label: 'FDV', align: 'left' },
  { id: 'volume24h', label: 'Volume', align: 'left' },
  { id: 'spark', label: '1 D Chart', width: 120, align: 'center' },
];

/* ------------------------------------------------------------------ */
/* row model                                                           */
/* ------------------------------------------------------------------ */

export interface Market {
  id: string;
  rank: number;
  name: string;
  symbol: string;
  iconUrl: string;
  price: number;
  change1h: number;
  change1d: number;
  fdv: number;
  volume24h: number;
  spark: { series: number[]; categories: string[]; colors: string[] };
  url: string;
}

/* ------------------------------------------------------------------ */
/* component                                                           */
/* ------------------------------------------------------------------ */

export interface ExplorePoolsTableProps {
  pools: Market[];
}

export function ExplorePoolsTable({ pools }: ExplorePoolsTableProps) {
  /* ----- table helpers -------------------------------------------------- */
  const table = useTable({ defaultRowsPerPage: 20 });

  /* ----- full dataset --------------------------------------------------- */
  const [tableData] = useState<Market[]>(pools);

  /* ----- search filter state ------------------------------------------- */
  const filters = useSetState<IMarketTableFilters>({
    name: '', // search-text
    role: [], // keep empty → not used for markets
    status: 'all', // default tab
  });
  const { state: currentFilters, setState: updateFilters } = filters;

  /* ----- sorting -------------------------------------------------------- */
  /** only numeric sortable keys */
  type SortableKeys = 'rank' | 'price' | 'change1h' | 'change1d' | 'fdv' | 'volume24h';

  const comparator = getComparator<SortableKeys>(table.order, table.orderBy as SortableKeys) as (
    a: Market,
    b: Market
  ) => number;

  /* ----- apply search + sort ------------------------------------------- */
  const dataFiltered = applyFilter({
    data: tableData,
    comparator,
    nameFilter: currentFilters.name,
  });

  const notFound = !dataFiltered.length;

  /* ----- render --------------------------------------------------------- */
  return (
    <Card>
      {/* — search bar — */}
      <ExplorePoolsTableToolbar filters={filters} onResetPage={table.onResetPage} />

      {/* — scrollable table — */}
      <Scrollbar>
        <Table sx={{ minWidth: 960 }}>
          {/* ✅ custom, sortable header */}
          <TableHeadCustom
            order={table.order}
            orderBy={table.orderBy}
            headCells={TABLE_HEAD}
            rowCount={dataFiltered.length}
            numSelected={table.selected.length}
            onSort={table.onSort}
            onSelectAllRows={(checked) =>
              table.onSelectAllRows(
                checked,
                dataFiltered.map((row) => row.id) // ids used by <TableHeadCustom>
              )
            }
          />

          {/* body ── unchanged */}
          <TableBody>
            {dataFiltered
              .slice(
                table.page * table.rowsPerPage,
                table.page * table.rowsPerPage + table.rowsPerPage
              )
              .map((row) => (
                <ExplorePoolsTableRow key={row.id} row={row} />
              ))}

            <TableEmptyRows
              height={56}
              emptyRows={emptyRows(table.page, table.rowsPerPage, dataFiltered.length)}
            />

            <TableNoData notFound={notFound} />
          </TableBody>
        </Table>
      </Scrollbar>

      <Divider />

      {/* pagination */}
      <TablePaginationCustom
        count={dataFiltered.length}
        page={table.page}
        rowsPerPage={table.rowsPerPage}
        onPageChange={table.onChangePage}
        onRowsPerPageChange={table.onChangeRowsPerPage}
        dense={table.dense}
        onChangeDense={table.onChangeDense}
      />
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* helpers                                                            */
/* ------------------------------------------------------------------ */

function applyFilter({
  data,
  comparator,
  nameFilter,
}: {
  data: Market[];
  comparator: (a: Market, b: Market) => number;
  nameFilter: string;
}) {
  // --- filter by name ----------------------------------------------------
  const out = nameFilter
    ? data.filter((m) => m.name.toLowerCase().includes(nameFilter.toLowerCase()))
    : data;

  // --- stable-sort -------------------------------------------------------
  const stabilised = out.map((el, idx) => [el, idx] as const);
  stabilised.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    return order !== 0 ? order : a[1] - b[1];
  });

  return stabilised.map((el) => el[0]);
}
