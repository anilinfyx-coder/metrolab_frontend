'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  MdAccountBalanceWallet,
  MdArrowBack,
  MdAssignment,
  MdEdit,
  MdLocalHospital,
  MdPeople,
  MdSettings,
  MdWarningAmber,
} from 'react-icons/md';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import TopNav from '../../../../components/TopNav';
import PageLoader from '../../../../components/PageLoader';
import { formatDate, formatDateTime } from '../../../../utils/dateFormat';
import { apiFetch } from '../../../../../lib/api';

interface B2bProfileOverview {
  client: {
    id: number;
    company_name?: string;
    contact_person_name?: string;
    mobile?: string;
    email?: string;
    address?: string;
    website?: string;
    status?: boolean;
    wallet_balance?: number | string;
    creation_timestamp?: string;
  };
  kpis: {
    patients: number;
    corporates: number;
    assigned_tests: number;
    completed_tests: number;
    pending_tests: number;
    wallet_balance: number;
  };
  health: {
    subscription_status: 'active' | 'expiring' | 'expired' | 'none';
    active_subscription?: {
      start_date?: string;
      end_date?: string;
      amount?: number | string;
    } | null;
    latest_subscription?: {
      start_date?: string;
      end_date?: string;
      amount?: number | string;
    } | null;
    wallet_health: 'healthy' | 'low' | 'critical';
    low_wallet_threshold: number;
    last_report_at?: string | null;
    last_patient_at?: string | null;
  };
  activity: { range: string; items: { date: string; label: string; count: number }[] };
  status_distribution: { completed: number; pending: number; total: number };
  assigned_tests: {
    lab_test_id: number;
    lab_test_name?: string;
    completed_count: number;
    pending_count: number;
  }[];
  recent_patients: {
    id: number;
    name?: string;
    mobile?: string;
    email?: string;
    creation_timestamp?: string;
  }[];
  recent_reports: {
    id: number;
    uid?: string;
    lab_test_name?: string;
    patient_name?: string;
    final_result?: string;
    creation_timestamp?: string;
  }[];
  wallet_transactions: {
    id: number;
    transaction_type?: string;
    amount?: number | string;
    closing_balance?: number | string;
    description?: string;
    creation_timestamp?: string;
  }[];
  subscriptions: {
    id: number;
    start_date?: string;
    end_date?: string;
    amount?: number | string;
    status?: boolean;
  }[];
}

const cardShell = { marginBottom: 0 as const };
const STATUS_COLORS = { Completed: '#10b981', Pending: '#f59e0b' };

function money(value: number | string | undefined | null) {
  return `$${parseFloat(String(value ?? 0)).toFixed(2)}`;
}

function subLabel(status: B2bProfileOverview['health']['subscription_status']) {
  if (status === 'active') return { text: 'Active', tone: 'ok' as const };
  if (status === 'expiring') return { text: 'Expiring soon', tone: 'warn' as const };
  if (status === 'expired') return { text: 'Expired', tone: 'bad' as const };
  return { text: 'No subscription', tone: 'muted' as const };
}

function walletLabel(health: B2bProfileOverview['health']['wallet_health']) {
  if (health === 'healthy') return { text: 'Healthy', tone: 'ok' as const };
  if (health === 'low') return { text: 'Low balance', tone: 'warn' as const };
  return { text: 'Critical', tone: 'bad' as const };
}

function toneClass(tone: 'ok' | 'warn' | 'bad' | 'muted') {
  if (tone === 'ok') return 'b2b-profile-pill b2b-profile-pill-ok';
  if (tone === 'warn') return 'b2b-profile-pill b2b-profile-pill-warn';
  if (tone === 'bad') return 'b2b-profile-pill b2b-profile-pill-bad';
  return 'b2b-profile-pill b2b-profile-pill-muted';
}

