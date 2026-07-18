'use client';
import { useState, useEffect } from 'react';
import TopNav from '../../../components/TopNav';
import { useConfirm } from '../../../components/ConfirmModal';
import ListingTable, { ActionIcons, ListingColumn, ListingHeaderActions } from '../../../components/ListingTable';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('superadmin_token') || '' : ''; }

interface SpecimenType { id: number; name: string; description: string; status: boolean; }

const emptyForm = { name: '', description: '', id: null as number | null };

export default function SpecimenTypePage() {
  const confirmDialog = useConfirm();
  const [types, setTypes] = useState<SpecimenType[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ ...emptyForm });
  const [nameError, setNameError] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = () => {
    setLoading(true);
    fetch(`${API}/api/SpecimenType`, { headers: { token: getToken() } })
      .then(r => r.json())
      .then(d => { if (d.response_code === '200') setTypes(d.obj); })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    void Promise.resolve().then(loadData);
  }, []);

  const save = async () => {
    if (!form.name.trim()) {
      setNameError('Please enter the specimen type name.');
      setMsg({ type: 'error', text: 'Please correct the highlighted field before saving.' });
      window.setTimeout(() => document.getElementById('specimen-type-name')?.focus(), 0);
      return;
    }
    setSaving(true);
    setMsg(null);
    const method = form.id ? 'PUT' : 'POST';
    const url = `${API}/api/SpecimenType${form.id ? `/${form.id}` : ''}`;
    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', token: getToken() },
        body: JSON.stringify({ name: form.name.trim(), description: form.description.trim() }),
      });
      const data = await response.json();
      if (response.ok && data.response_code === '200') {
        setMsg({ type: 'success', text: `Specimen Type ${form.id ? 'updated' : 'added'} successfully.` });
        setForm({ ...emptyForm });
        setNameError('');
        loadData();
      } else {
        setMsg({ type: 'error', text: typeof data.obj === 'string' ? data.obj : 'Unable to save specimen type.' });
      }
    } catch {
      setMsg({ type: 'error', text: 'Unable to connect to the server. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    const ok = await confirmDialog({
      title: 'You are trying to delete Specimen Type, Please confirm',
      message: 'This cannot be restored once deleted.',
      cancelText: 'NO, WAIT!',
      confirmText: 'CONFIRM DELETION',
    });
    if (!ok) return;
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

  const openEdit = (specimenType: SpecimenType) => {
    setForm({ name: specimenType.name || '', description: specimenType.description || '', id: specimenType.id });
    setNameError('');
    setMsg(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setForm({ ...emptyForm });
    setNameError('');
    setMsg(null);
  };

  const columns: ListingColumn<SpecimenType>[] = [
    { key: 'name', label: 'Name', width: '70%' },
  ];

  return (
    <div className="page-content">
      <TopNav title="Manage Specimen Type" />
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
              color: msg.type === 'success' ? '#047857' : '#b91c1c',
              fontSize: '0.875rem',
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

        <div className="specimen-type-split">
          <div className="card">
            <div className="card-header">
              <span className="card-title">{form.id ? 'Edit Specimen Type Detail' : 'Specimen Type Detail'}</span>
            </div>
            <div className="card-body">
                <div className="form-group">
                  <label htmlFor="specimen-type-name">Name<span className="required-star">*</span></label>
                  <input
                    id="specimen-type-name"
                    type="text"
                    placeholder="Enter Name"
                    value={form.name}
                    aria-invalid={!!nameError}
                    onChange={e => {
                      setForm(previous => ({ ...previous, name: e.target.value }));
                      if (nameError) setNameError('');
                      if (msg?.type === 'error') setMsg(null);
                    }}
                    style={{
                      borderColor: nameError ? '#ef4444' : undefined,
                      boxShadow: nameError ? '0 0 0 1px rgba(239,68,68,0.15)' : undefined,
                    }}
                  />
                  {nameError && (
                    <div role="alert" style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '0.35rem', fontWeight: 500 }}>
                      {nameError}
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label htmlFor="specimen-type-description">Description</label>
                  <textarea id="specimen-type-description" rows={4} value={form.description || ''} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                      style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 6, padding: '0.5rem', color: 'var(--text)', resize: 'vertical' }} />
                </div>
            </div>
            <div className="specimen-type-form-actions">
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={resetForm} disabled={saving}>
                Reset Data
              </button>
            </div>
          </div>

          <ListingTable
            title="List of Specimen Types"
            columns={columns}
            rows={types}
            loading={loading}
            emptyText="No specimen types found."
            headerActions={<ListingHeaderActions onRefresh={loadData} />}
            actionsLabel="Actions"
            actionsWidth={150}
            defaultPageSize={10}
            rowActions={specimenType => (
              <ActionIcons
                onEdit={() => openEdit(specimenType)}
                onToggleStatus={() => toggleStatus(specimenType)}
                onDelete={() => remove(specimenType.id)}
                statusActive={!!specimenType.status}
                editTitle="Edit Specimen Type"
                deleteTitle="Delete Specimen Type"
              />
            )}
          />
        </div>
      </div>
    </div>
  );
}
