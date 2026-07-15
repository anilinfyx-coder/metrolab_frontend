'use client';
import { useState, useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('superadmin_token') || '' : ''; }

interface DocumentType { id: number; name: string; description: string; status: boolean; }

const emptyForm = { name: '', description: '' };

export default function DocumentTypePage() {
  const [types, setTypes] = useState<DocumentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [search, setSearch] = useState('');

  const loadData = () => {
    setLoading(true);
    fetch(`${API}/api/TypeData`, { headers: { token: getToken() } })
      .then(r => r.json())
      .then(d => { if (d.response_code === '200') setTypes(d.obj || []); })
      .catch(() => setTypes([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const save = async () => {
    if (!form.name) {
      setMsg({ type: 'error', text: 'Name is required.' }); return;
    }
    setSaving(true); setMsg(null);
    const method = editingId ? 'PUT' : 'POST';
    const url = `${API}/api/TypeData${editingId ? `/${editingId}` : ''}`;
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', token: getToken() },
      body: JSON.stringify(form)
    });
    const d = await res.json();
    setSaving(false);
    if (d.response_code === '200') {
      setMsg({ type: 'success', text: `Document Type ${editingId ? 'updated' : 'added'}.` });
      setForm({ ...emptyForm });
      setShowModal(false);
      loadData();
    } else { setMsg({ type: 'error', text: d.obj }); }
  };

  const remove = async (id: number) => {
    if (!confirm('Delete this Document Type?')) return;
    await fetch(`${API}/api/TypeData/${id}`, { method: 'DELETE', headers: { token: getToken() } });
    loadData();
  };

  const toggleStatus = async (t: DocumentType) => {
    await fetch(`${API}/api/TypeData/${t.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', token: getToken() },
      body: JSON.stringify({ status: !t.status })
    });
    loadData();
  };

  const openEdit = (t: DocumentType) => {
    setEditingId(t.id);
    setForm({ ...emptyForm, ...t as unknown as Record<string, string> });
    setShowModal(true);
  };

  const filtered = types.filter(t => !search || t.name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="page-content">
      <div className="topnav">
        <h1 className="topnav-title">Document Types</h1>
        <div className="topnav-actions">
          <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.5rem 0.75rem', color: 'var(--text)', fontSize: '0.875rem', width: 240 }} />
          <button className="btn btn-primary" onClick={() => { setEditingId(null); setShowModal(true); setMsg(null); setForm({ ...emptyForm }); }}>➕ Add Document Type</button>
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
              <div className="card-header"><span className="card-title">{editingId ? '✏️ Edit' : '➕ Add'} Document Type</span></div>
              <div className="card-body">
                {msg && <div style={{ background: msg.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${msg.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, borderRadius: 8, padding: '0.6rem 0.9rem', marginBottom: '1rem', fontSize: '0.85rem', color: msg.type === 'success' ? '#10b981' : '#ef4444' }}>{msg.text}</div>}
                
                <div className="form-group">
                    <label>Title <span style={{color: '#ef4444'}}>*</span></label>
                    <input type="text" placeholder="Enter Document Title" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
                </div>
                
                <div className="form-group">
                    <label>Description</label>
                    <textarea rows={3} placeholder="Enter Description" value={form.description || ''} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                        style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 6, padding: '0.5rem', color: 'var(--text)', resize: 'vertical' }} />
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
            {loading ? <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div> : filtered.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No document types found.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['#', 'Title', 'Description', 'Status', 'Action'].map(h => (
                      <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t, i) => (
                    <tr key={t.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
                      onMouseLeave={e => (e.currentTarget.style.background = '')}>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>{i + 1}</td>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>{t.name}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>{t.description}</td>
                      <td style={{ padding: '0.75rem 1rem' }}><span className={`badge ${t.status ? 'badge-success' : 'badge-danger'}`}>{t.status ? 'Active' : 'Inactive'}</span></td>
                      <td style={{ padding: '0.75rem 1rem', display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem' }} onClick={() => openEdit(t)}>✏️ Edit</button>
                        <button className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem' }} onClick={() => toggleStatus(t)}>⚡ {t.status ? 'Disable' : 'Enable'}</button>
                        <button className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem', color: '#ef4444' }} onClick={() => remove(t.id)}>🗑 Delete</button>
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
