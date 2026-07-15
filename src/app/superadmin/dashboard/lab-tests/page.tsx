'use client';
import { useEffect, useState, useCallback } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface LabTest {
  id: number;
  name: string;
  description: string;
  status: boolean | null;
  deleted: boolean | null;
  showCollectedDate?: boolean | null;
  showReportStatus?: boolean | null;
}

const emptyTest: Partial<LabTest> = { name: '', description: '' };

export default function LabTestsPage() {
  const [tests, setTests] = useState<LabTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<Partial<LabTest>>(emptyTest);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '';
  const headers = { 'Content-Type': 'application/json', token };

  const fetchTests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/LabTests`, { headers });
      const data = await res.json();
      if (data.response_code === '200') setTests(data.obj);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchTests(); }, [fetchTests]);

  const filtered = tests.filter(t =>
    t.name?.toLowerCase().includes(search.toLowerCase()) ||
    t.description?.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => { setForm(emptyTest); setEditId(null); setShowModal(true); };
  const openEdit = (t: LabTest) => { setForm(t); setEditId(t.id); setShowModal(true); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = editId ? `${API_BASE}/api/LabTests/${editId}` : `${API_BASE}/api/LabTests`;
      const method = editId ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers, body: JSON.stringify(form) });
      const data = await res.json();
      if (data.response_code === '200') { setShowModal(false); fetchTests(); }
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this lab test?')) return;
    await fetch(`${API_BASE}/api/LabTests/${id}`, { method: 'DELETE', headers });
    fetchTests();
  };

  return (
    <>
      <div className="topnav">
        <h1 className="topnav-title">Lab Tests</h1>
        <div className="topnav-actions">
          <button id="add-labtest-btn" className="btn btn-primary" onClick={openAdd}>➕ Add Lab Test</button>
        </div>
      </div>

      <div className="page-content">
        <div className="page-header">
          <div>
            <h2 className="page-title">Lab Test Management</h2>
            <p className="page-subtitle">{tests.length} test types configured</p>
          </div>
          <div className="search-bar" style={{ minWidth: 280 }}>
            <span>🔍</span>
            <input id="labtest-search" type="text" placeholder="Search tests..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Report Status</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No lab tests found</td></tr>
                ) : filtered.map(t => (
                  <tr key={t.id}>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{t.id}</td>
                    <td style={{ fontWeight: 600 }}>{t.name}</td>
                    <td style={{ color: 'var(--text-muted)', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.description}</td>
                    <td><span className={`badge ${t.showReportStatus ? 'badge-success' : 'badge-warning'}`}>{t.showReportStatus ? 'Shown' : 'Hidden'}</span></td>
                    <td><span className={`badge ${t.status !== false ? 'badge-success' : 'badge-danger'}`}>{t.status !== false ? 'Active' : 'Inactive'}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-ghost btn-sm" id={`edit-labtest-${t.id}`} onClick={() => openEdit(t)}>✏️ Edit</button>
                        <button className="btn btn-danger btn-sm" id={`del-labtest-${t.id}`} onClick={() => handleDelete(t.id)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editId ? 'Edit Lab Test' : 'Add Lab Test'}</h2>
              <button className="btn btn-ghost btn-sm" id="close-labtest-modal" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Test Name *</label>
                  <input id="labtest-name" required value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Drug Screen 10-Panel" />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea id="labtest-desc" rows={3} value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Enter test description..." style={{ resize: 'vertical' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  {[
                    { key: 'showCollectedDate', label: 'Show Collected Date' },
                    { key: 'showReportStatus', label: 'Show Report Status' },
                    { key: 'showSpecimen', label: 'Show Specimen' },
                    { key: 'showFinalResult', label: 'Show Final Result' },
                  ].map(opt => (
                    <label key={opt.key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                      <input type="checkbox" id={`labtest-${opt.key}`} checked={!!(form as Record<string, unknown>)[opt.key]} onChange={e => setForm({ ...form, [opt.key]: e.target.checked })} style={{ width: 'auto' }} />
                      <span style={{ fontSize: '0.875rem', color: 'var(--text)' }}>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" id="save-labtest-btn" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : editId ? 'Update' : 'Add Test'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
