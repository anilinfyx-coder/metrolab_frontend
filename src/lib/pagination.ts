export type PaginatedResult<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export function isPaginatedResult<T>(value: unknown): value is PaginatedResult<T> {
  return (
    !!value &&
    typeof value === 'object' &&
    Array.isArray((value as PaginatedResult<T>).items) &&
    typeof (value as PaginatedResult<T>).total === 'number'
  );
}

export function buildPageQuery(page: number, limit: number, extra?: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', String(limit));
  if (extra) {
    for (const [key, val] of Object.entries(extra)) {
      if (val !== undefined && val !== '') params.set(key, String(val));
    }
  }
  return params.toString();
}
