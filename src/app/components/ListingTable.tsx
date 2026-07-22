'use client';
import { ReactNode, useMemo, useState } from 'react';
import {
  MdAdd,
  MdArrowDownward,
  MdArrowUpward,
  MdDelete,
  MdDescription,
  MdDownload,
  MdEdit,
  MdEmail,
  MdLock,
  MdLockOpen,
  MdToggleOff,
  MdToggleOn,
  MdUnfoldMore,
  MdVisibility,
} from 'react-icons/md';
import TablePagination, { useClientPagination } from './TablePagination';
import PageLoader from './PageLoader';

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
  /** When true, shows "Total: N" on the right of the card header (filtered count). */
  showTotal?: boolean;
  rowActions?: (row: T) => ReactNode;
  actionsLabel?: string;
  actionsWidth?: number;
  defaultPageSize?: number;
  className?: string;
  /** Client-side (default) slices rows in browser; server loads one page from API. */
  paginationMode?: 'client' | 'server';
  page?: number;
  pageSize?: number;
  total?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
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
  onDownload,
  onLock,
  onMail,
  statusActive,
  locked,
  editTitle = 'Edit',
  statusTitle,
  deleteTitle = 'Delete',
  viewTitle = 'View Form',
  downloadTitle = 'Download',
  lockTitle,
  mailTitle = 'Email Report',
  deleteFirst = false,
  editVariant = 'filled',
  editDisabled = false,
}: {
  onEdit?: () => void;
  onToggleStatus?: () => void;
  onDelete?: () => void;
  onView?: () => void;
  onDownload?: () => void;
  onLock?: () => void;
  onMail?: () => void;
  statusActive?: boolean;
  locked?: boolean;
  editTitle?: string;
  statusTitle?: string;
  deleteTitle?: string;
  viewTitle?: string;
  downloadTitle?: string;
  lockTitle?: string;
  mailTitle?: string;
  /** When true, render Delete before Edit (screenshot Waiting List order). */
  deleteFirst?: boolean;
  editVariant?: 'filled' | 'outline';
  editDisabled?: boolean;
}) {
  const editBtn = onEdit ? (
    <button
      type="button"
      className={`action-btn ${editVariant === 'outline' ? 'action-btn-edit-outline' : 'action-btn-edit'}`}
      title={editTitle}
      onClick={onEdit}
      disabled={editDisabled}
    >
      <MdEdit size={15} aria-hidden />
    </button>
  ) : null;

  const deleteBtn = onDelete ? (
    <button type="button" className="action-btn action-btn-delete" title={deleteTitle} onClick={onDelete}>
      <MdDelete size={14} aria-hidden />
    </button>
  ) : null;

  const statusBtn = onToggleStatus ? (
    <button
      type="button"
      className={`action-btn action-btn-status${statusActive ? '' : ' inactive'}`}
      title={statusTitle || (statusActive ? 'Active — click to disable' : 'Inactive — click to enable')}
      onClick={onToggleStatus}
    >
      {statusActive ? (
        <MdToggleOn size={18} aria-hidden />
      ) : (
        <MdToggleOff size={18} aria-hidden />
      )}
    </button>
  ) : null;

  const downloadBtn = onDownload ? (
    <button type="button" className="action-btn action-btn-download" title={downloadTitle} onClick={onDownload}>
      <MdDownload size={15} aria-hidden />
    </button>
  ) : null;

  const lockBtn = onLock ? (
    <button
      type="button"
      className={`action-btn action-btn-lock${locked ? ' locked' : ''}`}
      title={lockTitle || (locked ? 'Unlock' : 'Lock')}
      onClick={onLock}
    >
      {locked ? (
        <MdLock size={14} aria-hidden />
      ) : (
        <MdLockOpen size={14} aria-hidden />
      )}
    </button>
  ) : null;

  const mailBtn = onMail ? (
    <button type="button" className="action-btn action-btn-mail" title={mailTitle} onClick={onMail}>
      <MdEmail size={15} aria-hidden />
    </button>
  ) : null;

  const viewEyeBtn = onView ? (
    <button type="button" className="action-btn action-btn-view-eye" title={viewTitle} onClick={onView}>
      <MdVisibility size={16} aria-hidden />
    </button>
  ) : null;

  const viewDocBtn = onView ? (
    <button type="button" className="action-btn action-btn-view" title={viewTitle} onClick={onView}>
      <MdDescription size={15} aria-hidden />
    </button>
  ) : null;

  // Manage Requests: Download + View (eye) + Delete
  const isRequestActions = !!(onDownload && onView && onDelete && !onLock && !onMail && !onEdit);
  // Test Reports: Download + Edit + Lock + Mail
  const hasReportActions = !!(onDownload || onLock || onMail) && !isRequestActions;

  return (
    <div className="listing-actions">
      {isRequestActions ? (
        <>
          {downloadBtn}
          {viewEyeBtn}
          {deleteBtn}
        </>
      ) : hasReportActions ? (
        <>
          {downloadBtn}
          {editBtn}
          {lockBtn}
          {mailBtn}
          {onView && viewDocBtn}
          {deleteBtn}
        </>
      ) : deleteFirst ? (
        <>
          {onView && viewDocBtn}
          {deleteBtn}
          {editBtn}
          {statusBtn}
        </>
      ) : (
        <>
          {onView && viewDocBtn}
          {editBtn}
          {statusBtn}
          {deleteBtn}
        </>
      )}
    </div>
  );
}

