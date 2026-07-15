'use client';
import { useState, useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('superadmin_token') || '' : ''; }

interface SpecimenType { id: number; name: string; description: string; status: boolean; }

const emptyForm = { name: '', description: '', id: null as number | null };

export default function SpecimenTypePage() {
  const [types, setTypes] = useState<SpecimenType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  const loadData = () => {
    setLoading(true);
    fetch(`${API}/api/SpecimenType`, { headers: { token: getToken() } })
      .then(r => r.json())
      .then(d => { if (d.response_code === '200') setTypes(d.obj); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const save = async () => {
    if (!form.name) return;
    setSaving(true);
    const method = form.id ? 'PUT' : 'POST';
    const url = `${API}/api/SpecimenType${form.id ? `/${form.id}` : ''}`;
    await fetch(url, {
      method, headers: { 'Content-Type': 'application/json', token: getToken() },
      body: JSON.stringify({ name: form.name, description: form.description })
    });
    setSaving(false);
    setShowModal(false);
    loadData();
  };

  const remove = async (id: number) => {
    if (!confirm('Delete this Specimen Type?')) return;
    await fetch(`${API}/api/SpecimenType/${id}`, { method: 'DELETE', headers: { token: getToken() } });
    loadData();
  };

  const toggleStatus = async (t: SpecimenType) => {
    await fetch(`${API}/api/SpecimenType/${t.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', token: getToken() },
      body: JSON.stringify({ status: !t.status })
    });
    loadData();
  };

  return (
    <div className="page-content">
      <div className="topnav">
        <h1 className="topnav-title">Specimen Types</h1>
        <div className="topnav-actions">
          <button className="btn btn-primary" onClick={() => { setForm({ ...emptyForm }); setShowModal(true); }}>➕ Add Specimen Type</button>
        </div>
      </div>
      <div style={{ padding: '1.5rem' }}>
        {showModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
            <div className="card" style={{ width: '100%', maxWidth: 400, margin: '1rem' }}>
              <div className="card-header"><span className="card-title">{form.id ? 'Edit Specimen Type' : 'Add Specimen Type'}</span></div>
              <div className="card-body">
                <div className="form-group">
                  <label>Type Name *</label>
                  <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea rows={3} value={form.description || ''} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                      style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 6, padding: '0.5rem', color: 'var(--text)', resize: 'vertical' }} />
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                  <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? '⏳' : 'Save'}</button>
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
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--text-muted)' }}>#</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--text-muted)' }}>Name</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--text-muted)' }}>Description</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--text-muted)' }}>Status</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--text-muted)' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {types.map((t, i) => (
                    <tr key={t.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>{i + 1}</td>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>{t.name}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>{t.description}</td>
                      <td style={{ padding: '0.75rem 1rem' }}><span className={`badge ${t.status ? 'badge-success' : 'badge-danger'}`}>{t.status ? 'Active' : 'Inactive'}</span></td>
                      <td style={{ padding: '0.75rem 1rem', display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }} onClick={() => { setForm({ name: t.name, description: t.description, id: t.id }); setShowModal(true); }}>✏️ Edit</button>
                        <button className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }} onClick={() => toggleStatus(t)}>⚡ {t.status ? 'Disable' : 'Enable'}</button>
                        <button className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', color: '#ef4444' }} onClick={() => remove(t.id)}>🗑 Delete</button>
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
