'use client';
import { useEffect, useMemo, useState } from 'react';

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

export function useClientPagination<T>(items: T[], defaultSize = 10) {
  const [pageSize, setPageSize] = useState(defaultSize);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [items, pageSize]);

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  return {
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    pageItems,
    total,
  };
}

type TablePaginationProps = {
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  total?: number;
};

export default function TablePagination({
  pageSize,
  onPageSizeChange,
  page = 1,
  totalPages = 1,
  onPageChange,
  total,
}: TablePaginationProps) {
  return (
    <div className="table-pagination">
      <div className="table-pagination-info">
        {typeof total === 'number' ? (
          <span>
            Showing {total === 0 ? 0 : (page - 1) * pageSize + 1}
            –{Math.min(page * pageSize, total)} of {total}
          </span>
        ) : (
          <span />
        )}
      </div>
      <div className="table-pagination-controls">
        {onPageChange && totalPages > 1 && (
          <div className="table-pagination-pages">
            <button
              type="button"
              className="page-size-btn"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              title="Previous"
            >
              ‹
            </button>
            <span className="table-pagination-page-label">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              className="page-size-btn"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              title="Next"
            >
              ›
            </button>
          </div>
        )}
        <div className="page-size-group" role="group" aria-label="Rows per page">
          {PAGE_SIZE_OPTIONS.map((size) => (
            <button
              key={size}
              type="button"
              className={`page-size-btn${pageSize === size ? ' active' : ''}`}
              onClick={() => onPageSizeChange(size)}
            >
              {size}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
