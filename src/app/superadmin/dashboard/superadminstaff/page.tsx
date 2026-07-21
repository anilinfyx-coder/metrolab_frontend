'use client';
import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import TopNav from '../../../components/TopNav';
import { useConfirm } from '../../../components/ConfirmModal';
import ListingTable, { ActionIcons, ListingColumn } from '../../../components/ListingTable';
import { FormGroup } from '../../../components/FormField';
import PasswordInput from '../../../components/PasswordInput';
import { apiFetch, toastApiError } from '../../../../lib/api';
import { createInvalidHandler, fieldStyle, formResolver } from '../../../../lib/formHelpers';
import {
  PASSWORD_HELPER_TEXT,
  superAdminStaffSchema,
  type SuperAdminStaffFormValues,
} from '../../../../lib/schemas';

interface Staff { id: number; email: string; name: string; mobile: string; role_id: number; status: boolean; }

const emptyStaff: SuperAdminStaffFormValues = {
  name: '',
  email: '',
  mobile: '',
  role_id: '',
  password: '',
  id: null,
};

export default function SuperAdminStaffPage() {
  const confirmDialog = useConfirm();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const schema = useMemo(() => superAdminStaffSchema(!!editingId), [editingId]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SuperAdminStaffFormValues>({
    resolver: formResolver<SuperAdminStaffFormValues>(schema),
    defaultValues: emptyStaff,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<Staff[]>('/api/SuperAdmin', { tokenKey: 'superadmin_token' });
      setStaff(data || []);
    } catch {
      setStaff([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    reset(emptyStaff);
  };

  const save = handleSubmit(async values => {
    setSaving(true);
    const method = editingId ? 'PUT' : 'POST';
    const path = `/api/SuperAdmin${editingId ? `/${editingId}` : ''}`;
    const payload: Record<string, string | number> = {
      name: values.name.trim(),
      email: values.email.trim(),
      mobile: values.mobile.trim(),
      role_id: Number(values.role_id),
    };
    if (values.password?.trim()) payload.password = values.password.trim();

    try {
      await apiFetch(path, {
        method,
        tokenKey: 'superadmin_token',
        body: JSON.stringify(payload),
        successMessage: `Staff member ${editingId ? 'updated' : 'added'} successfully.`,
        errorFallback: 'Unable to save staff. Please try again.',
      });
      resetForm();
      loadData();
    } catch {
      /* error toasted by apiFetch */
    } finally {
      setSaving(false);
    }
  }, createInvalidHandler<SuperAdminStaffFormValues>());

  const remove = async (id: number) => {
    const ok = await confirmDialog({
      title: 'You are trying to delete Staff, Please confirm',
      message: 'This cannot be restored once deleted.',
      cancelText: 'NO, WAIT!',
      confirmText: 'CONFIRM DELETION',
    });
    if (!ok) return;
    try {
      await apiFetch(`/api/SuperAdmin/${id}`, {
        method: 'DELETE',
        tokenKey: 'superadmin_token',
        successMessage: 'Staff member deleted successfully.',
        errorFallback: 'Unable to delete staff member.',
      });
      if (editingId === id) resetForm();
      loadData();
    } catch {
      /* error toasted by apiFetch */
    }
  };

  const toggleStatus = async (s: Staff) => {
    if (s.role_id === 2) {
      toastApiError('Main Super Admin account cannot be disabled.');
      return;
    }
    const enabling = !s.status;
    const ok = await confirmDialog({
      title: enabling ? 'Enable Staff User?' : 'Disable Staff User?',
      message: enabling
        ? `${s.name || 'This staff user'} will become active and can sign in.`
        : `${s.name || 'This staff user'} will become inactive and cannot sign in until enabled again.`,
      cancelText: 'Cancel',
      confirmText: enabling ? 'Enable' : 'Disable',
    });
    if (!ok) return;
    try {
      await apiFetch(`/api/SuperAdmin/${s.id}`, {
        method: 'PUT',
        tokenKey: 'superadmin_token',
        body: JSON.stringify({ status: !s.status }),
        successMessage: 'Status Updated Successfully',
        errorFallback: 'Failed to update status.',
      });
      loadData();
    } catch {
      /* error toasted by apiFetch */
    }
  };

  const openEdit = (s: Staff) => {
    setEditingId(s.id);
    reset({
      name: s.name || '',
      email: s.email || '',
      mobile: s.mobile || '',
      role_id: String(s.role_id || ''),
      password: '',
      id: s.id,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const roleName = (roleId: number) => (
    roleId === 2 ? 'Super Admin User' : roleId === 3 ? 'Super Admin User Staff' : `Role ${roleId}`
  );

  const columns: ListingColumn<Staff>[] = [
    { key: 'name', label: 'Name' },
    { key: 'mobile', label: 'Mobile' },
    { key: 'email', label: 'Email' },
    {
      key: 'role',
      label: 'Role',
      getValue: member => roleName(member.role_id),
      render: member => roleName(member.role_id),
    },
  ];

  return (
    <div className="page-content">
      <TopNav title="Manage Super Admin Staff" />
      <div className="page-body">
        <div className="superadmin-staff-split">
          <div className="card">
            <div className="card-header">
              <span className="card-title">
                {editingId ? 'Edit Super Admin Staff Detail' : 'Super Admin Staff Detail'}
              </span>
            </div>
            <form onSubmit={save} noValidate>
              <div className="card-body">
                <FormGroup label="Name" htmlFor="sf-name" required error={errors.name?.message}>
                  <input
                    id="sf-name"
                    type="text"
                    placeholder="Enter Name"
                    data-field="name"
                    aria-invalid={!!errors.name}
                    style={fieldStyle(!!errors.name)}
                    {...register('name')}
                  />
                </FormGroup>

                <FormGroup label="Email" htmlFor="sf-email" required error={errors.email?.message}>
                  <input
                    id="sf-email"
                    type="email"
                    placeholder="Enter Email"
                    data-field="email"
                    aria-invalid={!!errors.email}
                    style={fieldStyle(!!errors.email)}
                    {...register('email')}
                  />
                </FormGroup>

                <FormGroup label="Mobile No." htmlFor="sf-mobile" required error={errors.mobile?.message}>
                  <input
                    id="sf-mobile"
                    type="text"
                    inputMode="numeric"
                    placeholder="Enter Mobile No. (9-10 digits)"
                    data-field="mobile"
                    aria-invalid={!!errors.mobile}
                    style={fieldStyle(!!errors.mobile)}
                    {...register('mobile')}
                  />
                </FormGroup>

                <FormGroup
                  label="Password"
                  htmlFor="sf-password"
                  required={!editingId}
                  error={errors.password?.message}
                >
                  <PasswordInput
                    id="sf-password"
                    placeholder={editingId ? 'Leave blank to keep unchanged' : 'Enter Password'}
                    data-field="password"
                    aria-invalid={!!errors.password}
                    style={fieldStyle(!!errors.password)}
                    autoComplete="new-password"
                    {...register('password')}
                  />
                  {!editingId && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                      {PASSWORD_HELPER_TEXT}
                    </div>
                  )}
                </FormGroup>

                <FormGroup label="Role" htmlFor="sf-role" required error={errors.role_id?.message}>
                  <select
                    id="sf-role"
                    data-field="role_id"
                    aria-invalid={!!errors.role_id}
                    style={fieldStyle(!!errors.role_id)}
                    {...register('role_id')}
                  >
                    <option value="">Select Role</option>
                    <option value="2">Super Admin User</option>
                    <option value="3">Super Admin User Staff</option>
                  </select>
                </FormGroup>
              </div>
              <div className="superadmin-staff-form-actions">
                <button id="save-staff-btn" type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button type="button" className="btn btn-ghost" onClick={resetForm} disabled={saving}>
                  Reset Data
                </button>
              </div>
            </form>
          </div>

          <ListingTable
            title="List of Super Admin Staffs"
            columns={columns}
            rows={staff}
            loading={loading}
            emptyText="No staff members found."
            actionsLabel="Actions"
            actionsWidth={130}
            defaultPageSize={10}
            rowActions={member => (
              <ActionIcons
                onEdit={() => openEdit(member)}
                onToggleStatus={member.role_id === 2 ? undefined : () => toggleStatus(member)}
                onDelete={() => remove(member.id)}
                statusActive={!!member.status}
                editTitle="Edit Staff"
                deleteTitle="Delete Staff"
                statusTitle={
                  member.role_id === 2
                    ? 'Main Super Admin — cannot be disabled'
                    : member.status
                      ? 'Active — click to disable'
                      : 'Inactive — click to enable'
                }
              />
            )}
          />
        </div>
      </div>
    </div>
  );
}
