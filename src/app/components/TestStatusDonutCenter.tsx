'use client';

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
