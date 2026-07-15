'use client';
import { useState, useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('b2b_token') || '' : ''; }
function getUser() { return typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('b2b_user') || '{}') : {}; }

interface CorporateClient {
  id: number; company_name: string; contact_person_name: string;
  email: string; mobile: string; status: boolean; address?: string;
  country_id?: string; state_id?: string; city_id?: string; district_id?: string;
  region_id?: string; pincode?: string; password?: string;
}

const emptyClient = { 
  company_name: '', contact_person_name: '', email: '', mobile: '', 
  address: '', country_id: '', state_id: '', city_id: '', district_id: '', 
  region_id: '', pincode: '', password: '' 
};

export default function CorporateClientPage() {
  const [clients, setClients] = useState<CorporateClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ ...emptyClient, id: null as number | null });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = () => {
    setLoading(true);
    fetch(`${API}/api/CorporateClients`, { headers: { token: getToken() } })
      .then(r => r.json())
      .then(d => {
        if (d.response_code === '200') {
          setClients(d.obj); 
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const save = async () => {
    if (!form.company_name || !form.email) {
      setMsg({ type: 'error', text: 'Company Name and Email are required.' }); return;
    }
    setSaving(true); setMsg(null);
    const method = form.id ? 'PUT' : 'POST';
    const url = `${API}/api/CorporateClients${form.id ? `/${form.id}` : ''}`;
    
    // Convert empty strings to null for integers
    const payload: any = { ...form, b2b_client_id: getUser().id };
    ['country_id', 'state_id', 'city_id', 'district_id', 'region_id'].forEach(k => {
      if (!payload[k]) payload[k] = null;
    });

    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', token: getToken() },
      body: JSON.stringify(payload)
    });
    
    setSaving(false);
    setShowModal(false);
    loadData();
  };

  const toggleStatus = async (c: CorporateClient) => {
    await fetch(`${API}/api/CorporateClients/${c.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', token: getToken() },
      body: JSON.stringify({ status: !c.status })
    });
    loadData();
  };

  const remove = async (id: number) => {
    if (!confirm('Delete this corporate client?')) return;
    await fetch(`${API}/api/CorporateClients/${id}`, { method: 'DELETE', headers: { token: getToken() } });
    loadData();
  };

  return (
    <div className="page-content">
      <div className="topnav">
        <h1 className="topnav-title">Corporate Clients</h1>
        <div className="topnav-actions">
          <button className="btn btn-primary" onClick={() => { setShowModal(true); setMsg(null); setForm({ ...emptyClient, id: null }); }}>➕ Add Client</button>
        </div>
      </div>
      <div style={{ padding: '1.5rem' }}>
        {showModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
            <div className="card" style={{ width: '100%', maxWidth: 700, margin: '1rem', maxHeight: '90vh', overflowY: 'auto' }}>
              <div className="card-header"><span className="card-title">{form.id ? '✏️ Edit Corporate Client' : '➕ Add Corporate Client'}</span></div>
              <div className="card-body">
                {msg && <div style={{ background: msg.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${msg.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, borderRadius: 8, padding: '0.6rem 0.9rem', marginBottom: '1rem', fontSize: '0.85rem', color: msg.type === 'success' ? '#10b981' : '#ef4444' }}>{msg.text}</div>}
                
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text)' }}>Basic Info</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div className="form-group"><label>Company Name <span style={{ color: '#ef4444' }}>*</span></label><input type="text" value={form.company_name} onChange={e => setForm(p => ({ ...p, company_name: e.target.value }))} /></div>
                  <div className="form-group"><label>Contact Person</label><input type="text" value={form.contact_person_name} onChange={e => setForm(p => ({ ...p, contact_person_name: e.target.value }))} /></div>
                  <div className="form-group"><label>Email <span style={{ color: '#ef4444' }}>*</span></label><input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></div>
                  <div className="form-group"><label>Mobile</label><input type="text" value={form.mobile} onChange={e => setForm(p => ({ ...p, mobile: e.target.value }))} /></div>
                  <div className="form-group"><label>Password {form.id && <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-muted)' }}>(Leave blank to keep current)</span>}</label>
                    <input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder="Set Login Password" />
                  </div>
                </div>

                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text)' }}>Location Info</h3>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label>Address</label>
                  <textarea rows={2} value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 6, padding: '0.5rem', color: 'var(--text)', resize: 'vertical' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                  <div className="form-group"><label>Country (ID)</label><input type="number" value={form.country_id} onChange={e => setForm(p => ({ ...p, country_id: e.target.value }))} placeholder="e.g. 1" /></div>
                  <div className="form-group"><label>State (ID)</label><input type="number" value={form.state_id} onChange={e => setForm(p => ({ ...p, state_id: e.target.value }))} /></div>
                  <div className="form-group"><label>City (ID)</label><input type="number" value={form.city_id} onChange={e => setForm(p => ({ ...p, city_id: e.target.value }))} /></div>
                  <div className="form-group"><label>District (ID)</label><input type="number" value={form.district_id} onChange={e => setForm(p => ({ ...p, district_id: e.target.value }))} /></div>
                  <div className="form-group"><label>Region (ID)</label><input type="number" value={form.region_id} onChange={e => setForm(p => ({ ...p, region_id: e.target.value }))} /></div>
                  <div className="form-group"><label>Pincode</label><input type="text" value={form.pincode} onChange={e => setForm(p => ({ ...p, pincode: e.target.value }))} /></div>
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
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--text-muted)' }}>Company Name</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--text-muted)' }}>Contact</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--text-muted)' }}>Email</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--text-muted)' }}>Mobile</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--text-muted)' }}>Status</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--text-muted)' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((c) => (
                    <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
                      onMouseLeave={e => (e.currentTarget.style.background = '')}>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>{c.company_name}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>{c.contact_person_name}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>{c.email}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>{c.mobile || '—'}</td>
                      <td style={{ padding: '0.75rem 1rem' }}><span className={`badge ${c.status ? 'badge-success' : 'badge-danger'}`}>{c.status ? 'Active' : 'Inactive'}</span></td>
                      <td style={{ padding: '0.75rem 1rem', display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }} onClick={() => { setForm({ ...emptyClient, ...c as any, password: '' }); setShowModal(true); }}>✏️ Edit</button>
                        <button className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }} onClick={() => toggleStatus(c)}>⚡ {c.status ? 'Disable' : 'Enable'}</button>
                        <button className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', color: '#ef4444' }} onClick={() => remove(c.id)}>🗑 Delete</button>
                      </td>
                    </tr>
                  ))}
                  {clients.length === 0 && (
                    <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No Corporate Clients found.</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
