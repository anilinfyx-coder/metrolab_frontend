'use client';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import TopNav from '../../../components/TopNav';
import { useConfirm } from '../../../components/ConfirmModal';
import ListingTable, { ActionIcons, ListingColumn, ListingHeaderActions } from '../../../components/ListingTable';
import { apiFetch } from '../../../../lib/api';

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

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<DocumentType[]>('/api/TypeData', { tokenKey: 'superadmin_token' });
      setTypes(data || []);
    } catch {
      setTypes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const save = async () => {
    if (!form.name.trim()) {
      setTitleError('Please enter the document type title.');
      toast.error('Please correct the highlighted field before saving.');
      window.setTimeout(() => document.getElementById('document-type-title')?.focus(), 0);
      return;
    }
    setSaving(true);
    const method = editingId ? 'PUT' : 'POST';
    const path = `/api/TypeData${editingId ? `/${editingId}` : ''}`;
    try {
      await apiFetch(path, {
        method,
        tokenKey: 'superadmin_token',
        body: JSON.stringify(form),
        successMessage: `Document Type ${editingId ? 'updated' : 'added'}.`,
        errorFallback: 'Unable to save document type.',
      });
      setForm({ ...emptyForm });
      setTitleError('');
      setEditingId(null);
      loadData();
    } catch {
      /* error toasted by apiFetch */
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    const ok = await confirmDialog({
      title: 'You are trying to delete Document Type, Please confirm',
      message: 'This cannot be restored once deleted.',
      cancelText: 'NO, WAIT!',
      confirmText: 'CONFIRM DELETION',
    });
    if (!ok) return;
    try {
      await apiFetch(`/api/TypeData/${id}`, { method: 'DELETE', tokenKey: 'superadmin_token' });
      loadData();
    } catch {
      /* error toasted by apiFetch */
    }
  };

  const toggleStatus = async (t: DocumentType) => {
    try {
      await apiFetch(`/api/TypeData/${t.id}`, {
        method: 'PUT',
        tokenKey: 'superadmin_token',
        body: JSON.stringify({ status: !t.status }),
      });
      loadData();
    } catch {
      /* error toasted by apiFetch */
    }
  };

  const openEdit = (t: DocumentType) => {
    setEditingId(t.id);
    setForm({ name: t.name || '', description: t.description || '' });
    setTitleError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setTitleError('');
  };

  const columns: ListingColumn<DocumentType>[] = [
    { key: 'name', label: 'Title', width: '70%' },
  ];

  return (
    <div className="page-content">
      <TopNav title="Manage Document Type" />
      <div style={{ padding: '1.5rem' }}>
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
