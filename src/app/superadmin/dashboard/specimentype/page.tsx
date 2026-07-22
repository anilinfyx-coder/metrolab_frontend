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
import { namedEntityWithIdSchema, type NamedEntityWithIdFormValues } from '../../../../lib/schemas';

interface SpecimenType { id: number; name: string; description: string; status: boolean; }

const emptyForm: NamedEntityWithIdFormValues = { name: '', description: '', id: null };

export default function SpecimenTypePage() {
  const confirmDialog = useConfirm();
  const [types, setTypes] = useState<SpecimenType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<NamedEntityWithIdFormValues>({
    resolver: formResolver<NamedEntityWithIdFormValues>(namedEntityWithIdSchema),
    defaultValues: emptyForm,
  });

  const editingId = watch('id');

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

  const resetForm = () => {
    reset(emptyForm);
  };

  const save = handleSubmit(async values => {
    setSaving(true);
    const method = values.id ? 'PUT' : 'POST';
    const path = `/api/SpecimenType${values.id ? `/${values.id}` : ''}`;
    try {
      await apiFetch(path, {
        method,
        tokenKey: 'superadmin_token',
        body: JSON.stringify({ name: values.name.trim(), description: values.description.trim() }),
        successMessage: `Specimen type ${values.id ? 'updated' : 'added'} successfully.`,
        errorFallback: 'Unable to save specimen type.',
      });
      resetForm();
      loadData();
    } catch {
      /* error toasted by apiFetch */
    } finally {
      setSaving(false);
    }
  }, createInvalidHandler<NamedEntityWithIdFormValues>());

  const remove = async (id: number) => {
    const ok = await confirmDialog({
      title: 'You are trying to delete Specimen Type, Please confirm',
      message: 'This cannot be restored once deleted.',
      cancelText: 'NO, WAIT!',
      confirmText: 'CONFIRM DELETION',
    });
    if (!ok) return;
    try {
      await apiFetch(`/api/SpecimenType/${id}`, {
        method: 'DELETE',
        tokenKey: 'superadmin_token',
        successMessage: 'Specimen type deleted successfully.',
        errorFallback: 'Unable to delete specimen type.',
      });
      if (editingId === id) resetForm();
      loadData();
    } catch {
      /* error toasted by apiFetch */
    }
  };

  const toggleStatus = async (t: SpecimenType) => {
    const enabling = !t.status;
    const ok = await confirmDialog({
      title: enabling ? 'Enable Specimen Type?' : 'Disable Specimen Type?',
      message: enabling
        ? 'This Specimen Type will become active and available for use.'
        : 'This Specimen Type will become inactive. You can enable it again later.',
      cancelText: 'Cancel',
      confirmText: enabling ? 'Enable' : 'Disable',
    });
    if (!ok) return;
    try {
      await apiFetch(`/api/SpecimenType/${t.id}`, {
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

  const openEdit = (specimenType: SpecimenType) => {
    reset({
      name: specimenType.name || '',
      description: specimenType.description || '',
      id: specimenType.id,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const columns: ListingColumn<SpecimenType>[] = [
    { key: 'name', label: 'Name', width: '70%' },
  ];

  return (
    <div className="page-content" style={{ paddingTop: 0 }}>
      <TopNav title="Manage Specimen Type" />
      <div className="page-body">
        <div className="specimen-type-split">
          <div className="card">
            <div className="card-header">
              <span className="card-title">{editingId ? 'Edit Specimen Type Detail' : 'Specimen Type Detail'}</span>
            </div>
            <form onSubmit={save} noValidate>
              <div className="card-body">
                <FormGroup label="Name" htmlFor="specimen-type-name" required error={errors.name?.message}>
                  <input
                    id="specimen-type-name"
                    type="text"
                    placeholder="Enter Name"
                    data-field="name"
                    aria-invalid={!!errors.name}
                    style={fieldStyle(!!errors.name)}
                    {...register('name')}
                  />
                </FormGroup>
                <FormGroup label="Description" htmlFor="specimen-type-description" required error={errors.description?.message}>
                  <textarea
                    id="specimen-type-description"
                    rows={4}
                    data-field="description"
                    aria-invalid={!!errors.description}
                    style={{ ...fieldStyle(!!errors.description), resize: 'vertical' }}
                    {...register('description')}
                  />
                </FormGroup>
              </div>
              <div className="specimen-type-form-actions">
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
            title="List of Specimen Types"
            columns={columns}
            rows={types}
            loading={loading}
            emptyText="No specimen types found."
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
