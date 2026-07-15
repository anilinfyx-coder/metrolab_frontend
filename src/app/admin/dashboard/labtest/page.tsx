'use client';
import { useState, useEffect } from 'react';
import ApplyTestForm from './ApplyTestForm';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('admin_token') || '' : ''; }

interface WaitingEntry {
  id: number;
  patient_id: number;
  patient_name: string;
  patient_mobile: string;
  patient_uid: string;
  reason_for_test: string;
  requisition_no: string;
  creation_timestamp: string;
  status: boolean;
}

export default function WaitingListPage() {
  const [entries, setEntries] = useState<WaitingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedEntryId, setSelectedEntryId] = useState<number | null>(null);

  const loadData = () => {
    setLoading(true);
    fetch(`${API}/api/WaitingList`, { headers: { token: getToken() } })
      .then(r => r.json())
      .then(d => { if (d.response_code === '200') setEntries(d.obj); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const remove = async (id: number) => {
    if (!confirm('Remove this entry from the waiting list?')) return;
    await fetch(`${API}/api/WaitingList/${id}`, { method: 'DELETE', headers: { token: getToken() } });
    loadData();
  };

  const filtered = entries.filter(e =>
    !search ||
    e.patient_name?.toLowerCase().includes(search.toLowerCase()) ||
    e.patient_mobile?.includes(search) ||
    e.requisition_no?.includes(search)
  );

  return (
    <div className="page-content">
      <div className="topnav">
        <h1 className="topnav-title">Waiting List</h1>
        <div className="topnav-actions">
          <input id="wl-search" type="text" placeholder="Search by name, mobile, requisition..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.5rem 0.75rem', color: 'var(--text)', fontSize: '0.875rem', width: 280 }} />
          <button className="btn btn-ghost" onClick={loadData} style={{ fontSize: '0.875rem' }}>🔄 Refresh</button>
        </div>
      </div>

      <div style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {[
            { label: 'Total Waiting', value: entries.length, color: 'blue' },
            { label: 'Active', value: entries.filter(e => e.status).length, color: 'green' },
          ].map(s => (
            <div key={s.label} className="stat-card" style={{ flex: '1 1 160px', padding: '1rem', gap: '0.75rem' }}>
              <div className={`stat-icon ${s.color}`}>📋</div>
              <div>
                <div className="stat-value">{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-body" style={{ padding: 0 }}>
            {loading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading waiting list...</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                {entries.length === 0 ? 'Waiting list is empty. Add patients from Patient Demographic.' : 'No results match your search.'}
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['#', 'Patient', 'Mobile', 'Reason for Test', 'Requisition No.', 'Date', 'Status', 'Action'].map(h => (
                      <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((e, i) => (
                    <tr key={e.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}
                      onMouseEnter={ev => (ev.currentTarget.style.background = 'var(--bg-card-hover)')}
                      onMouseLeave={ev => (ev.currentTarget.style.background = '')}>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>{i + 1}</td>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>{e.patient_name || `Patient #${e.patient_id}`}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>{e.patient_mobile || '—'}</td>
                      <td style={{ padding: '0.75rem 1rem', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.reason_for_test || '—'}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>{e.requisition_no || '—'}</td>
                      <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>{new Date(e.creation_timestamp).toLocaleDateString()}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span className={`badge ${e.status ? 'badge-success' : 'badge-danger'}`}>
                          {e.status ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button className="btn btn-sm" onClick={() => setSelectedEntryId(e.id)} style={{ border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text)' }}>📝 Apply Test</button>
                          <button className="btn btn-sm" style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fee2e2' }} onClick={() => remove(e.id)}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {selectedEntryId && (
        <ApplyTestForm 
          waitingListId={selectedEntryId} 
          onClose={() => setSelectedEntryId(null)} 
          onSuccess={() => { setSelectedEntryId(null); loadData(); }}
        />
      )}
    </div>
  );
}
