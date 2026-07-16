'use client';
import { useEffect, useState } from 'react';
import TopNav from '../../components/TopNav';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('superadmin_token') || '' : ''; }

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  
  useEffect(() => {
    fetch(`${API_BASE}/api/SuperAdmin/dashboardStats`, {
      headers: { token: getToken(), 'Content-Type': 'application/json' }
    })
      .then(r => r.json())
      .then(d => {
        if (d.response_code === '200') {
          setStats(d.obj);
        }
      })
      .catch(console.error);
  }, []);

  return (
    <>
      <TopNav title="Dashboard" />

      <div className="page-content">
        {/* The old software did not have any KPI dashboard widgets here, it was a blank workspace */}
        <div style={{ padding: '20px', color: 'var(--text-muted)' }}>
          Welcome to the Super Admin Dashboard. Please select an option from the sidebar to begin.
        </div>
      </div>
    </>
  );
}
