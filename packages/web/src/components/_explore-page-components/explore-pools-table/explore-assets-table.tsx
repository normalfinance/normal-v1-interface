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

import { ExploreAssetsTableRow } from './components/explore-assets-table-row';
import { ExplorePoolsTableToolbar } from './components/explore-pools-toolbar';

import type { ExploreAssetsRow } from './components/explore-assets-table-row';

/* ------------------------------------------------------------------ */
/* columns                                                             */
/* ------------------------------------------------------------------ */

type HeadCell = TableHeadCellProps;

const TABLE_HEAD: HeadCell[] = [
  { id: 'rank', label: '#', width: 64, align: 'left' },
  { id: 'asset', label: 'Asset', width: 200 },
  { id: 'scaledPrice', label: 'Price', align: 'left' },
  { id: 'price', label: '% Long', align: 'left' },
  { id: 'collateral', label: 'TVL', align: 'left' },
  { id: 'lowerPriceBound', label: 'Lower', align: 'left' },
  { id: 'upperPriceBound', label: 'Upper', align: 'left' },
  { id: 'volume1d', label: '1D vol', align: 'left' },
  { id: 'status', label: 'Status', align: 'left' },
  { id: '', label: '' },
];

/* ------------------------------------------------------------------ */
/* component                                                           */
/* ------------------------------------------------------------------ */

export interface ExplorePoolsTableProps {
  assets: ExploreAssetsRow[];
  loading: boolean;
}

export function ExploreAssetsTable({ assets, loading }: ExplorePoolsTableProps) {
  /* ----- table helpers -------------------------------------------------- */
  const table = useTable({ defaultRowsPerPage: 30 });

  /* ----- full dataset --------------------------------------------------- */
  const tableData = assets;

  /* ----- search filter state ------------------------------------------- */
  const filters = useSetState<IPairTableFilters>({
    name: '', // search-text
    role: [], // keep empty → not used for markets
    status: 'all', // default tab
  });
  const { state: currentFilters, setState: updateFilters } = filters;

  /* ----- sorting -------------------------------------------------------- */
  /** only numeric sortable keys */
  type SortableKeys = 'totalCollateral' | 'price' | 'volume1d';

  const comparator = getComparator<SortableKeys>(table.order, table.orderBy as SortableKeys) as (
    a: ExploreAssetsRow,
    b: ExploreAssetsRow
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
    <div data-testid="explore-asset-table">
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
                      <ExploreAssetsTableRow key={row.address} row={row} index={index + 1} />
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
  data: ExploreAssetsRow[];
  comparator: (a: ExploreAssetsRow, b: ExploreAssetsRow) => number;
  nameFilter: string;
}) {
  // --- filter by name ----------------------------------------------------
  const out = nameFilter
    ? data.filter((m) => m.asset.toLowerCase().includes(nameFilter.toLowerCase()))
    : data;

  // --- stable-sort -------------------------------------------------------
  const stabilised = out.map((el, idx) => [el, idx] as const);
  stabilised.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    return order !== 0 ? order : a[1] - b[1];
  });

  return stabilised.map((el) => el[0]);
}
