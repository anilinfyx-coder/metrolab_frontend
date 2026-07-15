'use client';
import { useState, useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('superadmin_token') || '' : ''; }

interface Staff { id: number; email: string; name: string; mobile: string; role_id: number; status: boolean; }

const emptyStaff = { name: '', email: '', mobile: '', role_id: '1', password: '' };

export default function SuperAdminStaffPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({ ...emptyStaff });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [search, setSearch] = useState('');

  const loadData = () => {
    setLoading(true);
    fetch(`${API}/api/SuperAdmin`, { headers: { token: getToken() } })
      .then(r => r.json())
      .then(d => { if (d.response_code === '200') setStaff(d.obj); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const save = async () => {
    if (!form.name || !form.email) {
      setMsg({ type: 'error', text: 'Name and Email are required.' }); return;
    }
    setSaving(true); setMsg(null);
    const method = editingId ? 'PUT' : 'POST';
    const url = `${API}/api/SuperAdmin${editingId ? `/${editingId}` : ''}`;
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', token: getToken() },
      body: JSON.stringify(form)
    });
    const d = await res.json();
    setSaving(false);
    if (d.response_code === '200') {
      setMsg({ type: 'success', text: `Staff member ${editingId ? 'updated' : 'added'}.` });
      setForm({ ...emptyStaff });
      setShowModal(false);
      loadData();
    } else { setMsg({ type: 'error', text: d.obj }); }
  };

  const remove = async (id: number) => {
    if (!confirm('Delete this staff member?')) return;
    await fetch(`${API}/api/SuperAdmin/${id}`, { method: 'DELETE', headers: { token: getToken() } });
    loadData();
  };

  const toggleStatus = async (s: Staff) => {
    await fetch(`${API}/api/SuperAdmin/${s.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', token: getToken() },
      body: JSON.stringify({ status: !s.status })
    });
    loadData();
  };

  const openEdit = (s: Staff) => {
    setEditingId(s.id);
    setForm({ ...emptyStaff, ...s as unknown as Record<string, string>, password: '' });
    setShowModal(true);
  };

  const filtered = staff.filter(s => !search || s.name?.toLowerCase().includes(search.toLowerCase()) || s.email?.includes(search));

  return (
    <div className="page-content">
      <div className="topnav">
        <h1 className="topnav-title">Super Admin Staff</h1>
        <div className="topnav-actions">
          <input id="staff-search" type="text" placeholder="Search staff..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.5rem 0.75rem', color: 'var(--text)', fontSize: '0.875rem', width: 240 }} />
          <button id="add-staff-btn" className="btn btn-primary" onClick={() => { setEditingId(null); setShowModal(true); setMsg(null); setForm({ ...emptyStaff }); }}>➕ Add Staff</button>
        </div>
      </div>
      <div style={{ padding: '1.5rem' }}>
        {msg && !showModal && (
          <div style={{ background: msg.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${msg.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.875rem', color: msg.type === 'success' ? '#10b981' : '#ef4444' }}>
            {msg.text}
          </div>
        )}

        {showModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
            <div className="card" style={{ width: '100%', maxWidth: 480, margin: '1rem' }}>
              <div className="card-header"><span className="card-title">{editingId ? '✏️ Edit' : '➕ Add'} Super Admin Staff</span></div>
              <div className="card-body">
                {msg && <div style={{ background: msg.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${msg.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, borderRadius: 8, padding: '0.6rem 0.9rem', marginBottom: '1rem', fontSize: '0.85rem', color: msg.type === 'success' ? '#10b981' : '#ef4444' }}>{msg.text}</div>}
                {[{ id: 'sf-name', label: 'Full Name', key: 'name' }, { id: 'sf-email', label: 'Email', key: 'email' }, { id: 'sf-mobile', label: 'Mobile', key: 'mobile' }, { id: 'sf-password', label: 'Password', key: 'password' }, { id: 'sf-role', label: 'Role ID', key: 'role_id' }].map(f => (
                  <div key={f.key} className="form-group">
                    <label htmlFor={f.id}>{f.label}</label>
                    <input id={f.id} type={f.key === 'password' ? 'password' : 'text'} value={(form as Record<string, string>)[f.key] || ''} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.key === 'password' && editingId ? 'Leave blank to keep unchanged' : ''} />
                  </div>
                ))}
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button id="save-staff-btn" className="btn btn-primary" onClick={save} disabled={saving}>{saving ? '⏳' : '💾 Save'}</button>
                  <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="card">
          <div className="card-body" style={{ padding: 0 }}>
            {loading ? <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div> : filtered.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No staff members found.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['#', 'Name', 'Email', 'Mobile', 'Role ID', 'Status', 'Action'].map(h => (
                      <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s, i) => (
                    <tr key={s.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
                      onMouseLeave={e => (e.currentTarget.style.background = '')}>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>{i + 1}</td>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>{s.name}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>{s.email}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>{s.mobile}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>{s.role_id}</td>
                      <td style={{ padding: '0.75rem 1rem' }}><span className={`badge ${s.status ? 'badge-success' : 'badge-danger'}`}>{s.status ? 'Active' : 'Inactive'}</span></td>
                      <td style={{ padding: '0.75rem 1rem', display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem' }} onClick={() => openEdit(s)}>✏️ Edit</button>
                        <button className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem' }} onClick={() => toggleStatus(s)}>⚡ {s.status ? 'Disable' : 'Enable'}</button>
                        <button id={`del-staff-${s.id}`} className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem', color: '#ef4444' }} onClick={() => remove(s.id)}>🗑 Delete</button>
                      </td>
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
