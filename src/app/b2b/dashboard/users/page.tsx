'use client';
import { useState, useEffect, useMemo } from 'react';
import { MdDelete, MdEdit, MdToggleOff, MdToggleOn } from 'react-icons/md';
import TopNav from '../../../components/TopNav';
import { useConfirm } from '../../../components/ConfirmModal';
import TablePagination, { useClientPagination } from '../../../components/TablePagination';
import { apiFetch, toastApiError } from '../../../../lib/api';

function getUser() { return typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('b2b_user') || '{}') : {}; }

interface B2BUser {
  id: number;
  name: string;
  email: string;
  mobile: string;
  status: boolean;
  role_id: number;
  user_id?: number;
}

const emptyForm = { name: '', email: '', mobile: '', password: '', role_id: '6', id: null as number | null };

function roleLabel(roleId: number | string) {
  const id = Number(roleId);
  if (id === 6) return 'Admin User';
  if (id === 7) return 'Admin User Staff';
  return 'User';
}

/** Same rules as B2B Change Password: min 6 chars; only @ # as special chars */
function validatePassword(password: string): string | null {
  const pwd = password.trim();
  if (!pwd) return 'Password is required.';
  if (pwd.length < 6) return 'Password must be at least 6 characters.';
  if (/[^a-zA-Z0-9@#]/.test(pwd)) return 'Only @ # are allowed as special characters in password.';
  return null;
}

export default function B2BUsersPage() {
  const confirmDialog = useConfirm();
  const [users, setUsers] = useState<B2BUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState({ name: '', mobile: '', email: '', role: '' });

  const loadData = async () => {
    setLoading(true);
    const b2bId = getUser().id;
    const qs = b2bId ? `?user_id=${b2bId}` : '';
    try {
      const data = await apiFetch<B2BUser[]>(`/api/AdminUsers${qs}`, {
        tokenKey: 'b2b_token',
        errorFallback: 'Unable to load staff users.',
      });
      setUsers(data || []);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const role = roleLabel(u.role_id).toLowerCase();
      return (
        (!filters.name || (u.name || '').toLowerCase().includes(filters.name.toLowerCase())) &&
        (!filters.mobile || (u.mobile || '').toLowerCase().includes(filters.mobile.toLowerCase())) &&
        (!filters.email || (u.email || '').toLowerCase().includes(filters.email.toLowerCase())) &&
        (!filters.role || role.includes(filters.role.toLowerCase()))
      );
    });
  }, [users, filters]);

  const { page, setPage, pageSize, setPageSize, totalPages, pageItems, total } =
    useClientPagination(filteredUsers, 10);

  const resetForm = () => {
    setForm({ ...emptyForm });
  };

  const save = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.mobile.trim() || !form.role_id) {
      toastApiError('Name, Email, Mobile No. and Role are required.');
      return;
    }

    // Password required on add; on edit validate only if provided
    if (!form.id || form.password.trim()) {
      const pwdError = validatePassword(form.password);
      if (pwdError) {
        toastApiError(pwdError);
        return;
      }
    }

    setSaving(true);

    const method = form.id ? 'PUT' : 'POST';
    const path = `/api/AdminUsers${form.id ? `/${form.id}` : ''}`;
    const b2b_client_id = getUser().id;

    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      email: form.email.trim(),
      mobile: form.mobile.trim(),
      role_id: form.role_id,
      user_id: b2b_client_id,
    };

    if (form.password.trim()) {
      payload.password = form.password.trim();
    }

    try {
      await apiFetch(path, {
        method,
        tokenKey: 'b2b_token',
        body: JSON.stringify(payload),
        successMessage: `Staff user ${form.id ? 'updated' : 'added'}.`,
        errorFallback: 'Unable to save staff user.',
      });
      resetForm();
      loadData();
    } catch {
      /* toast handled by apiFetch */
    } finally {
      setSaving(false);
    }
  };

  const editUser = (u: B2BUser) => {
    setForm({
      name: u.name || '',
      email: u.email || '',
      mobile: u.mobile || '',
      password: '',
      role_id: String(u.role_id ?? 2),
      id: u.id,
    });
  };

  const remove = async (id: number) => {
    const ok = await confirmDialog({
      title: 'You are trying to delete User, Please confirm',
      message: 'This cannot be restored once deleted.',
      cancelText: 'NO, WAIT!',
      confirmText: 'CONFIRM DELETION',
    });
    if (!ok) return;
    try {
      await apiFetch(`/api/AdminUsers/${id}`, {
        method: 'DELETE',
        tokenKey: 'b2b_token',
        successMessage: 'User deleted successfully.',
        errorFallback: 'Unable to delete user.',
      });
      if (form.id === id) resetForm();
      loadData();
    } catch {
      /* toast handled by apiFetch */
    }
  };

  const toggleStatus = async (u: B2BUser) => {
    try {
      await apiFetch(`/api/AdminUsers/${u.id}`, {
        method: 'PUT',
        tokenKey: 'b2b_token',
        body: JSON.stringify({ status: !u.status }),
        successMessage: 'Status Updated Successfully',
        errorFallback: 'Failed to update status.',
      });
      loadData();
    } catch {
      /* toast handled by apiFetch */
    }
  };

  return (
    <div className="page-content" style={{ paddingTop: 0 }}>
      <TopNav title="Manage Staff Users" />

      <div style={{ padding: '1.25rem 1.5rem' }}>
        <div className="split-pane">
          {/* Left: Staff Users Detail form */}
          <div className="card">
            <div className="card-header">
              <span className="card-title section-title-accent">Staff Users Detail</span>
            </div>
            <div className="card-body">
              <div className="form-group">
                <label htmlFor="staff-name">
                  Name<span className="required-star">*</span>
                </label>
                <input
                  id="staff-name"
                  type="text"
                  placeholder="Enter Name"
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label htmlFor="staff-email">
                  Email<span className="required-star">*</span>
                </label>
                <input
                  id="staff-email"
                  type="email"
                  placeholder="Enter Email"
                  value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label htmlFor="staff-mobile">
                  Mobile No.<span className="required-star">*</span>
                </label>
                <input
                  id="staff-mobile"
                  type="text"
                  placeholder="Enter Mobile No."
                  value={form.mobile}
                  onChange={e => setForm(p => ({ ...p, mobile: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label htmlFor="staff-password">
                  Password{!form.id && <span className="required-star">*</span>}
                  {form.id && (
                    <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      {' '}(leave blank to keep current)
                    </span>
                  )}
                </label>
                <input
                  id="staff-password"
                  type="password"
                  placeholder={form.id ? 'Leave blank to keep current' : 'Enter Password'}
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  autoComplete="new-password"
                />
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.35rem', fontStyle: 'italic' }}>
                  (Enter atleast 6 characters. Only @ # are allowed as special character)
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="staff-role">
                  Role<span className="required-star">*</span>
                </label>
                <select
                  id="staff-role"
                  value={form.role_id}
                  onChange={e => setForm(p => ({ ...p, role_id: e.target.value }))}
                >
                  <option value="6">Admin User</option>
                  <option value="7">Admin User Staff</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.65rem', marginTop: '0.5rem' }}>
                <button className="btn btn-primary" onClick={save} disabled={saving}>
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button className="btn btn-reset" type="button" onClick={resetForm}>
                  Reset Data
                </button>
              </div>
            </div>
          </div>

          {/* Right: List of Staff Users */}
          <div className="card">
            <div className="card-header">
              <span className="card-title section-title-accent">List of Staff Users</span>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              {loading ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Mobile</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Actions</th>
                      </tr>
                      <tr className="table-filter-row">
                        <td>
                          <input
                            value={filters.name}
                            onChange={e => setFilters(f => ({ ...f, name: e.target.value }))}
                          />
                        </td>
                        <td>
                          <input
                            value={filters.mobile}
                            onChange={e => setFilters(f => ({ ...f, mobile: e.target.value }))}
                          />
                        </td>
                        <td>
                          <input
                            value={filters.email}
                            onChange={e => setFilters(f => ({ ...f, email: e.target.value }))}
                          />
                        </td>
                        <td>
                          <input
                            value={filters.role}
                            onChange={e => setFilters(f => ({ ...f, role: e.target.value }))}
                          />
                        </td>
                        <td />
                      </tr>
                    </thead>
                    <tbody>
                      {pageItems.map(u => (
                        <tr key={u.id}>
                          <td style={{ fontWeight: 500 }}>{u.name}</td>
                          <td>{u.mobile || '—'}</td>
                          <td>{u.email}</td>
                          <td>{roleLabel(u.role_id)}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                              <button
                                type="button"
                                className="action-btn action-btn-edit"
                                title="Edit"
                                onClick={() => editUser(u)}
                              >
                                <MdEdit size={15} aria-hidden />
                              </button>
                              <button
                                type="button"
                                className={`action-btn action-btn-status${u.status ? '' : ' inactive'}`}
                                title={u.status ? 'Active — click to disable' : 'Inactive — click to enable'}
                                onClick={() => toggleStatus(u)}
                              >
                                {u.status ? (
                                  <MdToggleOn size={18} aria-hidden />
                                ) : (
                                  <MdToggleOff size={18} aria-hidden />
                                )}
                              </button>
                              <button
                                type="button"
                                className="action-btn action-btn-delete"
                                title="Delete"
                                onClick={() => remove(u.id)}
                              >
                                <MdDelete size={14} aria-hidden />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {pageItems.length === 0 && (
                        <tr>
                          <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                            No staff users found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
              {!loading && (
                <TablePagination
                  pageSize={pageSize}
                  onPageSizeChange={setPageSize}
                  page={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                  total={total}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
