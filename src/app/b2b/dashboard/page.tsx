'use client';
import { useEffect, useState } from 'react';
import TopNav from '../../components/TopNav';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('b2b_token') || '' : ''; }
function getUser() {
  if (typeof window === 'undefined') return null;
  try { return JSON.parse(localStorage.getItem('b2b_user') || 'null'); } catch { return null; }
}

export default function B2bDashboardPage() {
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [patientCount, setPatientCount] = useState<number | null>(null);
  const [labTestCount, setLabTestCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = getUser();
    if (!user?.id) { setLoading(false); return; }

    Promise.all([
      fetch(`${API}/api/B2bClients/${user.id}`, { headers: { token: getToken() } }).then(r => r.json()),
      fetch(`${API}/api/Patient`, { headers: { token: getToken() } }).then(r => r.json()),
      fetch(`${API}/api/LabTests`, { headers: { token: getToken() } }).then(r => r.json()),
    ]).then(([clientData, patients, labTests]) => {
      if (clientData.response_code === '200') setWalletBalance(parseFloat(clientData.obj?.wallet_balance || 0));
      if (patients.response_code === '200') setPatientCount(Array.isArray(patients.obj) ? patients.obj.length : 0);
      if (labTests.response_code === '200') setLabTestCount(Array.isArray(labTests.obj) ? labTests.obj.length : 0);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <>
      <TopNav title="Dashboard" />
      <div className="page-content">
        <div className="page-header">
          <div>
            <h2 className="page-title">Welcome back 👋</h2>
            <p className="page-subtitle">Here&apos;s what&apos;s happening in your lab today.</p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {/* Wallet Balance — prominent */}
          <div className="stat-card" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', border: 'none', color: '#fff' }}>
            <div style={{ fontSize: '2rem', width: 48, height: 48, borderRadius: 12, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>💰</div>
            <div>
              <div className="stat-value" style={{ color: '#fff', fontSize: '1.75rem' }}>
                {loading ? '—' : (walletBalance !== null ? `$${walletBalance.toFixed(2)}` : '—')}
              </div>
              <div className="stat-label" style={{ color: 'rgba(255,255,255,0.8)' }}>Wallet Balance</div>
              <a href="/b2b/dashboard/wallet" style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.65)', textDecoration: 'underline', marginTop: '0.25rem', display: 'inline-block' }}>View History →</a>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon purple">🧑‍⚕️</div>
            <div>
              <div className="stat-value">{loading ? <span className="loading">—</span> : patientCount ?? '—'}</div>
              <div className="stat-label">Total Patients</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon blue">🔬</div>
            <div>
              <div className="stat-value">{loading ? <span className="loading">—</span> : labTestCount ?? '—'}</div>
              <div className="stat-label">Lab Tests</div>
            </div>
          </div>
        </div>

        {/* Low balance warning */}
        {!loading && walletBalance !== null && walletBalance <= 50 && (
          <div style={{
            margin: '0 0 1.25rem 0', padding: '1rem 1.25rem', borderRadius: 10,
            background: walletBalance <= 0 ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
            border: `1px solid ${walletBalance <= 0 ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`,
            display: 'flex', gap: '0.75rem', alignItems: 'flex-start'
          }}>
            <div style={{ fontSize: '1.25rem' }}>{walletBalance <= 0 ? '🚫' : '⚠️'}</div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: walletBalance <= 0 ? '#ef4444' : '#f59e0b', marginBottom: '0.25rem' }}>
                {walletBalance <= 0 ? 'Wallet Empty — Test submissions are blocked!' : 'Low Wallet Balance'}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Please contact your Metrolab administrator to recharge your wallet. Current balance: <strong>${walletBalance.toFixed(2)}</strong>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
          <div className="card">
            <div className="card-header">
              <span className="card-title">🚀 Quick Actions</span>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <a href="/b2b/dashboard/admindashboard" className="btn btn-primary" id="quick-admin-dashboard">🖥️ Admin Dashboard</a>
              <a href="/b2b/dashboard/wallet" className="btn btn-ghost" id="quick-wallet">💰 View Wallet & Transactions</a>
              <a href="/b2b/dashboard/corporateclient" className="btn btn-ghost" id="quick-corporate">🏢 Corporate Clients</a>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <span className="card-title">💰 Wallet Summary</span>
            </div>
            <div className="card-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.875rem' }}>Current Balance</span>
                  <span style={{ fontWeight: 700, color: (walletBalance ?? 0) > 0 ? '#10b981' : '#ef4444' }}>
                    {loading ? '—' : `$${(walletBalance ?? 0).toFixed(2)}`}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.875rem' }}>Status</span>
                  <span className={`badge ${(walletBalance ?? 0) > 0 ? 'badge-success' : 'badge-danger'}`}>
                    {loading ? '—' : (walletBalance ?? 0) > 0 ? '● Active' : '● Insufficient'}
                  </span>
                </div>
                <a href="/b2b/dashboard/wallet" className="btn btn-ghost" style={{ marginTop: '0.5rem', textAlign: 'center', fontSize: '0.85rem' }}>
                  📋 View Full Transaction History
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
