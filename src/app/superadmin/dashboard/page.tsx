'use client';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
  MdAccountBalanceWallet,
  MdApartment,
  MdAttachMoney,
  MdBiotech,
  MdBusiness,
  MdCardMembership,
  MdChevronRight,
  MdErrorOutline,
  MdLanguage,
  MdPeople,
  MdWarningAmber,
} from 'react-icons/md';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import TopNav from '../../components/TopNav';
import PageLoader from '../../components/PageLoader';
import TestStatusDonutCenter, { statusPieData } from '../../components/TestStatusDonutCenter';
import { formatDate } from '../../utils/dateFormat';
import { apiFetch } from '../../../lib/api';

interface ActiveSubscription {
  id: number;
  b2b_client_id: number;
  company_name?: string;
  contact_person_name?: string;
  email?: string;
  mobile?: string;
  start_date?: string;
  end_date?: string;
  amount?: number | string;
  creation_timestamp?: string;
}

interface TopLabTest {
  lab_test_id: number;
  lab_test_name?: string;
  completed_count: number;
}

interface RecentB2BClient {
  id: number;
  company_name?: string;
  contact_person_name?: string;
  mobile?: string;
  email?: string;
  wallet_balance?: number | string;
  billing_mode?: string;
  has_active_subscription?: boolean;
  active_subscription_amount?: number | string | null;
  status?: boolean;
  creation_timestamp?: string;
}

interface ActivityPoint {
  date: string;
  label: string;
  count: number;
}

interface StatusDistribution {
  completed: number;
  pending: number;
  total: number;
}

interface RevenuePoint {
  month_key: string;
  label: string;
  revenue: number;
  subscriptions: number;
}

interface DashboardAlerts {
  expiring_subscriptions: number;
  expired_subscriptions: number;
  low_wallets: number;
  low_wallet_threshold: number;
}

const STATUS_COLORS = {
  completed: '#22c55e',
  pending: '#f59e0b',
};

