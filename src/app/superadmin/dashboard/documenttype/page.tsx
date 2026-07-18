'use client';
import { useState, useEffect } from 'react';
import TopNav from '../../../components/TopNav';
import { useConfirm } from '../../../components/ConfirmModal';
import ListingTable, { ActionIcons, ListingColumn, ListingHeaderActions } from '../../../components/ListingTable';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('superadmin_token') || '' : ''; }

interface DocumentType { id: number; name: string; description: string; status: boolean; }

const emptyForm = { name: '', description: '' };

export default function DocumentTypePage() {
  const confirmDialog = useConfirm();
  const [types, setTypes] = useState<DocumentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ ...emptyForm });
  const [titleError, setTitleError] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = () => {
    setLoading(true);
    fetch(`${API}/api/TypeData`, { headers: { token: getToken() } })
      .then(r => r.json())
      .then(d => { if (d.response_code === '200') setTypes(d.obj || []); })
      .catch(() => setTypes([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    void Promise.resolve().then(loadData);
  }, []);

  const save = async () => {
    if (!form.name.trim()) {
      setTitleError('Please enter the document type title.');
      setMsg({ type: 'error', text: 'Please correct the highlighted field before saving.' });
      window.setTimeout(() => document.getElementById('document-type-title')?.focus(), 0);
      return;
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
      setTitleError('');
      setEditingId(null);
      loadData();
    } else { setMsg({ type: 'error', text: d.obj }); }
  };

  const remove = async (id: number) => {
    const ok = await confirmDialog({
      title: 'You are trying to delete Document Type, Please confirm',
      message: 'This cannot be restored once deleted.',
      cancelText: 'NO, WAIT!',
      confirmText: 'CONFIRM DELETION',
    });
    if (!ok) return;
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
    setForm({ name: t.name || '', description: t.description || '' });
    setTitleError('');
    setMsg(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setTitleError('');
    setMsg(null);
  };

  const columns: ListingColumn<DocumentType>[] = [
    { key: 'name', label: 'Title', width: '70%' },
  ];

  return (
    <div className="page-content">
      <TopNav title="Manage Document Type" />
      <div style={{ padding: '1.5rem' }}>
        {msg && (
          <div
            role="alert"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
              background: msg.type === 'success' ? '#ecfdf5' : '#fef2f2',
              border: `1px solid ${msg.type === 'success' ? '#10b981' : '#ef4444'}`,
              borderRadius: 8,
              padding: '0.75rem 1rem',
              marginBottom: '1rem',
              fontSize: '0.875rem',
              color: msg.type === 'success' ? '#047857' : '#b91c1c',
              fontWeight: 600,
            }}
          >
            <span>{msg.type === 'success' ? '✓ ' : '⚠ '}{msg.text}</span>
            <button
              type="button"
              aria-label="Dismiss message"
              onClick={() => setMsg(null)}
              style={{ border: 0, background: 'transparent', color: 'inherit', cursor: 'pointer', fontSize: '1rem' }}
            >
              ✕
            </button>
          </div>
        )}

        <div className="document-type-split">
          <div className="card">
            <div className="card-header">
              <span className="card-title">
                {editingId ? 'Edit Document Type Detail' : 'Document Type Detail'}
              </span>
            </div>
            <div className="card-body">
                <div className="form-group">
                  <label htmlFor="document-type-title">Title<span className="required-star">*</span></label>
                  <input
                    id="document-type-title"
                    type="text"
                    placeholder="Enter Title"
                    value={form.name}
                    aria-invalid={!!titleError}
                    onChange={e => {
                      setForm(previous => ({ ...previous, name: e.target.value }));
                      if (titleError) setTitleError('');
                      if (msg?.type === 'error') setMsg(null);
                    }}
                    style={{
                      borderColor: titleError ? '#ef4444' : undefined,
                      boxShadow: titleError ? '0 0 0 1px rgba(239,68,68,0.15)' : undefined,
                    }}
                  />
                  {titleError && (
                    <div role="alert" style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '0.35rem', fontWeight: 500 }}>
                      {titleError}
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="document-type-description">Description</label>
                  <textarea
                    id="document-type-description"
                    rows={4}
                    value={form.description}
                    onChange={e => setForm(previous => ({ ...previous, description: e.target.value }))}
                    style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 6, padding: '0.5rem', color: 'var(--text)', resize: 'vertical' }}
                  />
                </div>
            </div>
            <div className="document-type-form-actions">
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={resetForm} disabled={saving}>
                Reset Data
              </button>
            </div>
          </div>

          <ListingTable
            title="List of Document Types"
            columns={columns}
            rows={types}
            loading={loading}
            emptyText="No document types found."
            headerActions={<ListingHeaderActions onRefresh={loadData} />}
            actionsLabel="Actions"
            actionsWidth={150}
            defaultPageSize={10}
            rowActions={documentType => (
              <ActionIcons
                onEdit={() => openEdit(documentType)}
                onToggleStatus={() => toggleStatus(documentType)}
                onDelete={() => remove(documentType.id)}
                statusActive={!!documentType.status}
                editTitle="Edit Document Type"
                deleteTitle="Delete Document Type"
              />
            )}
          />
        </div>
      </div>
    </div>
  );
}
