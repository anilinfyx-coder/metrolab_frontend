'use client';
import { ReactNode, useMemo, useState } from 'react';
import TablePagination, { useClientPagination } from './TablePagination';

export type ListingColumn<T> = {
  key: string;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  getValue?: (row: T) => string | number | boolean | null | undefined;
  render?: (row: T) => ReactNode;
};

type ListingTableProps<T extends { id: number | string }> = {
  title: string;
  columns: ListingColumn<T>[];
  rows: T[];
  loading?: boolean;
  emptyText?: string;
  headerActions?: ReactNode;
  rowActions?: (row: T) => ReactNode;
  actionsLabel?: string;
  actionsWidth?: number;
  defaultPageSize?: number;
};

function getCellText<T>(row: T, col: ListingColumn<T>): string {
  if (col.getValue) {
    const v = col.getValue(row);
    return v == null ? '' : String(v);
  }
  const raw = (row as Record<string, unknown>)[col.key];
  return raw == null ? '' : String(raw);
}

export function ActionIcons({
  onEdit,
  onToggleStatus,
  onDelete,
  onView,
  statusActive,
  editTitle = 'Edit',
  statusTitle,
  deleteTitle = 'Delete',
  viewTitle = 'View Form',
}: {
  onEdit?: () => void;
  onToggleStatus?: () => void;
  onDelete?: () => void;
  onView?: () => void;
  statusActive?: boolean;
  editTitle?: string;
  statusTitle?: string;
  deleteTitle?: string;
  viewTitle?: string;
}) {
  return (
    <div className="listing-actions">
      {onView && (
        <button type="button" className="action-btn action-btn-view" title={viewTitle} onClick={onView}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z" />
          </svg>
        </button>
      )}
      {onEdit && (
        <button type="button" className="action-btn action-btn-edit" title={editTitle} onClick={onEdit}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z" />
          </svg>
        </button>
      )}
      {onToggleStatus && (
        <button
          type="button"
          className={`action-btn action-btn-status${statusActive ? '' : ' inactive'}`}
          title={statusTitle || (statusActive ? 'Active — click to disable' : 'Inactive — click to enable')}
          onClick={onToggleStatus}
        >
          {statusActive ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M17 7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h10c2.76 0 5-2.24 5-5s-2.24-5-5-5zm0 8c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M17 7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h10c2.76 0 5-2.24 5-5s-2.24-5-5-5zM7 15c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z" />
            </svg>
          )}
        </button>
      )}
      {onDelete && (
        <button type="button" className="action-btn action-btn-delete" title={deleteTitle} onClick={onDelete}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
          </svg>
        </button>
      )}
    </div>
  );
}

export function ListingHeaderActions({
  onAdd,
  onRefresh,
  addLabel = 'Add',
  refreshLabel = 'Refresh',
}: {
  onAdd?: () => void;
  onRefresh?: () => void;
  addLabel?: string;
  refreshLabel?: string;
}) {
  return (
    <div className="listing-header-links">
      {onAdd && (
        <button type="button" className="listing-header-link" onClick={onAdd}>
          {addLabel}
        </button>
      )}
      {onAdd && onRefresh && <span className="listing-header-sep">|</span>}
      {onRefresh && (
        <button type="button" className="listing-header-link" onClick={onRefresh}>
          {refreshLabel}
        </button>
      )}
    </div>
  );
}

export default function ListingTable<T extends { id: number | string }>({
  title,
  columns,
  rows,
  loading = false,
  emptyText = 'No records found.',
  headerActions,
  rowActions,
  actionsLabel = 'Actions',
  actionsWidth = 130,
  defaultPageSize = 10,
}: ListingTableProps<T>) {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [sortKey, setSortKey] = useState<string | null>(
    columns.find(c => c.sortable)?.key || null
  );
  const [sortAsc, setSortAsc] = useState(true);

  const filteredSorted = useMemo(() => {
    let list = [...rows];

    list = list.filter(row =>
      columns.every(col => {
        if (col.filterable === false) return true;
        const q = (filters[col.key] || '').trim().toLowerCase();
        if (!q) return true;
        return getCellText(row, col).toLowerCase().includes(q);
      })
    );

    if (sortKey) {
      const col = columns.find(c => c.key === sortKey);
      if (col) {
        list.sort((a, b) => {
          const av = getCellText(a, col).toLowerCase();
          const bv = getCellText(b, col).toLowerCase();
          if (av < bv) return sortAsc ? -1 : 1;
          if (av > bv) return sortAsc ? 1 : -1;
          return 0;
        });
      }
    }

    return list;
  }, [rows, columns, filters, sortKey, sortAsc]);

  const { page, setPage, pageSize, setPageSize, totalPages, pageItems, total } =
    useClientPagination(filteredSorted, defaultPageSize);

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortAsc(v => !v);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const colSpan = columns.length + (rowActions ? 1 : 0);

  return (
    <div className="card listing-card">
      <div className="listing-card-header">
        <h2 className="listing-card-title">{title}</h2>
        {headerActions}
      </div>

      <div className="card-body" style={{ padding: 0 }}>
        {loading ? (
          <div className="listing-loading">Loading...</div>
        ) : (
          <>
            <div className="table-wrap">
              <table className="listing-table">
                <thead>
                  <tr>
                    {columns.map(col => (
                      <th key={col.key} style={{ width: col.width, textAlign: col.align || 'left' }}>
                        {col.sortable !== false ? (
                          <button
                            type="button"
                            className="th-sort-btn"
                            onClick={() => toggleSort(col.key)}
                          >
                            {col.label}
                            {sortKey === col.key && (
                              <span aria-hidden>{sortAsc ? '▲' : '▼'}</span>
                            )}
                            {sortKey !== col.key && <span className="th-sort-hint" aria-hidden>⇅</span>}
                          </button>
                        ) : (
                          col.label
                        )}
                      </th>
                    ))}
                    {rowActions && (
                      <th style={{ width: actionsWidth }}>{actionsLabel}</th>
                    )}
                  </tr>
                  <tr className="table-filter-row">
                    {columns.map(col => (
                      <td key={col.key}>
                        {col.filterable !== false ? (
                          <input
                            value={filters[col.key] || ''}
                            onChange={e =>
                              setFilters(prev => ({ ...prev, [col.key]: e.target.value }))
                            }
                            aria-label={`Filter ${col.label}`}
                          />
                        ) : null}
                      </td>
                    ))}
                    {rowActions && <td />}
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map(row => (
                    <tr key={row.id}>
                      {columns.map(col => (
                        <td key={col.key} style={{ textAlign: col.align || 'left' }}>
                          {col.render ? col.render(row) : (getCellText(row, col) || '—')}
                        </td>
                      ))}
                      {rowActions && <td>{rowActions(row)}</td>}
                    </tr>
                  ))}
                  {pageItems.length === 0 && (
                    <tr>
                      <td colSpan={colSpan} className="listing-empty">
                        {emptyText}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <TablePagination
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              total={total}
            />
          </>
        )}
      </div>
    </div>
  );
}
