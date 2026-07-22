/** Update a single row in a list by id without refetching the whole list. */
export function patchListItem<T extends { id: number | string }>(
  items: T[],
  id: number | string,
  patch: Partial<T>,
): T[] {
  return items.map((item) => (item.id === id ? { ...item, ...patch } : item));
}
