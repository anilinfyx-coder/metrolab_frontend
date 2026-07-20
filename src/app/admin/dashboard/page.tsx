'use client';
import { useEffect, useState } from 'react';
import {
  MdAdd,
  MdAssignment,
  MdBarChart,
  MdBiotech,
  MdBusiness,
  MdLocalHospital,
  MdRocketLaunch,
  MdScience,
  MdVpnKey,
  MdWavingHand,
} from 'react-icons/md';
import TopNav from '../../components/TopNav';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

function useApi(endpoint: string) {
  const [data, setData] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(`${API_BASE}${endpoint}`, {
      headers: { token: token || '', 'Content-Type': 'application/json' }
    })
      .then(r => r.json())
      .then(d => { if (d.response_code === '200') setData(d.obj); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [endpoint]);
  return { data, loading };
}

export default function DashboardPage() {
  const { data: patients, loading: l1 } = useApi('/api/Patient');
  const { data: labTests, loading: l2 } = useApi('/api/LabTests');
  const { data: b2bClients, loading: l3 } = useApi('/api/B2bClients');
  const { data: adminUsers, loading: l4 } = useApi('/api/AdminUsers');

  const stats = [
    { label: 'Total Patients', value: patients.length, icon: <MdLocalHospital size={24} />, color: 'blue' },
    { label: 'Lab Tests',      value: labTests.length,  icon: <MdBiotech size={24} />,  color: 'purple' },
    { label: 'B2B Clients',    value: b2bClients.length, icon: <MdBusiness size={24} />, color: 'green' },
    { label: 'Admin Users',    value: adminUsers.length, icon: <MdVpnKey size={24} />, color: 'orange' },
  ];

  const loading = l1 || l2 || l3 || l4;

  return (
    <>
      <TopNav title="Dashboard" />

      <div className="page-content">
        <div className="page-header">
          <div>
            <h2 className="page-title">Welcome back <MdWavingHand size={22} style={{ verticalAlign: 'text-bottom' }} aria-hidden /></h2>
            <p className="page-subtitle">Here&apos;s what&apos;s happening in your lab today.</p>
          </div>
        </div>

        <div className="stats-grid">
          {stats.map(stat => (
            <div key={stat.label} className="stat-card">
              <div className={`stat-icon ${stat.color}`}>{stat.icon}</div>
              <div>
                <div className="stat-value">
                  {loading ? <span className="loading">—</span> : stat.value}
                </div>
                <div className="stat-label">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
          <div className="card">
            <div className="card-header">
              <span className="card-title"><MdRocketLaunch size={18} style={{ verticalAlign: 'text-bottom', marginRight: '0.35rem' }} aria-hidden />Quick Actions</span>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <a href="/admin/dashboard/patients" className="btn btn-primary" id="quick-add-patient"><MdAdd size={16} style={{ verticalAlign: 'text-bottom', marginRight: '0.35rem' }} aria-hidden />Add New Patient</a>
              <a href="/admin/dashboard/test-requests" className="btn btn-ghost" id="quick-test-request"><MdScience size={16} style={{ verticalAlign: 'text-bottom', marginRight: '0.35rem' }} aria-hidden />New Test Request</a>
              <a href="/admin/dashboard/waiting-list" className="btn btn-ghost" id="quick-waiting-list"><MdAssignment size={16} style={{ verticalAlign: 'text-bottom', marginRight: '0.35rem' }} aria-hidden />View Waiting List</a>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <span className="card-title"><MdBarChart size={18} style={{ verticalAlign: 'text-bottom', marginRight: '0.35rem' }} aria-hidden />System Status</span>
            </div>
            <div className="card-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {[
                  { label: 'Node.js API', status: true },
                  { label: 'Database', status: true },
                  { label: 'Prisma ORM', status: true },
                  { label: 'Next.js UI', status: true },
                ].map(s => (
                  <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.875rem' }}>{s.label}</span>
                    <span className={`badge ${s.status ? 'badge-success' : 'badge-danger'}`}>
                      {s.status ? '● Online' : '● Offline'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
