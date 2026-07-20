'use client';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import TopNav from '../../../components/TopNav';
import { useConfirm } from '../../../components/ConfirmModal';
import ListingTable, { ActionIcons, ListingColumn, ListingHeaderActions } from '../../../components/ListingTable';
import { apiFetch } from '../../../../lib/api';

interface SpecimenType { id: number; name: string; description: string; status: boolean; }

const emptyForm = { name: '', description: '', id: null as number | null };

export default function SpecimenTypePage() {
  const confirmDialog = useConfirm();
  const [types, setTypes] = useState<SpecimenType[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ ...emptyForm });
  const [nameError, setNameError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<SpecimenType[]>('/api/SpecimenType', { tokenKey: 'superadmin_token' });
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
      setNameError('Please enter the specimen type name.');
      toast.error('Please correct the highlighted field before saving.');
      window.setTimeout(() => document.getElementById('specimen-type-name')?.focus(), 0);
      return;
    }
    setSaving(true);
    const method = form.id ? 'PUT' : 'POST';
    const path = `/api/SpecimenType${form.id ? `/${form.id}` : ''}`;
    try {
      await apiFetch(path, {
        method,
        tokenKey: 'superadmin_token',
        body: JSON.stringify({ name: form.name.trim(), description: form.description.trim() }),
        successMessage: `Specimen Type ${form.id ? 'updated' : 'added'} successfully.`,
        errorFallback: 'Unable to save specimen type.',
      });
      setForm({ ...emptyForm });
      setNameError('');
      loadData();
    } catch {
      /* error toasted by apiFetch */
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
    try {
      await apiFetch(`/api/SpecimenType/${id}`, { method: 'DELETE', tokenKey: 'superadmin_token' });
      loadData();
    } catch {
      /* error toasted by apiFetch */
    }
  };

  const toggleStatus = async (t: SpecimenType) => {
    try {
      await apiFetch(`/api/SpecimenType/${t.id}`, {
        method: 'PUT',
        tokenKey: 'superadmin_token',
        body: JSON.stringify({ status: !t.status }),
      });
      loadData();
    } catch {
      /* error toasted by apiFetch */
    }
  };

  const openEdit = (specimenType: SpecimenType) => {
    setForm({ name: specimenType.name || '', description: specimenType.description || '', id: specimenType.id });
    setNameError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setForm({ ...emptyForm });
    setNameError('');
  };

  const columns: ListingColumn<SpecimenType>[] = [
    { key: 'name', label: 'Name', width: '70%' },
  ];

  return (
    <div className="page-content">
      <TopNav title="Manage Specimen Type" />
      <div style={{ padding: '1.5rem' }}>
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