const cardShell: React.CSSProperties = {
  borderRadius: 12,
  border: 'none',
  boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
  background: '#fff',
  height: '100%',
};

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const [recentB2BClients, setRecentB2BClients] = useState<RecentB2BClient[]>([]);
  const [activeSubscriptions, setActiveSubscriptions] = useState<ActiveSubscription[]>([]);
  const [topLabTests, setTopLabTests] = useState<TopLabTest[]>([]);
  const [activityRange, setActivityRange] = useState<'7d' | '30d'>('7d');
  const [activity, setActivity] = useState<ActivityPoint[]>([]);
  const [statusRange, setStatusRange] = useState<'today' | '7d' | '30d' | 'all'>('today');
  const [statusDist, setStatusDist] = useState<StatusDistribution>({ completed: 0, pending: 0, total: 0 });
  const [revenueRange, setRevenueRange] = useState<'7d' | 'current_month' | 'last_month' | '6m'>('6m');
  const [revenue, setRevenue] = useState<RevenuePoint[]>([]);
  const [alerts, setAlerts] = useState<DashboardAlerts>({
    expiring_subscriptions: 0,
    expired_subscriptions: 0,
    low_wallets: 0,
    low_wallet_threshold: 50,
  });
  const [loading, setLoading] = useState(true);
  const initialLoadDone = useRef(false);

  useEffect(() => {
    const fetchBase = async () => {
      try {
        const overview = await apiFetch<{
          stats?: Record<string, number>;
          latest_b2b_clients?: RecentB2BClient[];
          active_subscriptions?: ActiveSubscription[];
          top_lab_tests?: TopLabTest[];
          activity?: { items?: ActivityPoint[] };
          status_distribution?: StatusDistribution;
          revenue?: { items?: RevenuePoint[] };
          alerts?: DashboardAlerts;
        }>(`/api/SuperAdmin/dashboardOverview?activityRange=${activityRange}&revenueRange=${revenueRange}&statusRange=${statusRange}`, {
          tokenKey: 'superadmin_token',
        }).catch(() => null);

        if (!overview) return;

        if (overview.stats) setStats(overview.stats);
        setRecentB2BClients(overview.latest_b2b_clients || []);
        setActiveSubscriptions(overview.active_subscriptions || []);
        setTopLabTests(overview.top_lab_tests || []);
        setActivity(overview.activity?.items || []);
        if (overview.status_distribution) setStatusDist(overview.status_distribution);
        setRevenue(overview.revenue?.items || []);
        if (overview.alerts) setAlerts(overview.alerts);
      } finally {
        setLoading(false);
        initialLoadDone.current = true;
      }
    };

    void fetchBase();
    // Initial ranges are intentional for first paint; later changes use dedicated fetches.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!initialLoadDone.current) return;

    const fetchActivity = async () => {
      try {
        const data = await apiFetch<{ items?: ActivityPoint[] }>(
          `/api/SuperAdmin/labTestActivity?range=${activityRange}`,
          { tokenKey: 'superadmin_token' },
        );
        setActivity(data?.items || []);
      } catch {
        setActivity([]);
      }
    };
    void fetchActivity();
  }, [activityRange]);

  useEffect(() => {
    if (!initialLoadDone.current) return;

    const fetchStatus = async () => {
      try {
        const data = await apiFetch<StatusDistribution>(
          `/api/SuperAdmin/testStatusDistribution?range=${statusRange}`,
          { tokenKey: 'superadmin_token' },
        );
        if (data) setStatusDist(data);
      } catch {
        setStatusDist({ completed: 0, pending: 0, total: 0 });
      }
    };
    void fetchStatus();
  }, [statusRange]);

  useEffect(() => {
    if (!initialLoadDone.current) return;

    const fetchRevenue = async () => {
      try {
        const data = await apiFetch<{ items?: RevenuePoint[] }>(
          `/api/SuperAdmin/revenueSubscriptionOverview?range=${revenueRange}`,
          { tokenKey: 'superadmin_token' },
        );
        setRevenue(data?.items || []);
      } catch {
        setRevenue([]);
      }
    };
    void fetchRevenue();
  }, [revenueRange]);

  const statusChartData = useMemo(() => ([
    { name: 'Completed', value: statusDist.completed || 0, color: STATUS_COLORS.completed },
    { name: 'Pending', value: statusDist.pending || 0, color: STATUS_COLORS.pending },
  ]), [statusDist]);

  const statusTotal = statusDist.total || (statusDist.completed + statusDist.pending);
  const statusPieSlices = useMemo(
    () => statusPieData(statusChartData, statusTotal),
    [statusChartData, statusTotal],
  );

  return (
    <>
      <TopNav title="Dashboard" />

      <div className="page-content" style={{ backgroundColor: '#f0f4f8', width: '100%' }}>
        {loading ? (
          <div className="page-body">
            <PageLoader message="Loading dashboard..." size="lg" />
          </div>
        ) : (
          <div className="page-body">
            <div className="sa-dash-kpi-grid">
              <DashboardCard
                title="B2B Client"
                value={stats?.total_b2b_clients || 0}
                icon={<MdBusiness size={26} aria-hidden />}
                gradient="linear-gradient(135deg, #11998e 0%, #38ef7d 100%)"
              />
              <DashboardCard
                title="WhiteLabel Client"
                value={stats?.total_whitelabel_clients || 0}
                icon={<MdLanguage size={26} aria-hidden />}
                gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
              />
              <DashboardCard
                title="Corporate Client"
                value={stats?.total_corporate_clients || 0}
                icon={<MdApartment size={26} aria-hidden />}
                gradient="linear-gradient(135deg, #8E2DE2 0%, #4A00E0 100%)"
              />
              <DashboardCard
                title="Income"
                value={`$${Number(stats?.total_income || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
                subtitle={`Sub $${Number(stats?.total_subscription_income || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} • Wallet $${Number(stats?.total_wallet_recharge || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
                icon={<MdAttachMoney size={26} aria-hidden />}
                gradient="linear-gradient(135deg, #0ba360 0%, #3cba92 100%)"
              />
              <DashboardCard
                title="Active Subscription"
                value={stats?.total_active_subscriptions || 0}
                icon={<MdCardMembership size={26} aria-hidden />}
                gradient="linear-gradient(135deg, #FF416C 0%, #FF4B2B 100%)"
              />
              <DashboardCard
                title="Completed Test"
                value={stats?.total_lab_tests || 0}
                icon={<MdBiotech size={26} aria-hidden />}
                gradient="linear-gradient(135deg, #0072ff 0%, #00c6ff 100%)"
              />
              <DashboardCard
                title="Total Patients"
                value={stats?.total_patients || 0}
                icon={<MdPeople size={26} aria-hidden />}
                gradient="linear-gradient(135deg, #f12711 0%, #f5af19 100%)"
              />
            </div>

            {/* Charts row */}
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
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={activity} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} width={36} />
                      <Tooltip
                        cursor={false}
                        contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                        formatter={(value) => [Number(value || 0).toLocaleString(), 'Tests']}
                      />
                      <Legend formatter={() => 'Tests Completed'} />
                      <Bar
                        dataKey="count"
                        name="Tests Completed"
                        fill="#3b82f6"
                        radius={[4, 4, 0, 0]}
                        barSize={activityRange === '30d' ? 12 : 22}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="card" style={cardShell}>
                <div className="sa-dash-card-header">
                  <h3 className="sa-dash-card-title">Test Status</h3>
                  <select
                    className="sa-dash-select"
                    value={statusRange}
                    onChange={e => setStatusRange(e.target.value as typeof statusRange)}
                    aria-label="Test status range"
                  >
                    <option value="today">Today</option>
                    <option value="7d">Last 7 Days</option>
                    <option value="30d">Last 30 Days</option>
                    <option value="all">All Time</option>
                  </select>
                </div>
                <div className="sa-dash-donut-wrap">
                  <div className="sa-dash-donut-chart">
                    <TestStatusDonutCenter total={statusTotal} />
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={statusPieSlices}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={58}
                          outerRadius={82}
                          paddingAngle={statusTotal > 0 ? 2 : 0}
                          stroke="none"
                        >
                          {statusPieSlices.map(entry => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        {statusTotal > 0 ? (
                          <Tooltip
                            formatter={(value) => Number(value || 0).toLocaleString()}
                            offset={18}
                            allowEscapeViewBox={{ x: true, y: true }}
                            wrapperStyle={{ zIndex: 20, outline: 'none' }}
                            contentStyle={{
                              background: '#ffffff',
                              borderRadius: 8,
                              border: '1px solid #e2e8f0',
                              boxShadow: '0 10px 24px rgba(15, 23, 42, 0.14)',
                              fontSize: 12,
                              padding: '8px 10px',
                              color: '#0f172a',
                            }}
                            itemStyle={{ color: '#0f172a', fontWeight: 600 }}
                            labelStyle={{ color: '#64748b', fontWeight: 600, marginBottom: 2 }}
                          />
                        ) : null}
                      </PieChart>
                    </ResponsiveContainer>
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

              <div className="card" style={cardShell}>
                <div className="sa-dash-card-header">
                  <h3 className="sa-dash-card-title">Revenue & Subscription Overview</h3>
                  <select
                    className="sa-dash-select"
                    value={revenueRange}
                    onChange={e => setRevenueRange(e.target.value as typeof revenueRange)}
                    aria-label="Revenue and subscription range"
                  >
                    <option value="7d">Last 7 Days</option>
                    <option value="current_month">Current month</option>
                    <option value="last_month">Last Month</option>
                    <option value="6m">Last 6 Months</option>
                  </select>
                </div>
                <div className="sa-dash-chart-body">
                  <ResponsiveContainer width="100%" height={260}>
                    <ComposedChart data={revenue} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis
                        yAxisId="left"
                        tick={{ fill: '#64748b', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        width={42}
                        tickFormatter={(v) => `$${Number(v).toLocaleString()}`}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        allowDecimals={false}
                        tick={{ fill: '#64748b', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        width={28}
                      />
                      <Tooltip
                        contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                        formatter={(value, name) => {
                          const n = Number(value || 0);
                          if (name === 'Revenue ($)') return [`$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, name];
                          return [n.toLocaleString(), name];
                        }}
                      />
                      <Legend />
                      <Bar yAxisId="left" dataKey="revenue" name="Revenue ($)" fill="#93c5fd" radius={[4, 4, 0, 0]} barSize={22} />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="subscriptions"
                        name="Subscriptions"
                        stroke="#16a34a"
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: '#16a34a', strokeWidth: 0 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Bottom tables: left = clients/tests, right = alerts/subscriptions */}
            <div className="sa-dash-bottom-row">
              <div className="card" style={cardShell}>
                <div className="sa-dash-card-header">
                  <h3 className="sa-dash-card-title">Latest B2B Clients</h3>
                  <Link href="/superadmin/dashboard/b2bclient" className="sa-dash-link">View All →</Link>
                </div>
                <div className="card-body" style={{ padding: 0 }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f8fafc', color: '#64748b', textAlign: 'left' }}>
                          <th style={{ padding: '12px 20px', fontWeight: 700, color: '#64748b' }}>Company</th>
                          <th style={{ padding: '12px 20px', fontWeight: 700, color: '#64748b' }}>Contact</th>
                          <th style={{ padding: '12px 20px', fontWeight: 700, color: '#64748b' }}>Subscription & Wallet</th>
                          <th style={{ padding: '12px 20px', fontWeight: 700, color: '#64748b' }}>Added</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentB2BClients.length === 0 ? (
                          <tr>
                            <td colSpan={4} style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
                              No B2B clients found.
                            </td>
                          </tr>
                        ) : (
                          recentB2BClients.map((client) => (
                            <tr key={client.id} style={{ borderBottom: '1px solid #edf2f9' }}>
                              <td style={{ padding: '16px 20px', color: '#334155' }}>
                                <Link
                                  href={`/superadmin/dashboard/b2bclient/${client.id}`}
                                  style={{ color: '#334155', textDecoration: 'none', fontWeight: 600 }}
                                >
                                  {client.company_name || `Client #${client.id}`}
                                </Link>
                                <div style={{ marginTop: 4 }}>
                                  <span style={{
                                    backgroundColor: client.status !== false ? '#dcfce7' : '#fee2e2',
                                    color: client.status !== false ? '#16a34a' : '#dc2626',
                                    padding: '2px 8px',
                                    borderRadius: '999px',
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                  }}>
                                    {client.status !== false ? 'Active' : 'Inactive'}
                                  </span>
                                </div>
                              </td>
                              <td style={{ padding: '16px 20px', color: '#334155' }}>
                                <div style={{ fontWeight: 500 }}>{client.contact_person_name || '—'}</div>
                                <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{client.mobile || client.email || '—'}</div>
                              </td>
                              <td style={{ padding: '16px 20px' }}>
                                {client.billing_mode === 'custom' ? (
                                  <>
                                    <div style={{ color: '#0ea5e9', fontWeight: 600, fontSize: '0.9rem', marginBottom: '4px' }}>Custom Pricing Active</div>
                                    <Link
                                      href={`/superadmin/dashboard/b2bclient?view=wallet&clientId=${client.id}`}
                                      style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 600 }}
                                      title="Wallet Balance"
                                    >
                                      ${parseFloat(String(client.wallet_balance || 0)).toFixed(2)}
                                    </Link>
                                  </>
                                ) : client.has_active_subscription ? (
                                  <span style={{ color: '#16a34a', fontWeight: 600, fontSize: '0.9rem' }}>
                                    {client.billing_mode === 'yearly' ? 'Yearly' : 'Monthly'} Subscription Active
                                    {client.active_subscription_amount && ` ($${Number(client.active_subscription_amount).toFixed(2)})`}
                                  </span>
                                ) : (
                                  <span style={{ color: '#ef4444', fontWeight: 600, fontSize: '0.9rem' }}>No Subscription Active</span>
                                )}
                              </td>
                              <td style={{ padding: '16px 20px', color: '#64748b', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                                {client.creation_timestamp ? formatDate(client.creation_timestamp) : 'N/A'}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="card" style={cardShell}>
                <div className="sa-dash-card-header">
                  <h3 className="sa-dash-card-title">Subscription & Wallet Alerts</h3>
                  <Link href="/superadmin/dashboard/b2bclient" className="sa-dash-link">View All →</Link>
                </div>
                <div className="sa-dash-alerts">
                  <AlertRow
                    href="/superadmin/dashboard/b2bclient"
                    icon={<MdWarningAmber size={18} />}
                    tone="red"
                    title={`${alerts.expiring_subscriptions} Subscriptions Expiring`}
                    subtitle="Within next 7 days"
                  />
                  <AlertRow
                    href="/superadmin/dashboard/b2bclient"
                    icon={<MdErrorOutline size={18} />}
                    tone="orange"
                    title={`${alerts.expired_subscriptions} Expired Subscriptions`}
                    subtitle="Action required"
                  />
                  <AlertRow
                    href="/superadmin/dashboard/b2bclient"
                    icon={<MdAccountBalanceWallet size={18} />}
                    tone="yellow"
                    title={`${alerts.low_wallets} Low Wallet Balances`}
                    subtitle={`Below $${alerts.low_wallet_threshold}`}
                  />
                </div>
              </div>

              <div className="card" style={cardShell}>
                <div className="sa-dash-card-header">
                  <h3 className="sa-dash-card-title">Most Running Lab Tests</h3>
                  <Link href="/superadmin/dashboard/labtestcategory" className="sa-dash-link">View Lab Tests →</Link>
                </div>
                <div className="card-body" style={{ padding: 0 }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f8fafc', color: '#64748b', textAlign: 'left' }}>
                          <th style={{ padding: '12px 20px', fontWeight: 700, color: '#64748b' }}>#</th>
                          <th style={{ padding: '12px 20px', fontWeight: 700, color: '#64748b' }}>Lab Test</th>
                          <th style={{ padding: '12px 20px', fontWeight: 700, color: '#64748b' }}>Completed</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topLabTests.length === 0 ? (
                          <tr>
                            <td colSpan={3} style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
                              No completed lab tests yet.
                            </td>
                          </tr>
                        ) : (
                          topLabTests.map((test, index) => (
                            <tr key={test.lab_test_id} style={{ borderBottom: '1px solid #edf2f9' }}>
                              <td style={{ padding: '16px 20px', color: '#94a3b8', fontWeight: 600 }}>{index + 1}</td>
                              <td style={{ padding: '16px 20px', color: '#334155', fontWeight: 500 }}>
                                {test.lab_test_name || `Test #${test.lab_test_id}`}
                              </td>
                              <td style={{ padding: '16px 20px' }}>
                                <span style={{
                                  backgroundColor: '#dbeafe',
                                  color: '#1d4ed8',
                                  padding: '4px 10px',
                                  borderRadius: '999px',
                                  fontSize: '0.8rem',
                                  fontWeight: 700,
                                }}>
                                  {test.completed_count}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="card" style={cardShell}>
                <div className="sa-dash-card-header">
                  <h3 className="sa-dash-card-title">Latest Active Subscriptions</h3>
                  <Link href="/superadmin/dashboard/b2bclient" className="sa-dash-link">View All →</Link>
                </div>
                <div className="card-body" style={{ padding: 0 }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f8fafc', color: '#64748b', textAlign: 'left' }}>
                          <th style={{ padding: '12px 20px', fontWeight: 700, color: '#64748b' }}>B2B Client</th>
                          <th style={{ padding: '12px 20px', fontWeight: 700, color: '#64748b' }}>Period</th>
                          <th style={{ padding: '12px 20px', fontWeight: 700, color: '#64748b' }}>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeSubscriptions.length === 0 ? (
                          <tr>
                            <td colSpan={3} style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
                              No active subscriptions found.
                            </td>
                          </tr>
                        ) : (
                          activeSubscriptions.slice(0, 5).map((sub) => (
                            <tr key={sub.id} style={{ borderBottom: '1px solid #edf2f9' }}>
                              <td style={{ padding: '16px 20px', color: '#334155' }}>
                                <Link
                                  href={`/superadmin/dashboard/b2bclient?view=subscription&clientId=${sub.b2b_client_id}`}
                                  style={{ color: '#334155', textDecoration: 'none', fontWeight: 500 }}
                                >
                                  {sub.company_name || `Client #${sub.b2b_client_id}`}
                                </Link>
                                <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{sub.email || sub.mobile || '—'}</div>
                              </td>
                              <td style={{ padding: '16px 20px', color: '#64748b', fontSize: '0.85rem' }}>
                                {(sub.start_date ? formatDate(sub.start_date) : '—')} – {(sub.end_date ? formatDate(sub.end_date) : '—')}
                              </td>
                              <td style={{ padding: '16px 20px', color: '#0f172a', fontWeight: 600 }}>
                                ${parseFloat(String(sub.amount || 0)).toFixed(2)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function AlertRow({
  href,
  icon,
  tone,
  title,
  subtitle,
}: {
  href: string;
  icon: ReactNode;
  tone: 'red' | 'orange' | 'yellow';
  title: string;
  subtitle: string;
}) {
  return (
    <Link href={href} className={`sa-dash-alert-row sa-dash-alert-${tone}`}>
      <span className="sa-dash-alert-icon" aria-hidden>{icon}</span>
      <span className="sa-dash-alert-text">
        <span className="sa-dash-alert-title">{title}</span>
        <span className="sa-dash-alert-sub">{subtitle}</span>
      </span>
      <MdChevronRight size={20} className="sa-dash-alert-chevron" aria-hidden />
    </Link>
  );
}

function DashboardCard({
  title,
  value,
  subtitle,
  icon,
  gradient,
}: {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: ReactNode;
  gradient: string;
}) {
  return (
    <div className="sa-dash-kpi-card">
      <div className="sa-dash-kpi-card-bar" style={{ background: gradient }} />
      <div className="sa-dash-kpi-card-title">{title}</div>
      <div className="sa-dash-kpi-card-main">
        <div className="sa-dash-kpi-card-body">
          <div className="sa-dash-kpi-card-value">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </div>
          {subtitle ? <div className="sa-dash-kpi-card-subtitle">{subtitle}</div> : null}
        </div>
        <div className="sa-dash-kpi-card-icon" style={{ background: gradient }}>
          {icon}
        </div>
      </div>
    </div>
  );
}