export function ListingHeaderActions({
  onAdd,
  addLabel = 'Add',
}: {
  onAdd?: () => void;
  addLabel?: string;
}) {
  if (!onAdd) return null;

  return (
    <div className="listing-header-links">
      <button type="button" className="listing-header-link" onClick={onAdd}>
        <MdAdd size={18} aria-hidden />
        {addLabel}
      </button>
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
  showTotal = false,
  rowActions,
  actionsLabel = 'Actions',
  actionsWidth = 130,
  defaultPageSize = 10,
  className = '',
  paginationMode = 'client',
  page: serverPage,
  pageSize: serverPageSize,
  total: serverTotal,
  onPageChange,
  onPageSizeChange,
}: ListingTableProps<T>) {
  const isServerPagination = paginationMode === 'server';
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [sortKey, setSortKey] = useState<string | null>(
    isServerPagination ? null : (columns.find(c => c.sortable)?.key || null)
  );
  const [sortAsc, setSortAsc] = useState(true);

  const filteredSorted = useMemo(() => {
    if (isServerPagination) return rows;

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
  }, [rows, columns, filters, sortKey, sortAsc, isServerPagination]);

  const clientPagination = useClientPagination(filteredSorted, defaultPageSize);

  const page = isServerPagination ? (serverPage ?? 1) : clientPagination.page;
  const pageSize = isServerPagination ? (serverPageSize ?? defaultPageSize) : clientPagination.pageSize;
  const total = isServerPagination ? (serverTotal ?? 0) : clientPagination.total;
  const totalPages = isServerPagination
    ? Math.max(1, Math.ceil(total / pageSize) || 1)
    : clientPagination.totalPages;
  const pageItems = isServerPagination ? rows : clientPagination.pageItems;

  const handlePageChange = (nextPage: number) => {
    if (isServerPagination) onPageChange?.(nextPage);
    else clientPagination.setPage(nextPage);
  };

  const handlePageSizeChange = (size: number) => {
    if (isServerPagination) onPageSizeChange?.(size);
    else clientPagination.setPageSize(size);
  };

  const toggleSort = (key: string) => {
    if (isServerPagination) return;
    if (sortKey === key) setSortAsc(v => !v);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const colSpan = columns.length + (rowActions ? 1 : 0);

  return (
    <div className={`card listing-card${className ? ` ${className}` : ''}`}>
      <div className="listing-card-header">
        <h2 className="listing-card-title">{title}</h2>
        <div className="listing-card-header-right">
          {showTotal && <span className="listing-total">Total: {total}</span>}
          {headerActions}
        </div>
      </div>

      <div className="card-body" style={{ padding: 0 }}>
        {loading ? (
          <PageLoader message="Loading data..." className="listing-loading" />
        ) : (
          <>
            <div className="table-wrap">
              <table className="listing-table">
                <thead>
                  <tr>
                    {columns.map(col => (
                      <th key={col.key} style={{ width: col.width, textAlign: col.align || 'left' }}>
                        {!isServerPagination && col.sortable !== false ? (
                          <button
                            type="button"
                            className="th-sort-btn"
                            onClick={() => toggleSort(col.key)}
                            aria-label={`Sort by ${col.label}`}
                          >
                            <span className="th-sort-label">{col.label}</span>
                            <span className="th-sort-icon-wrap" aria-hidden>
                              {sortKey === col.key ? (
                                sortAsc ? (
                                  <MdArrowUpward size={15} className="th-sort-icon active" />
                                ) : (
                                  <MdArrowDownward size={15} className="th-sort-icon active" />
                                )
                              ) : (
                                <MdUnfoldMore size={15} className="th-sort-hint" />
                              )}
                            </span>
                          </button>
                        ) : (
                          <span className="th-col-label">{col.label}</span>
                        )}
                      </th>
                    ))}
                    {rowActions && (
                      <th className="th-actions-col" style={{ width: actionsWidth }}>
                        <span className="th-col-label">{actionsLabel}</span>
                      </th>
                    )}
                  </tr>
                  {!isServerPagination && (
                  <tr className="table-filter-row">
                    {columns.map(col => (
                      <td key={col.key} style={{ width: col.width }}>
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
                    {rowActions && <td className="td-actions-col" style={{ width: actionsWidth }} />}
                  </tr>
                  )}
                </thead>
                <tbody>
                  {pageItems.map(row => (
                    <tr key={row.id}>
                      {columns.map(col => (
                        <td
                          key={col.key}
                          style={{
                            width: col.width,
                            textAlign: col.align || 'left',
                            wordBreak: 'break-word',
                          }}
                        >
                          {col.render ? col.render(row) : (getCellText(row, col) || '—')}
                        </td>
                      ))}
                      {rowActions && (
                        <td className="td-actions-col" style={{ width: actionsWidth }}>
                          {rowActions(row)}
                        </td>
                      )}
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
              onPageSizeChange={handlePageSizeChange}
              page={page}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              total={total}
            />
          </>
        )}
      </div>
    </div>
  );
}
