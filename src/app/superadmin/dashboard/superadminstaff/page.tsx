'use client';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import TopNav from '../../../components/TopNav';
import { useConfirm } from '../../../components/ConfirmModal';
import ListingTable, { ActionIcons, ListingColumn, ListingHeaderActions } from '../../../components/ListingTable';
import { apiFetch } from '../../../../lib/api';

interface Staff { id: number; email: string; name: string; mobile: string; role_id: number; status: boolean; }

const emptyStaff = { name: '', email: '', mobile: '', role_id: '', password: '' };
type StaffForm = typeof emptyStaff;
type StaffField = keyof StaffForm;
type StaffErrors = Partial<Record<StaffField, string>>;

export default function SuperAdminStaffPage() {
  const confirmDialog = useConfirm();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<StaffForm>({ ...emptyStaff });
  const [errors, setErrors] = useState<StaffErrors>({});
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

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

  const updateField = <K extends StaffField>(field: K, value: StaffForm[K]) => {
    setForm(previous => ({ ...previous, [field]: value }));
    setErrors(previous => {
      if (!previous[field]) return previous;
      const next = { ...previous };
      delete next[field];
      return next;
    });
  };

  const validateForm = (): StaffErrors => {
    const next: StaffErrors = {};
    if (!form.name.trim()) next.name = 'Please enter the staff name.';
    if (!form.email.trim()) {
      next.email = 'Please enter the email address.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      next.email = 'Please enter a valid email address.';
    }
    if (!form.mobile.trim()) {
      next.mobile = 'Please enter the mobile number.';
    } else if (!/^[0-9()+\-\s]{7,20}$/.test(form.mobile.trim())) {
      next.mobile = 'Please enter a valid mobile number.';
    }
    if (!['2', '3'].includes(form.role_id)) next.role_id = 'Please select a role.';
    if (!editingId && !form.password.trim()) {
      next.password = 'Please enter a password.';
    } else if (form.password.trim() && form.password.trim().length < 6) {
      next.password = 'Password must be at least 6 characters.';
    }
    return next;
  };

  const save = async () => {
    const nextErrors = validateForm();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      toast.error('Please correct the highlighted fields before saving.');
      const firstInvalidField = Object.keys(nextErrors)[0];
      window.setTimeout(() => {
        const input = document.querySelector<HTMLElement>(`[data-staff-field="${firstInvalidField}"]`);
        input?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        input?.focus();
      }, 0);
      return;
    }

    setSaving(true);
    const method = editingId ? 'PUT' : 'POST';
    const path = `/api/SuperAdmin${editingId ? `/${editingId}` : ''}`;
    const payload: Record<string, string | number> = {
      name: form.name.trim(),
      email: form.email.trim(),
      mobile: form.mobile.trim(),
      role_id: Number(form.role_id),
    };
    if (form.password.trim()) payload.password = form.password.trim();

    try {
      await apiFetch(path, {
        method,
        tokenKey: 'superadmin_token',
        body: JSON.stringify(payload),
        successMessage: `Staff member ${editingId ? 'updated' : 'added'} successfully.`,
        errorFallback: 'Unable to save staff. Please try again.',
      });
      setForm({ ...emptyStaff });
      setErrors({});
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
      title: 'You are trying to delete Staff, Please confirm',
      message: 'This cannot be restored once deleted.',
      cancelText: 'NO, WAIT!',
      confirmText: 'CONFIRM DELETION',
    });
    if (!ok) return;
    try {
      await apiFetch(`/api/SuperAdmin/${id}`, { method: 'DELETE', tokenKey: 'superadmin_token' });
      loadData();
    } catch {
      /* error toasted by apiFetch */
    }
  };

  const toggleStatus = async (s: Staff) => {
    try {
      await apiFetch(`/api/SuperAdmin/${s.id}`, {
        method: 'PUT',
        tokenKey: 'superadmin_token',
        body: JSON.stringify({ status: !s.status }),
      });
      loadData();
    } catch {
      /* error toasted by apiFetch */
    }
  };

  const openEdit = (s: Staff) => {
    setEditingId(s.id);
    setForm({
      name: s.name || '',
      email: s.email || '',
      mobile: s.mobile || '',
      role_id: String(s.role_id || ''),
      password: '',
    });
    setErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({ ...emptyStaff });
    setErrors({});
  };

  const roleName = (roleId: number) => (
    roleId === 2 ? 'Super Admin User' : roleId === 3 ? 'Super Admin User Staff' : `Role ${roleId}`
  );

  const columns: ListingColumn<Staff>[] = [
    { key: 'name', label: 'Name', width: '23%' },
    { key: 'mobile', label: 'Mobile', width: '19%' },
    { key: 'email', label: 'Email', width: '25%' },
    {
      key: 'role',
      label: 'Role',
      width: '21%',
      getValue: member => roleName(member.role_id),
      render: member => roleName(member.role_id),
    },
  ];

  const fieldStyle = {
    width: '100%',
    background: 'var(--bg-input)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    padding: '0.5rem',
    color: 'var(--text)',
  };
  const fieldErrorStyle = (field: StaffField) => ({
    ...fieldStyle,
    borderColor: errors[field] ? '#ef4444' : 'var(--border)',
    boxShadow: errors[field] ? '0 0 0 1px rgba(239,68,68,0.15)' : 'none',
  });
  const errorMessage = (field: StaffField) => errors[field] ? (
    <div role="alert" style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '0.35rem', fontWeight: 500 }}>
      {errors[field]}
    </div>
  ) : null;

  return (
    <div className="page-content">
      <TopNav title="Manage Super Admin Staff" />
      <div style={{ padding: '1.5rem' }}>
        <div className="superadmin-staff-split">
          <div className="card">
            <div className="card-header">
              <span className="card-title">
                {editingId ? 'Edit Super Admin Staff Detail' : 'Super Admin Staff Detail'}
              </span>
            </div>
            <div className="card-body">
              <div className="form-group">
                <label htmlFor="sf-name">Name<span className="required-star">*</span></label>
                <input
                  id="sf-name"
                  type="text"
                  placeholder="Enter Name"
                  value={form.name}
                  data-staff-field="name"
                  aria-invalid={!!errors.name}
                  onChange={e => updateField('name', e.target.value)}
                  style={fieldErrorStyle('name')}
                />
                {errorMessage('name')}
              </div>

              <div className="form-group">
                <label htmlFor="sf-email">Email<span className="required-star">*</span></label>
                <input
                  id="sf-email"
                  type="email"
                  placeholder="Enter Email"
                  value={form.email}
                  data-staff-field="email"
                  aria-invalid={!!errors.email}
                  onChange={e => updateField('email', e.target.value)}
                  style={fieldErrorStyle('email')}
                />
                {errorMessage('email')}
              </div>

              <div className="form-group">
                <label htmlFor="sf-mobile">Mobile No.<span className="required-star">*</span></label>
                <input
                  id="sf-mobile"
                  type="text"
                  placeholder="Enter Mobile No."
                  value={form.mobile}
                  data-staff-field="mobile"
                  aria-invalid={!!errors.mobile}
                  onChange={e => updateField('mobile', e.target.value)}
                  style={fieldErrorStyle('mobile')}
                />
                {errorMessage('mobile')}
              </div>

              <div className="form-group">
                <label htmlFor="sf-password">
                  Password{!editingId && <span className="required-star">*</span>}
                </label>
                <input
                  id="sf-password"
                  type="password"
                  placeholder={editingId ? 'Leave blank to keep unchanged' : 'Enter Password'}
                  value={form.password}
                  data-staff-field="password"
                  aria-invalid={!!errors.password}
                  onChange={e => updateField('password', e.target.value)}
                  style={fieldErrorStyle('password')}
                />
                {errorMessage('password')}
              </div>

              <div className="form-group">
                <label htmlFor="sf-role">Role<span className="required-star">*</span></label>
                <select
                  id="sf-role"
                  value={form.role_id}
                  data-staff-field="role_id"
                  aria-invalid={!!errors.role_id}
                  onChange={e => updateField('role_id', e.target.value)}
                  style={fieldErrorStyle('role_id')}
                >
                  <option value="">Select Role</option>
                  <option value="2">Super Admin User</option>
                  <option value="3">Super Admin User Staff</option>
                </select>
                {errorMessage('role_id')}
              </div>
            </div>
            <div className="superadmin-staff-form-actions">
              <button id="save-staff-btn" className="btn btn-primary" onClick={save} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={resetForm} disabled={saving}>
                Reset Data
              </button>
            </div>
          </div>

          <ListingTable
            title="List of Super Admin Staffs"
            columns={columns}
            rows={staff}
            loading={loading}
            emptyText="No staff members found."
            headerActions={<ListingHeaderActions onRefresh={loadData} />}
            actionsLabel="Actions"
            actionsWidth={130}
            defaultPageSize={10}
            rowActions={member => (
              <ActionIcons
                onEdit={() => openEdit(member)}
                onToggleStatus={() => toggleStatus(member)}
                onDelete={() => remove(member.id)}
                statusActive={!!member.status}
                editTitle="Edit Staff"
                deleteTitle="Delete Staff"
              />
            )}
          />
        </div>
      </div>
    </div>
  );
}
