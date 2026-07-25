'use client';

export type StatusPieSlice = { name: string; value: number; color: string };

/** Grey ring when there are no tests — Recharts draws nothing if all values are 0. */
export const EMPTY_STATUS_PIE_COLOR = '#e2e8f0';

export function statusPieData(slices: StatusPieSlice[], total: number): StatusPieSlice[] {
  if ((total || 0) <= 0) {
    return [{ name: 'Empty', value: 1, color: EMPTY_STATUS_PIE_COLOR }];
  }
  return slices;
}

/** Center total for Test Status donuts — place UNDER the chart so the hole reveals it and tooltips stay on top. */
export default function TestStatusDonutCenter({ total }: { total: number }) {
  return (
    <div className="sa-dash-donut-center" aria-hidden>
      <div className="sa-dash-donut-center-inner">
        <div className="sa-dash-donut-total-label">Total</div>
        <div className="sa-dash-donut-total-value">{Number(total || 0).toLocaleString()}</div>
        <div className="sa-dash-donut-total-sub">Tests</div>
      </div>
    </div>
  );
}