export default function B2bClientProfilePage() {
  const params = useParams();
  const clientId = String(params?.id || '');
  const [activityRange, setActivityRange] = useState<'7d' | '30d'>('7d');

  const { data, isLoading, error } = useQuery({
    queryKey: ['superadmin-b2b-profile', clientId, activityRange],
    enabled: !!clientId,
    queryFn: () =>
      apiFetch<B2bProfileOverview>(
        `/api/SuperAdmin/b2bClientOverview/${clientId}?activityRange=${activityRange}`,
        { tokenKey: 'superadmin_token', errorFallback: 'Unable to load B2B lab profile.' },
      ),
  });

  const statusChartData = useMemo(() => {
    const completed = data?.status_distribution?.completed || 0;
    const pending = data?.status_distribution?.pending || 0;
    return [
      { name: 'Completed', value: completed, color: STATUS_COLORS.Completed },
      { name: 'Pending', value: pending, color: STATUS_COLORS.Pending },
    ];
  }, [data]);

  const statusTotal = data?.status_distribution?.total || 0;
  const activity = data?.activity?.items || [];
  const client = data?.client;
  const kpis = data?.kpis;
  const health = data?.health;
  const sub = health ? subLabel(health.subscription_status) : null;
  const wallet = health ? walletLabel(health.wallet_health) : null;

  const baseActions = `/superadmin/dashboard/b2bclient`;
  const editHref = `${baseActions}?view=edit&clientId=${clientId}`;
  const walletHref = `${baseActions}?view=wallet&clientId=${clientId}`;
  const subHref = `${baseActions}?view=subscription&clientId=${clientId}`;
  const accessHref = `${baseActions}?view=labtestaccess&clientId=${clientId}`;

  if (isLoading) {
    return (
      <div className="page-content">
        <TopNav title="B2B Lab Profile" />
        <div className="page-body">
          <PageLoader />
        </div>
      </div>
    );
  }

  if (error || !data || !client) {
    return (
      <div className="page-content">
        <TopNav title="B2B Lab Profile" />
        <div className="page-body">
          <div className="card">
            <div className="card-body" style={{ textAlign: 'center', padding: '2.5rem' }}>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
                {(error as Error)?.message || 'B2B Lab not found.'}
              </p>
              <Link href={baseActions} className="btn btn-ghost">
                <MdArrowBack size={16} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} aria-hidden />
                Back to B2B Labs
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <TopNav title={client.company_name || 'B2B Lab Profile'} />
      <div className="page-body b2b-profile-page">
        <div className="b2b-profile-header card">
          <div className="card-body b2b-profile-header-body">
            <div>
              <div className="b2b-profile-title-row">
                <h1 className="b2b-profile-title">{client.company_name || `Client #${client.id}`}</h1>
                <span
                  className={
                    client.status !== false
                      ? 'b2b-profile-pill b2b-profile-pill-ok'
                      : 'b2b-profile-pill b2b-profile-pill-bad'
                  }
                >
                  {client.status !== false ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="b2b-profile-contact">
                <span>{client.contact_person_name || '—'}</span>
                <span className="b2b-profile-dot">·</span>
                <span>{client.mobile || '—'}</span>
                <span className="b2b-profile-dot">·</span>
                <span>{client.email || '—'}</span>
              </div>
              {client.address ? <div className="sa-dash-muted" style={{ marginTop: 6 }}>{client.address}</div> : null}
            </div>
            <div className="b2b-profile-actions">
              <Link href={editHref} className="btn btn-ghost">
                <MdEdit size={16} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} aria-hidden />
                Edit
              </Link>
              <Link href={walletHref} className="btn btn-ghost">
                <MdAccountBalanceWallet size={16} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} aria-hidden />
                Wallet
              </Link>
              <Link href={subHref} className="btn btn-ghost">
                <MdAssignment size={16} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} aria-hidden />
                Subscriptions
              </Link>
              <Link href={accessHref} className="btn btn-primary">
                <MdSettings size={16} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} aria-hidden />
                Lab Test Access
              </Link>
              <Link href={baseActions} className="btn btn-ghost">
                <MdArrowBack size={16} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} aria-hidden />
                Back
              </Link>
            </div>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '20px',
          marginBottom: '24px',
        }}>
          <DashboardCard
            title="Patients"
            value={kpis?.patients ?? 0}
            icon={<MdPeople size={28} aria-hidden />}
            gradient="linear-gradient(135deg, #f12711 0%, #f5af19 100%)"
          />
          <DashboardCard
            title="Corporates"
            value={kpis?.corporates ?? 0}
            icon={<MdLocalHospital size={28} aria-hidden />}
            gradient="linear-gradient(135deg, #8E2DE2 0%, #4A00E0 100%)"
          />
          <DashboardCard
            title="Assigned Tests"
            value={kpis?.assigned_tests ?? 0}
            icon={<MdSettings size={28} aria-hidden />}
            gradient="linear-gradient(135deg, #0072ff 0%, #00c6ff 100%)"
          />
          <DashboardCard
            title="Completed"
            value={kpis?.completed_tests ?? 0}
            icon={<MdAssignment size={28} aria-hidden />}
            gradient="linear-gradient(135deg, #11998e 0%, #38ef7d 100%)"
          />
          <DashboardCard
            title="Wallet"
            value={money(kpis?.wallet_balance)}
            icon={<MdAccountBalanceWallet size={28} aria-hidden />}
            gradient="linear-gradient(135deg, #FF416C 0%, #FF4B2B 100%)"
          />
        </div>

        <div className="b2b-profile-health-grid">
          <div className="card" style={cardShell}>
            <div className="card-body">
              <div className="sa-dash-card-title" style={{ marginBottom: 10 }}>Subscription</div>
              {sub ? <span className={toneClass(sub.tone)}>{sub.text}</span> : null}
              {health?.active_subscription ? (
                <div className="sa-dash-muted" style={{ marginTop: 10, fontSize: '0.85rem' }}>
                  {formatDate(health.active_subscription.start_date)} → {formatDate(health.active_subscription.end_date)}
                  {' · '}
                  {money(health.active_subscription.amount)}
                </div>
              ) : health?.latest_subscription ? (
                <div className="sa-dash-muted" style={{ marginTop: 10, fontSize: '0.85rem' }}>
                  Last ended {formatDate(health.latest_subscription.end_date)}
                </div>
              ) : (
                <div className="sa-dash-muted" style={{ marginTop: 10, fontSize: '0.85rem' }}>No subscription history.</div>
              )}
            </div>
          </div>
          <div className="card" style={cardShell}>
            <div className="card-body">
              <div className="sa-dash-card-title" style={{ marginBottom: 10 }}>Wallet health</div>
              {wallet ? <span className={toneClass(wallet.tone)}>{wallet.text}</span> : null}
              <div className="sa-dash-muted" style={{ marginTop: 10, fontSize: '0.85rem' }}>
                Balance {money(kpis?.wallet_balance)} (alert ≤ {money(health?.low_wallet_threshold)})
              </div>
            </div>
          </div>
          <div className="card" style={cardShell}>
            <div className="card-body">
              <div className="sa-dash-card-title" style={{ marginBottom: 10 }}>Recent activity</div>
              <div className="sa-dash-muted" style={{ fontSize: '0.85rem', lineHeight: 1.6 }}>
                <div>Last report: {health?.last_report_at ? formatDateTime(health.last_report_at) : '—'}</div>
                <div>Last patient: {health?.last_patient_at ? formatDateTime(health.last_patient_at) : '—'}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="sa-dash-charts-row">
          <div className="card" style={cardShell}>
            <div className="sa-dash-card-header">
              <h3 className="sa-dash-card-title">Lab Test Activity</h3>
              <select
                className="sa-dash-select"
                value={activityRange}
                onChange={e => setActivityRange(e.target.value as '7d' | '30d')}
                aria-label="Lab test activity range"
              >
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
              </select>
            </div>
            <div className="sa-dash-chart-body">
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={activity} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="b2bProfileTestsFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} width={36} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                    formatter={(value) => [Number(value || 0).toLocaleString(), 'Tests']}
                  />
                  <Legend formatter={() => 'Tests Completed'} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    name="Tests Completed"
                    stroke="#3b82f6"
                    strokeWidth={2.5}
                    fill="url(#b2bProfileTestsFill)"
                    dot={{ r: 3, fill: '#3b82f6', strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card" style={cardShell}>
            <div className="sa-dash-card-header">
              <h3 className="sa-dash-card-title">Test Status</h3>
            </div>
            <div className="sa-dash-donut-wrap">
              <div className="sa-dash-donut-chart">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={statusChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={74}
                      paddingAngle={2}
                    >
                      {statusChartData.map(entry => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => Number(value || 0).toLocaleString()} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="sa-dash-donut-center">
                  <div className="sa-dash-donut-total-label">Total</div>
                  <div className="sa-dash-donut-total-value">{statusTotal.toLocaleString()}</div>
                  <div className="sa-dash-donut-total-sub">Tests</div>
                </div>
              </div>
              <div className="sa-dash-donut-legend">
                {statusChartData.map(item => {
                  const pct = statusTotal > 0 ? ((item.value / statusTotal) * 100).toFixed(1) : '0.0';
                  return (
                    <div key={item.name} className="sa-dash-donut-legend-row">
                      <span className="sa-dash-dot" style={{ background: item.color }} />
                      <span className="sa-dash-donut-legend-name">{item.name}</span>
                      <span className="sa-dash-donut-legend-value">
                        {item.value.toLocaleString()} <span>({pct}%)</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="b2b-profile-tables-grid">
          <ProfileTable
            title="Assigned Tests"
            viewAllHref={accessHref}
            headers={['Test', 'Completed', 'Pending']}
            empty="No assigned tests."
            rows={data.assigned_tests.map(t => [
              t.lab_test_name || `Test #${t.lab_test_id}`,
              String(t.completed_count || 0),
              String(t.pending_count || 0),
            ])}
          />
          <ProfileTable
            title="Recent Patients"
            headers={['Name', 'Mobile', 'Added']}
            empty="No patients yet."
            rows={data.recent_patients.map(p => [
              p.name || `Patient #${p.id}`,
              p.mobile || '—',
              formatDate(p.creation_timestamp),
            ])}
          />
          <ProfileTable
            title="Recent Reports"
            headers={['Patient', 'Test', 'Date']}
            empty="No reports yet."
            rows={data.recent_reports.map(r => [
              r.patient_name || '—',
              r.lab_test_name || '—',
              formatDate(r.creation_timestamp),
            ])}
          />
          <ProfileTable
            title="Wallet Transactions"
            viewAllHref={walletHref}
            headers={['Date', 'Type', 'Amount']}
            empty="No wallet transactions."
            rows={data.wallet_transactions.map(t => [
              formatDateTime(t.creation_timestamp),
              t.transaction_type || '—',
              `${t.transaction_type === 'CREDIT' ? '+' : '-'}${money(t.amount).slice(1)}`,
            ])}
          />
          <ProfileTable
            title="Subscription History"
            viewAllHref={subHref}
            headers={['Start', 'End', 'Amount']}
            empty="No subscriptions."
            rows={data.subscriptions.map(s => [
              formatDate(s.start_date),
              formatDate(s.end_date),
              money(s.amount),
            ])}
          />
        </div>
      </div>
    </div>
  );
}

function ProfileTable({
  title,
  headers,
  rows,
  empty,
  viewAllHref,
}: {
  title: string;
  headers: string[];
  rows: string[][];
  empty: string;
  viewAllHref?: string;
}) {
  return (
    <div className="card" style={cardShell}>
      <div className="sa-dash-card-header">
        <h3 className="sa-dash-card-title">{title}</h3>
        {viewAllHref ? (
          <Link href={viewAllHref} className="sa-dash-link">
            View All
          </Link>
        ) : null}
      </div>
      <div className="card-body" style={{ padding: 0 }}>
        {rows.length === 0 ? (
          <div style={{ padding: '1.25rem 1.25rem', color: '#94a3b8', fontSize: '0.875rem' }}>{empty}</div>
        ) : (
          <table className="b2b-profile-table">
            <thead>
              <tr>
                {headers.map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={`${title}-${idx}`}>
                  {row.map((cell, cIdx) => (
                    <td key={`${title}-${idx}-${cIdx}`}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function DashboardCard({ title, value, icon, gradient }: { title: string, value: number | string, icon: React.ReactNode, gradient: string }) {
  return (
    <div style={{
      background: '#fff',
      borderRadius: '16px',
      padding: '24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '12px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
      transition: 'transform 0.3s ease, box-shadow 0.3s ease',
      cursor: 'default',
      position: 'relative',
      overflow: 'hidden',
      minWidth: 0,
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-5px)';
      e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.08)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.03)';
    }}
    >
      <div style={{
        position: 'absolute',
        top: 0, left: 0, width: '100%', height: '4px',
        background: gradient,
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          color: '#64748b',
          fontSize: '0.9rem',
          fontWeight: 600,
          marginBottom: '8px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          lineHeight: 1.3,
          overflowWrap: 'break-word',
          wordBreak: 'break-word',
        }}>
          {title}
        </div>
        <div style={{
          color: '#0f172a',
          fontSize: '2rem',
          fontWeight: 800,
          lineHeight: 1.15,
          overflowWrap: 'anywhere',
        }}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
      </div>
      <div style={{
        width: '56px', height: '56px',
        borderRadius: '12px',
        background: gradient,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff',
        boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
        flexShrink: 0,
      }}>
        {icon}
      </div>
    </div>
  );
}
