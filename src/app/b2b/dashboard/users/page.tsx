'use client';
import { useState, useEffect, useMemo } from 'react';
import TopNav from '../../../components/TopNav';
import { useConfirm } from '../../../components/ConfirmModal';
import TablePagination, { useClientPagination } from '../../../components/TablePagination';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('b2b_token') || '' : ''; }
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

const emptyForm = { name: '', email: '', mobile: '', password: '', role_id: '2', id: null as number | null };

function roleLabel(roleId: number | string) {
  const id = Number(roleId);
  if (id === 1) return 'Admin';
  if (id === 2) return 'Staff';
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
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [filters, setFilters] = useState({ name: '', mobile: '', email: '', role: '' });

  const loadData = () => {
    setLoading(true);
    const b2bId = getUser().id;
    const qs = b2bId ? `?user_id=${b2bId}` : '';
    fetch(`${API}/api/AdminUsers${qs}`, { headers: { token: getToken() } })
      .then(r => r.json())
      .then(d => {
        if (d.response_code === '200') setUsers(d.obj || []);
      })
      .finally(() => setLoading(false));
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
    setMsg(null);
  };

  const save = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.mobile.trim() || !form.role_id) {
      setMsg({ type: 'error', text: 'Name, Email, Mobile No. and Role are required.' });
      return;
    }

    // Password required on add; on edit validate only if provided
    if (!form.id || form.password.trim()) {
      const pwdError = validatePassword(form.password);
      if (pwdError) {
        setMsg({ type: 'error', text: pwdError });
        return;
      }
    }

    setSaving(true);
    setMsg(null);

    const method = form.id ? 'PUT' : 'POST';
    const url = `${API}/api/AdminUsers${form.id ? `/${form.id}` : ''}`;
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

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', token: getToken() },
      body: JSON.stringify(payload),
    });
    const d = await res.json();
    setSaving(false);

    if (d.response_code === '200') {
      setMsg({
        type: 'success',
        text: `Staff user ${form.id ? 'updated' : 'added'}.`,
      });
      resetForm();
      loadData();
    } else {
      setMsg({ type: 'error', text: typeof d.obj === 'string' ? d.obj : JSON.stringify(d.obj) });
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
    setMsg(null);
  };

  const remove = async (id: number) => {
    const ok = await confirmDialog({
      title: 'You are trying to delete User, Please confirm',
      message: 'This cannot be restored once deleted.',
      cancelText: 'NO, WAIT!',
      confirmText: 'CONFIRM DELETION',
    });
    if (!ok) return;
    await fetch(`${API}/api/AdminUsers/${id}`, { method: 'DELETE', headers: { token: getToken() } });
    if (form.id === id) resetForm();
    setMsg({ type: 'success', text: 'User deleted successfully.' });
    loadData();
  };

  const toggleStatus = async (u: B2BUser) => {
    const res = await fetch(`${API}/api/AdminUsers/${u.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', token: getToken() },
      body: JSON.stringify({ status: !u.status }),
    });
    const d = await res.json();
    if (d.response_code === '200') {
      setMsg({ type: 'success', text: 'Status Updated Successfully' });
      loadData();
    } else {
      setMsg({ type: 'error', text: typeof d.obj === 'string' ? d.obj : 'Failed to update status.' });
    }
  };

  return (
    <div className="page-content" style={{ paddingTop: 0 }}>
      <TopNav title="Manage Staff Users" />

      <div style={{ padding: '1.25rem 1.5rem' }}>
        {msg && (
          <div
            style={{
              background: msg.type === 'success' ? 'rgba(0,128,0,0.08)' : 'rgba(231,76,60,0.08)',
              border: `1px solid ${msg.type === 'success' ? 'rgba(0,128,0,0.25)' : 'rgba(231,76,60,0.25)'}`,
              borderRadius: 4,
              padding: '0.55rem 0.75rem',
              marginBottom: '1rem',
              fontSize: '0.82rem',
              color: msg.type === 'success' ? '#008000' : '#c0392b',
            }}
          >
            {msg.text}
          </div>
        )}

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
                  <option value="1">Admin</option>
                  <option value="2">Staff</option>
                  <option value="3">User</option>
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
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                                  <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                className={`action-btn action-btn-status${u.status ? '' : ' inactive'}`}
                                title={u.status ? 'Active — click to disable' : 'Inactive — click to enable'}
                                onClick={() => toggleStatus(u)}
                              >
                                {u.status ? (
                                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                                    <path d="M17 7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h10c2.76 0 5-2.24 5-5s-2.24-5-5-5zm0 8c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z" />
                                  </svg>
                                ) : (
                                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                                    <path d="M17 7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h10c2.76 0 5-2.24 5-5s-2.24-5-5-5zM7 15c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z" />
                                  </svg>
                                )}
                              </button>
                              <button
                                type="button"
                                className="action-btn action-btn-delete"
                                title="Delete"
                                onClick={() => remove(u.id)}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                                  <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                                </svg>
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
