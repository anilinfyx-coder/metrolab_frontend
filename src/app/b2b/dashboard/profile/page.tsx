'use client';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import TopNav from '../../../components/TopNav';
import { getStoredUser } from '../../../components/portalConfig';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const emptyProfile = {
  id: 0,
  support_person_name: '',
  support_mobile: '',
  support_email: '',
  primary_color_code: '#0076A3',
  public_phone_no: '',
  public_email: '',
  public_fax: '',
  tagline: '',
  smtp_server: '',
  smtp_port: '',
  smtp_email: '',
  smtp_password: '',
  company_name: '',
  contact_person_name: '',
};

type ProfileForm = typeof emptyProfile;

export default function B2BProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPwd, setChangingPwd] = useState(false);
  const [form, setForm] = useState<ProfileForm>({ ...emptyProfile });
  const [pwd, setPwd] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [pwdMsg, setPwdMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const token = () => localStorage.getItem('b2b_token') || '';

  useEffect(() => {
    const stored = getStoredUser('b2b_user');
    if (!stored?.id) {
      router.push('/');
      return;
    }
    fetch(`${API}/api/B2bClients/${stored.id}`, { headers: { token: token() } })
      .then(r => r.json())
      .then(d => {
        if (d.response_code === '200' && d.obj) {
          const u = d.obj;
          setForm({
            id: u.id,
            support_person_name: u.support_person_name || '',
            support_mobile: u.support_mobile || '',
            support_email: u.support_email || '',
            primary_color_code: u.primary_color_code || '#0076A3',
            public_phone_no: u.public_phone_no || '',
            public_email: u.public_email || '',
            public_fax: u.public_fax || '',
            tagline: u.tagline || '',
            smtp_server: u.smtp_server || '',
            smtp_port: u.smtp_port || '',
            smtp_email: u.smtp_email || '',
            smtp_password: u.smtp_password || '',
            company_name: u.company_name || '',
            contact_person_name: u.contact_person_name || '',
          });
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  const setField = (key: keyof ProfileForm, value: string) => {
    setForm(p => ({ ...p, [key]: value }));
  };

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    const payload = {
      support_person_name: form.support_person_name.trim(),
      support_mobile: form.support_mobile.trim(),
      support_email: form.support_email.trim(),
      primary_color_code: form.primary_color_code.trim(),
      public_phone_no: form.public_phone_no.trim(),
      public_email: form.public_email.trim(),
      public_fax: form.public_fax.trim(),
      tagline: form.tagline.trim(),
      smtp_server: form.smtp_server.trim(),
      smtp_port: form.smtp_port.trim(),
      smtp_email: form.smtp_email.trim(),
      smtp_password: form.smtp_password,
    };
    const res = await fetch(`${API}/api/B2bClients/${form.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', token: token() },
      body: JSON.stringify(payload),
    });
    const d = await res.json();
    setSaving(false);
    if (d.response_code === '200') {
      setMsg({ type: 'success', text: 'Profile saved successfully.' });
      const stored = getStoredUser('b2b_user') || {};
      localStorage.setItem(
        'b2b_user',
        JSON.stringify({
          ...stored,
          id: form.id,
          name: form.company_name || stored.name,
          email: stored.email,
        })
      );
    } else {
      setMsg({ type: 'error', text: typeof d.obj === 'string' ? d.obj : 'Failed to save profile.' });
    }
  };

  const changePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPwdMsg(null);
    if (!pwd.oldPassword || !pwd.newPassword || !pwd.confirmPassword) {
      setPwdMsg({ type: 'error', text: 'All password fields are required.' });
      return;
    }
    if (pwd.newPassword.length < 6) {
      setPwdMsg({ type: 'error', text: 'New password must be at least 6 characters.' });
      return;
    }
    if (/[^a-zA-Z0-9@#]/.test(pwd.newPassword)) {
      setPwdMsg({ type: 'error', text: 'Only @ # are allowed as special characters.' });
      return;
    }
    if (pwd.newPassword !== pwd.confirmPassword) {
      setPwdMsg({ type: 'error', text: 'New password and confirm password do not match.' });
      return;
    }

    setChangingPwd(true);
    const res = await fetch(`${API}/api/B2bClients/changePassword`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', token: token() },
      body: JSON.stringify({
        userId: form.id,
        oldPassword: pwd.oldPassword,
        newPassword: pwd.newPassword,
      }),
    });
    const d = await res.json();
    setChangingPwd(false);
    if (d.response_code === '200') {
      setPwdMsg({ type: 'success', text: 'Password changed successfully.' });
      setPwd({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } else {
      setPwdMsg({ type: 'error', text: typeof d.obj === 'string' ? d.obj : 'Failed to change password.' });
    }
  };

  const field = (
    id: string,
    label: string,
    key: keyof ProfileForm,
    opts?: { type?: string; placeholder?: string }
  ) => (
    <div className="form-group">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type={opts?.type || 'text'}
        placeholder={opts?.placeholder}
        value={String(form[key] ?? '')}
        onChange={e => setField(key, e.target.value)}
      />
    </div>
  );

  return (
    <div className="page-content" style={{ paddingTop: 0 }}>
      <TopNav title="B2B Profile" />

      <div style={{ padding: '1.25rem 1.5rem' }}>
        {loading ? (
          <div style={{ color: 'var(--text-muted)', padding: '2rem 0' }}>Loading...</div>
        ) : (
          <div className="split-pane" style={{ gridTemplateColumns: 'minmax(0, 2fr) minmax(260px, 1fr)' }}>
            {/* Profile */}
            <div className="card">
              <div className="card-header">
                <span className="card-title" style={{ color: 'var(--text)', fontWeight: 700 }}>Profile</span>
              </div>
              <div className="card-body">
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

                <form onSubmit={saveProfile}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1.25rem' }}>
                    {field('support_person_name', 'Support Person Name', 'support_person_name')}
                    {field('support_mobile', 'Support Mobile', 'support_mobile')}
                    {field('support_email', 'Support Email', 'support_email', { type: 'email' })}

                    <div className="form-group">
                      <label htmlFor="primary_color_code">Primary Colour code</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <input
                          type="color"
                          aria-label="Pick color"
                          value={/^#[0-9A-Fa-f]{6}$/.test(form.primary_color_code) ? form.primary_color_code : '#0076A3'}
                          onChange={e => setField('primary_color_code', e.target.value.toUpperCase())}
                          style={{
                            width: 36,
                            height: 36,
                            padding: 0,
                            border: '1px solid var(--border)',
                            borderRadius: 4,
                            cursor: 'pointer',
                            background: 'transparent',
                          }}
                        />
                        <input
                          id="primary_color_code"
                          type="text"
                          value={form.primary_color_code}
                          onChange={e => setField('primary_color_code', e.target.value)}
                          placeholder="#0076A3"
                          style={{ flex: 1 }}
                        />
                      </div>
                    </div>

                    {field('public_phone_no', 'Public Phone Number', 'public_phone_no')}
                    {field('public_email', 'Public Email', 'public_email', { type: 'email' })}
                    {field('public_fax', 'Public Fax', 'public_fax')}
                    {field('tagline', 'Tagline', 'tagline')}
                    {field('smtp_server', 'SMTP Server', 'smtp_server')}
                    {field('smtp_port', 'SMTP Port', 'smtp_port')}
                    {field('smtp_email', 'SMTP Email', 'smtp_email', { type: 'email' })}
                    {field('smtp_password', 'SMTP Password', 'smtp_password')}
                  </div>

                  <div style={{ marginTop: '0.5rem' }}>
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                      {saving ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Change Password */}
            <div className="card">
              <div className="card-header">
                <span className="card-title" style={{ color: 'var(--text)', fontWeight: 700 }}>Change Password</span>
              </div>
              <div className="card-body">
                {pwdMsg && (
                  <div
                    style={{
                      background: pwdMsg.type === 'success' ? 'rgba(0,128,0,0.08)' : 'rgba(231,76,60,0.08)',
                      border: `1px solid ${pwdMsg.type === 'success' ? 'rgba(0,128,0,0.25)' : 'rgba(231,76,60,0.25)'}`,
                      borderRadius: 4,
                      padding: '0.55rem 0.75rem',
                      marginBottom: '1rem',
                      fontSize: '0.82rem',
                      color: pwdMsg.type === 'success' ? '#008000' : '#c0392b',
                    }}
                  >
                    {pwdMsg.text}
                  </div>
                )}

                <form onSubmit={changePassword}>
                  <div className="form-group">
                    <label htmlFor="old_password">Old Password</label>
                    <input
                      id="old_password"
                      type="password"
                      placeholder="Password"
                      value={pwd.oldPassword}
                      onChange={e => setPwd(p => ({ ...p, oldPassword: e.target.value }))}
                      autoComplete="current-password"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="new_password">New Password</label>
                    <input
                      id="new_password"
                      type="password"
                      placeholder="Password"
                      value={pwd.newPassword}
                      onChange={e => setPwd(p => ({ ...p, newPassword: e.target.value }))}
                      autoComplete="new-password"
                    />
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.35rem', fontStyle: 'italic' }}>
                      (Enter atleast 6 characters. Only @ # are allowed as special character)
                    </div>
                  </div>
                  <div className="form-group">
                    <label htmlFor="confirm_password">Confirm Password</label>
                    <input
                      id="confirm_password"
                      type="password"
                      placeholder="Password"
                      value={pwd.confirmPassword}
                      onChange={e => setPwd(p => ({ ...p, confirmPassword: e.target.value }))}
                      autoComplete="new-password"
                    />
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={changingPwd}>
                    {changingPwd ? 'Saving…' : 'Change Password'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
