'use client';

import type { IPairTableFilters } from '@/types/pairTable';
import type { TableHeadCellProps } from '@/components/template/table';

import { useSetState } from 'minimal-shared/hooks';

import { Card, Table, TableBody } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';

import { Scrollbar } from '@/components/template/scrollbar';
import {
  useTable,
  emptyRows,
  TableNoData,
  getComparator,
  TableSkeleton,
  TableEmptyRows,
  TableHeadCustom,
} from '@/components/template/table';

import { ExplorePoolsTableRow } from './components/explore-pools-table-row';
import { ExplorePoolsTableToolbar } from './components/explore-pools-toolbar';

import type { ExplorePairsRow } from './components/explore-pools-table-row';

/* ------------------------------------------------------------------ */
/* columns                                                             */
/* ------------------------------------------------------------------ */

type HeadCell = TableHeadCellProps;

const TABLE_HEAD: HeadCell[] = [
  { id: 'rank', label: '#', width: 64, align: 'left' },
  { id: 'pair', label: 'Asset', width: 200 },
  { id: 'fee', label: 'Fee', align: 'left' },
  { id: 'collateral', label: 'TVL', align: 'left' },
  { id: 'rewards', label: 'Rewards', align: 'left' },
  { id: 'apr', label: 'Pool APR', align: 'left' },
  { id: 'volume1d', label: '1D vol', align: 'left' },
  { id: 'volume30d', label: '30D vol', align: 'left' },
  { id: '', label: '' },
];

/* ------------------------------------------------------------------ */
/* component                                                           */
/* ------------------------------------------------------------------ */

export interface ExplorePoolsTableProps {
  pools: ExplorePairsRow[];
  loading: boolean;
}

export function ExplorePoolsTable({ pools, loading }: ExplorePoolsTableProps) {
  /* ----- table helpers -------------------------------------------------- */
  const table = useTable({ defaultRowsPerPage: 30 });

  /* ----- full dataset --------------------------------------------------- */
  const tableData = pools;

  /* ----- search filter state ------------------------------------------- */
  const filters = useSetState<IPairTableFilters>({
    name: '', // search-text
    role: [], // keep empty → not used for markets
    status: 'all', // default tab
  });
  const { state: currentFilters, setState: updateFilters } = filters;

  /* ----- sorting -------------------------------------------------------- */
  /** only numeric sortable keys */
  // type SortableKeys = 'rank' | 'price' | 'change1h' | 'change1d' | 'fdv' | 'volume24h';
  type SortableKeys = 'collateral' | 'apr' | 'volume1d' | 'volume30d';

  const comparator = getComparator<SortableKeys>(table.order, table.orderBy as SortableKeys) as (
    a: ExplorePairsRow,
    b: ExplorePairsRow
  ) => number;

  /* ----- apply search + sort ------------------------------------------- */
  const dataFiltered = applyFilter({
    data: tableData,
    comparator,
    nameFilter: currentFilters.name,
  });

  const notFound = !dataFiltered.length;
  const theme = useTheme();

  /* ----- render --------------------------------------------------------- */
  return (
    <div data-testid="explore-pools-table">
      <ExplorePoolsTableToolbar filters={filters} onResetPage={table.onResetPage} />

      <Card sx={{ borderRadius: 3, border: 1, borderColor: alpha(theme.palette.grey[500], 0.32) }}>
        {/* — search bar — */}

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
            />

            {/* body ── unchanged */}
            <TableBody>
              {loading ? (
                <TableSkeleton rowCount={10} cellCount={8} />
              ) : (
                <>
                  {dataFiltered
                    .slice(
                      table.page * table.rowsPerPage,
                      table.page * table.rowsPerPage + table.rowsPerPage
                    )
                    .map((row, index) => (
                      <ExplorePoolsTableRow key={row.address} row={row} index={index + 1} />
                    ))}

                  <TableEmptyRows
                    height={56}
                    emptyRows={emptyRows(table.page, table.rowsPerPage, dataFiltered.length)}
                  />

                  <TableNoData notFound={notFound} />
                </>
              )}
            </TableBody>
          </Table>
        </Scrollbar>
      </Card>
    </div>
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
  data: ExplorePairsRow[];
  comparator: (a: ExplorePairsRow, b: ExplorePairsRow) => number;
  nameFilter: string;
}) {
  // --- filter by name ----------------------------------------------------
  const out = nameFilter
    ? data.filter((m) => m.assetName.toLowerCase().includes(nameFilter.toLowerCase()))
    : data;

  // --- stable-sort -------------------------------------------------------
  const stabilised = out.map((el, idx) => [el, idx] as const);
  stabilised.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    return order !== 0 ? order : a[1] - b[1];
  });

  return stabilised.map((el) => el[0]);
}
