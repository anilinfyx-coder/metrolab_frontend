'use client';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import TopNav from '../../../components/TopNav';
import { useConfirm } from '../../../components/ConfirmModal';
import ListingTable, { ActionIcons, ListingColumn } from '../../../components/ListingTable';
import { FormGroup } from '../../../components/FormField';
import { apiFetch } from '../../../../lib/api';
import { patchListItem } from '../../../../lib/listState';
import { createInvalidHandler, fieldStyle, formResolver } from '../../../../lib/formHelpers';
import { documentTypeSchema, type DocumentTypeFormValues } from '../../../../lib/schemas';

interface DocumentType { id: number; name: string; description: string; status: boolean; }

const emptyForm: DocumentTypeFormValues = { name: '', description: '' };

export default function DocumentTypePage() {
  const confirmDialog = useConfirm();
  const [types, setTypes] = useState<DocumentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DocumentTypeFormValues>({
    resolver: formResolver<DocumentTypeFormValues>(documentTypeSchema),
    defaultValues: emptyForm,
  });

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

  const resetForm = () => {
    setEditingId(null);
    reset(emptyForm);
  };

  const save = handleSubmit(async values => {
    setSaving(true);
    const method = editingId ? 'PUT' : 'POST';
    const path = `/api/TypeData${editingId ? `/${editingId}` : ''}`;
    try {
      await apiFetch(path, {
        method,
        tokenKey: 'superadmin_token',
        body: JSON.stringify({
          name: values.name.trim(),
          description: (values.description || '').trim(),
        }),
        successMessage: `Document type ${editingId ? 'updated' : 'added'} successfully.`,
        errorFallback: 'Unable to save document type.',
      });
      resetForm();
      loadData();
    } catch {
      /* error toasted by apiFetch */
    } finally {
      setSaving(false);
    }
  }, createInvalidHandler<DocumentTypeFormValues>());

  const remove = async (id: number) => {
    const ok = await confirmDialog({
      title: 'You are trying to delete Document Type, Please confirm',
      message: 'This cannot be restored once deleted.',
      cancelText: 'NO, WAIT!',
      confirmText: 'CONFIRM DELETION',
    });
    if (!ok) return;
    try {
      await apiFetch(`/api/TypeData/${id}`, {
        method: 'DELETE',
        tokenKey: 'superadmin_token',
        successMessage: 'Document type deleted successfully.',
        errorFallback: 'Unable to delete document type.',
      });
      if (editingId === id) resetForm();
      loadData();
    } catch {
      /* error toasted by apiFetch */
    }
  };

  const toggleStatus = async (t: DocumentType) => {
    const enabling = !t.status;
    const ok = await confirmDialog({
      title: enabling ? 'Enable Document Type?' : 'Disable Document Type?',
      message: enabling
        ? 'This Document Type will become active and available for use.'
        : 'This Document Type will become inactive. You can enable it again later.',
      cancelText: 'Cancel',
      confirmText: enabling ? 'Enable' : 'Disable',
    });
    if (!ok) return;
    try {
      await apiFetch(`/api/TypeData/${t.id}`, {
        method: 'PUT',
        tokenKey: 'superadmin_token',
        body: JSON.stringify({ status: !t.status }),
        successMessage: 'Status Updated Successfully',
        errorFallback: 'Failed to update status.',
      });
      setTypes(prev => patchListItem(prev, t.id, { status: !t.status }));
    } catch {
      /* error toasted by apiFetch */
    }
  };

  const openEdit = (t: DocumentType) => {
    setEditingId(t.id);
    reset({ name: t.name || '', description: t.description || '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const columns: ListingColumn<DocumentType>[] = [
    { key: 'name', label: 'Title', width: '70%' },
  ];

  return (
    <div className="page-content" style={{ paddingTop: 0 }}>
      <TopNav title="Manage Document Type" />
      <div className="page-body">
        <div className="document-type-split">
          <div className="card">
            <div className="card-header">
              <span className="card-title">
                {editingId ? 'Edit Document Type Detail' : 'Document Type Detail'}
              </span>
            </div>
            <form onSubmit={save} noValidate>
              <div className="card-body">
                <FormGroup label="Title" htmlFor="document-type-title" required error={errors.name?.message}>
                  <input
                    id="document-type-title"
                    type="text"
                    placeholder="Enter Title"
                    data-field="name"
                    aria-invalid={!!errors.name}
                    style={fieldStyle(!!errors.name)}
                    {...register('name')}
                  />
                </FormGroup>

                <FormGroup label="Description" htmlFor="document-type-description" error={errors.description?.message}>
                  <textarea
                    id="document-type-description"
                    rows={4}
                    data-field="description"
                    aria-invalid={!!errors.description}
                    style={{ ...fieldStyle(!!errors.description), resize: 'vertical' }}
                    {...register('description')}
                  />
                </FormGroup>
              </div>
              <div className="document-type-form-actions">
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button type="button" className="btn btn-ghost" onClick={resetForm} disabled={saving}>
                  Reset Data
                </button>
              </div>
            </form>
          </div>

          <ListingTable
            title="List of Document Types"
            columns={columns}
            rows={types}
            loading={loading}
            emptyText="No document types found."
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
