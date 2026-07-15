'use client';
import { useState, useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('b2b_token') || '' : ''; }
function getUser() { return typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('b2b_user') || '{}') : {}; }

interface B2BUser { id: number; name: string; email: string; mobile: string; status: boolean; role_id: number; }

const emptyUser = { name: '', email: '', mobile: '', password: '', role_id: '2' };

export default function B2BUsersPage() {
  const [users, setUsers] = useState<B2BUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ ...emptyUser, id: null as number | null });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = () => {
    setLoading(true);
    fetch(`${API}/api/AdminUsers`, { headers: { token: getToken() } })
      .then(r => r.json())
      .then(d => { 
        if (d.response_code === '200') {
          // Ideally this should be filtered by backend based on user_id=b2b_client_id.
          setUsers(d.obj); 
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const save = async () => {
    if (!form.name || !form.email) {
      setMsg({ type: 'error', text: 'Name and Email are required.' }); return;
    }
    setSaving(true); setMsg(null);
    const method = form.id ? 'PUT' : 'POST';
    const url = `${API}/api/AdminUsers${form.id ? `/${form.id}` : ''}`;
    
    // In legacy, user_id maps to b2b_client_id
    const b2b_client_id = getUser().id;
    
    const payload = { ...form, user_id: b2b_client_id };
    
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', token: getToken() },
      body: JSON.stringify(payload)
    });
    const d = await res.json();
    setSaving(false);
    if (d.response_code === '200') {
      setMsg({ type: 'success', text: `Staff user ${form.id ? 'updated' : 'added'}.` });
      setForm({ ...emptyUser, id: null });
      setShowModal(false);
      loadData();
    } else { setMsg({ type: 'error', text: typeof d.obj === 'string' ? d.obj : JSON.stringify(d.obj) }); }
  };

  const remove = async (id: number) => {
    if (!confirm('Delete this user?')) return;
    await fetch(`${API}/api/AdminUsers/${id}`, { method: 'DELETE', headers: { token: getToken() } });
    loadData();
  };

  const toggleStatus = async (u: B2BUser) => {
    await fetch(`${API}/api/AdminUsers/${u.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', token: getToken() },
      body: JSON.stringify({ status: !u.status })
    });
    loadData();
  };

  return (
    <div className="page-content">
      <div className="topnav">
        <h1 className="topnav-title">Manage Staff Users</h1>
        <div className="topnav-actions">
          <button className="btn btn-primary" onClick={() => { setShowModal(true); setMsg(null); setForm({ ...emptyUser, id: null }); }}>➕ Add User</button>
        </div>
      </div>
      <div style={{ padding: '1.5rem' }}>
        {showModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
            <div className="card" style={{ width: '100%', maxWidth: 480, margin: '1rem' }}>
              <div className="card-header"><span className="card-title">{form.id ? '✏️ Edit Staff User' : '➕ Add Staff User'}</span></div>
              <div className="card-body">
                {msg && <div style={{ background: msg.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${msg.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, borderRadius: 8, padding: '0.6rem 0.9rem', marginBottom: '1rem', fontSize: '0.85rem', color: msg.type === 'success' ? '#10b981' : '#ef4444' }}>{msg.text}</div>}
                
                {[{ id: 'u-name', label: 'Full Name *', key: 'name' }, { id: 'u-email', label: 'Email *', key: 'email' }, { id: 'u-mobile', label: 'Mobile', key: 'mobile' }].map(f => (
                  <div key={f.key} className="form-group">
                    <label htmlFor={f.id}>{f.label}</label>
                    <input id={f.id} type="text" value={(form as Record<string, any>)[f.key] || ''} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
                  </div>
                ))}

                <div className="form-group">
                    <label>Password {form.id && <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-muted)' }}>(Leave blank to keep current)</span>}</label>
                    <input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} />
                </div>
                
                <div className="form-group">
                    <label>Role</label>
                    <select value={form.role_id} onChange={e => setForm(p => ({ ...p, role_id: e.target.value }))} style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 6, padding: '0.5rem', color: 'var(--text)' }}>
                        <option value="1">Admin</option>
                        <option value="2">Staff</option>
                        <option value="3">User</option>
                    </select>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                  <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? '⏳' : '💾 Save'}</button>
                  <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="card">
          <div className="card-body" style={{ padding: 0 }}>
            {loading ? <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div> : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--text-muted)' }}>Name</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--text-muted)' }}>Email</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--text-muted)' }}>Mobile</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--text-muted)' }}>Role</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--text-muted)' }}>Status</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--text-muted)' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
                      onMouseLeave={e => (e.currentTarget.style.background = '')}>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>{u.name}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>{u.email}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>{u.mobile || '—'}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>{u.role_id == 1 ? 'Admin' : u.role_id == 2 ? 'Staff' : 'User'}</td>
                      <td style={{ padding: '0.75rem 1rem' }}><span className={`badge ${u.status ? 'badge-success' : 'badge-danger'}`}>{u.status ? 'Active' : 'Inactive'}</span></td>
                      <td style={{ padding: '0.75rem 1rem', display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }} onClick={() => { setForm({ name: u.name, email: u.email, mobile: u.mobile, password: '', role_id: String(u.role_id), id: u.id }); setShowModal(true); }}>✏️ Edit</button>
                        <button className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }} onClick={() => toggleStatus(u)}>⚡ {u.status ? 'Disable' : 'Enable'}</button>
                        <button className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', color: '#ef4444' }} onClick={() => remove(u.id)}>🗑 Delete</button>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No staff users found.</td></tr>}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
