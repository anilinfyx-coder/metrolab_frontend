'use client';
import { useState, useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('b2b_token') || '' : ''; }

interface LabTestCategory { id: number; name: string; cost: number; cpt_code: string; }

export default function AssignedTestCategoryPage() {
  const [categories, setCategories] = useState<LabTestCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In actual implementation, we map to `b2b_client_lab_test_access`, but for parity rendering:
    fetch(`${API}/api/LabTests`, { headers: { token: getToken() } })
      .then(r => r.json())
      .then(d => { if (d.response_code === '200') setCategories(d.obj); })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page-content">
      <div className="topnav">
        <h1 className="topnav-title">Assigned Test Categories</h1>
      </div>
      <div style={{ padding: '1.5rem' }}>
        <div className="card">
          <div className="card-body" style={{ padding: 0 }}>
            {loading ? <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div> : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--text-muted)' }}>#</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--text-muted)' }}>Test Name</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--text-muted)' }}>Cost</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--text-muted)' }}>CPT Code</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((c, i) => (
                    <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>{i + 1}</td>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>{c.name}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>${c.cost || 0}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>{c.cpt_code || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
