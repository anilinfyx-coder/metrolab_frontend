'use client';
import { useEffect, useState, useCallback } from 'react';
import { MdAdd, MdClose, MdDelete, MdEdit } from 'react-icons/md';
import TopNav from '../../../components/TopNav';
import { useConfirm } from '../../../components/ConfirmModal';
import { apiFetch } from '../../../../lib/api';

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
  const confirmDialog = useConfirm();
  const [tests, setTests] = useState<LabTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<Partial<LabTest>>(emptyTest);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const fetchTests = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<LabTest[]>('/api/LabTests', { tokenKey: 'superadmin_token' });
      setTests(data || []);
    } catch {
      setTests([]);
    } finally {
      setLoading(false);
    }
  }, []);

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
      const path = editId ? `/api/LabTests/${editId}` : '/api/LabTests';
      const method = editId ? 'PUT' : 'POST';
      await apiFetch(path, {
        method,
        tokenKey: 'superadmin_token',
        body: JSON.stringify(form),
        errorFallback: 'Unable to save lab test.',
      });
      setShowModal(false);
      fetchTests();
    } catch {
      /* error toasted by apiFetch */
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    const ok = await confirmDialog({
      title: 'You are trying to delete Lab Test, Please confirm',
      message: 'This cannot be restored once deleted.',
      cancelText: 'NO, WAIT!',
      confirmText: 'CONFIRM DELETION',
    });
    if (!ok) return;
    try {
      await apiFetch(`/api/LabTests/${id}`, { method: 'DELETE', tokenKey: 'superadmin_token' });
      fetchTests();
    } catch {
      /* error toasted by apiFetch */
    }
  };

  return (
    <>
      <TopNav title="Lab Tests">
          <button id="add-labtest-btn" className="btn btn-primary" onClick={openAdd}><MdAdd size={16} style={{ verticalAlign: 'text-bottom', marginRight: '0.35rem' }} aria-hidden />Add Lab Test</button>
        </TopNav>

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
                        <button className="btn btn-ghost btn-sm" id={`edit-labtest-${t.id}`} onClick={() => openEdit(t)}><MdEdit size={14} style={{ verticalAlign: 'text-bottom', marginRight: '0.25rem' }} aria-hidden />Edit</button>
                        <button className="btn btn-danger btn-sm" id={`del-labtest-${t.id}`} onClick={() => handleDelete(t.id)}><MdDelete size={14} aria-hidden /></button>
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
              <button className="btn btn-ghost btn-sm" id="close-labtest-modal" onClick={() => setShowModal(false)}><MdClose size={16} aria-hidden /></button>
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
