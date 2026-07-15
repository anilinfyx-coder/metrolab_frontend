'use client';
import { FormEvent, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import TopNav from './TopNav';
import { getPortalFromPath, getStoredUser } from './portalConfig';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function ProfilePage() {
  const pathname = usePathname();
  const router = useRouter();
  const portal = getPortalFromPath(pathname || '');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [form, setForm] = useState({
    id: 0,
    name: '',
    email: '',
    mobile: '',
    password: '',
    contact_person_name: '',
    company_name: '',
  });

  useEffect(() => {
    const stored = getStoredUser(portal.userKey);
    if (!stored?.id) {
      router.push(portal.loginPath);
      return;
    }
    const token = localStorage.getItem(portal.tokenKey) || '';
    fetch(`${API}${portal.apiPath}/${stored.id}`, { headers: { token } })
      .then(r => r.json())
      .then(d => {
        if (d.response_code === '200' && d.obj) {
          const u = d.obj;
          setForm({
            id: u.id,
            name: u.name || '',
            email: u.email || '',
            mobile: u.mobile || '',
            password: '',
            contact_person_name: u.contact_person_name || '',
            company_name: u.company_name || '',
          });
        } else {
          setForm(f => ({
            ...f,
            id: stored.id!,
            name: stored.name || '',
            email: stored.email || '',
            company_name: stored.company_name || '',
          }));
        }
      })
      .catch(() => {
        setForm(f => ({
          ...f,
          id: stored.id!,
          name: stored.name || '',
          email: stored.email || '',
        }));
      })
      .finally(() => setLoading(false));
  }, [portal, router]);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.email.trim()) {
      setMsg({ type: 'error', text: 'Email is required.' });
      return;
    }
    setSaving(true);
    setMsg(null);
    const token = localStorage.getItem(portal.tokenKey) || '';

    const payload: Record<string, unknown> = {
      email: form.email.trim(),
      mobile: form.mobile.trim() || null,
    };

    if (portal.nameField === 'company_name') {
      payload.company_name = form.company_name.trim() || form.name.trim();
      if (portal.key === 'b2b') payload.contact_person_name = form.contact_person_name.trim() || null;
    } else {
      payload.name = form.name.trim();
    }

    if (form.password.trim()) {
      payload.password = form.password.trim();
    }

    const res = await fetch(`${API}${portal.apiPath}/${form.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', token },
      body: JSON.stringify(payload),
    });
    const d = await res.json();
    setSaving(false);

    if (d.response_code === '200') {
      const displayName =
        portal.nameField === 'company_name'
          ? (form.company_name || form.name || form.email)
          : (form.name || form.email);
      const stored = getStoredUser(portal.userKey) || {};
      localStorage.setItem(
        portal.userKey,
        JSON.stringify({
          ...stored,
          ...d.obj,
          id: form.id,
          name: displayName,
          email: form.email.trim(),
        })
      );
      setForm(f => ({ ...f, password: '' }));
      setMsg({ type: 'success', text: 'Profile updated successfully.' });
    } else {
      setMsg({ type: 'error', text: typeof d.obj === 'string' ? d.obj : 'Update failed.' });
    }
  };

  const isOrg = portal.nameField === 'company_name';

  return (
    <div className="page-content" style={{ paddingTop: 0 }}>
      <TopNav title="Update Profile" />
      <div style={{ padding: '1.25rem 1.5rem', maxWidth: 560 }}>
        <div className="card">
          <div className="card-header">
            <span className="card-title section-title-accent">Profile Details</span>
          </div>
          <div className="card-body">
            {loading ? (
              <div style={{ color: 'var(--text-muted)' }}>Loading...</div>
            ) : (
              <form onSubmit={save}>
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

                {isOrg ? (
                  <>
                    <div className="form-group">
                      <label htmlFor="profile-company">Company / Lab Name<span className="required-star">*</span></label>
                      <input
                        id="profile-company"
                        value={form.company_name || form.name}
                        onChange={e => setForm(p => ({ ...p, company_name: e.target.value, name: e.target.value }))}
                        required
                      />
                    </div>
                    {portal.key === 'b2b' && (
                      <div className="form-group">
                        <label htmlFor="profile-contact">Contact Person</label>
                        <input
                          id="profile-contact"
                          value={form.contact_person_name}
                          onChange={e => setForm(p => ({ ...p, contact_person_name: e.target.value }))}
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="form-group">
                    <label htmlFor="profile-name">Name<span className="required-star">*</span></label>
                    <input
                      id="profile-name"
                      value={form.name}
                      onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                      required
                    />
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="profile-email">Email<span className="required-star">*</span></label>
                  <input
                    id="profile-email"
                    type="email"
                    value={form.email}
                    onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="profile-mobile">Mobile</label>
                  <input
                    id="profile-mobile"
                    value={form.mobile}
                    onChange={e => setForm(p => ({ ...p, mobile: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="profile-password">
                    New Password
                    <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      {' '}(leave blank to keep current)
                    </span>
                  </label>
                  <input
                    id="profile-password"
                    type="password"
                    value={form.password}
                    onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                    autoComplete="new-password"
                    placeholder="Leave blank to keep current"
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.65rem' }}>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button type="button" className="btn btn-reset" onClick={() => router.back()}>
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
