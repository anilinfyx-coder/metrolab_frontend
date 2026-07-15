'use client';
import { useState, useEffect } from 'react';
import TopNav from '../../../components/TopNav';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('b2b_token') || '' : ''; }

export default function B2BDashboardPage() {
  const [stats, setStats] = useState({ totalPatients: 0, waitingList: 0, completedTests: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real app we'd fetch actual aggregates from backend for this B2B user. 
    // Just simulating a stats fetch here based on the general lists.
    Promise.all([
      fetch(`${API}/api/Patient`, { headers: { token: getToken() } }),
      fetch(`${API}/api/WaitingList`, { headers: { token: getToken() } })
    ]).then(async ([pRes, wRes]) => {
      const pD = pRes.ok ? await pRes.json() : { obj: [] };
      const wD = wRes.ok ? await wRes.json() : { obj: [] };
      setStats({
        totalPatients: pD.obj?.length || 0,
        waitingList: wD.obj?.filter((w: any) => w.status)?.length || 0,
        completedTests: wD.obj?.filter((w: any) => !w.status)?.length || 0
      });
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="page-content">
      <TopNav title="B2B Admin Dashboard" />
      <div style={{ padding: '1.5rem' }}>
        {loading ? <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading stats...</div> : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
            {[
              { label: 'Total Patients', value: stats.totalPatients, color: 'blue' },
              { label: 'Active in Waiting List', value: stats.waitingList, color: 'orange' },
              { label: 'Completed Tests', value: stats.completedTests, color: 'green' }
            ].map(s => (
              <div key={s.label} className="card" style={{ padding: '1.5rem' }}>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: `var(--${s.color})` }}>{s.value}</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
