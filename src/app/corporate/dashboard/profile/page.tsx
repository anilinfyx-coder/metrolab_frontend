'use client';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save, KeyRound, Building2 } from 'lucide-react';
import TopNav from '../../../components/TopNav';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('corporate_token') || '' : ''; }
function getStoredUser() {
  if (typeof window === 'undefined') return null;
  try { return JSON.parse(localStorage.getItem('corporate_user') || '{}'); } catch { return {}; }
}


export default function CorporateProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [pwMsg, setPwMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  
  const [profile, setProfile] = useState({
    company_name: '',
    contact_person_name: '',
    email: '',
    mobile: '',
    address: '',
    pincode: '',
  });

  const [password, setPassword] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored?.id) { router.push('/corporate/login'); return; }
    setUserId(stored.id);

    fetch(`${API}/api/CorporateClients/${stored.id}`, { headers: { token: getToken() } })
      .then(r => r.json())
      .then(d => {
        if (d.response_code === '200' && d.obj) {
          const u = d.obj;
          setProfile({
            company_name: u.company_name || '',
            contact_person_name: u.contact_person_name || '',
            email: u.email || '',
            mobile: u.mobile || '',
            address: u.address || '',
            pincode: u.pincode || '',
          });
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile.email.trim()) { setProfileMsg({ type: 'error', text: 'Email is required.' }); return; }
    setSavingProfile(true); setProfileMsg(null);

    const res = await fetch(`${API}/api/CorporateClients/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', token: getToken() },
      body: JSON.stringify({
        company_name: profile.company_name,
        contact_person_name: profile.contact_person_name,
        mobile: profile.mobile,
        address: profile.address,
        pincode: profile.pincode,
      }),
    });
    const d = await res.json();
    setSavingProfile(false);
    if (d.response_code === '200') {
      const stored = getStoredUser() || {};
      localStorage.setItem('corporate_user', JSON.stringify({ ...stored, name: profile.company_name, email: profile.email }));
      setProfileMsg({ type: 'success', text: 'Profile updated successfully.' });
    } else {
      setProfileMsg({ type: 'error', text: typeof d.obj === 'string' ? d.obj : 'Update failed.' });
    }
  };

  const changePassword = async () => {
    if (!password.newPassword) { setPwMsg({ type: 'error', text: 'New Password is required.' }); return; }
    if (password.newPassword.length < 6) { setPwMsg({ type: 'error', text: 'Password must be at least 6 characters.' }); return; }
    if (password.newPassword !== password.confirmPassword) { setPwMsg({ type: 'error', text: 'New Password and Confirm Password do not match.' }); return; }

    setSavingPassword(true); setPwMsg(null);
    const res = await fetch(`${API}/api/CorporateClients/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', token: getToken() },
      body: JSON.stringify({ password: password.newPassword }),
    });
    const d = await res.json();
    setSavingPassword(false);
    if (d.response_code === '200') {
      setPwMsg({ type: 'success', text: 'Password changed successfully.' });
      setPassword({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } else {
      setPwMsg({ type: 'error', text: typeof d.obj === 'string' ? d.obj : 'Password update failed.' });
    }
  };

  const MsgBox = ({ msg }: { msg: { type: 'success' | 'error'; text: string } | null }) =>
    msg ? (
      <div style={{
        background: msg.type === 'success' ? 'rgba(10,106,49,0.12)' : 'rgba(240,14,14,0.10)',
        border: `1px solid ${msg.type === 'success' ? 'rgba(10,106,49,0.35)' : 'rgba(240,14,14,0.3)'}`,
        borderRadius: 5, padding: '0.6rem 0.9rem', marginBottom: '1rem',
        fontSize: '0.85rem', color: msg.type === 'success' ? '#0a6a31' : '#c0392b',
      }}>{msg.text}</div>
    ) : null;

  const inp = (key: keyof typeof profile, label: string, type = 'text', disabled = false) => (
    <div className="form-group" style={{ marginBottom: '0.9rem' }}>
      <label style={{ fontWeight: 500, fontSize: '0.875rem', marginBottom: '0.35rem', display: 'block' }}>{label}</label>
      <input
        type={type} disabled={disabled}
        style={{ width: '100%', background: disabled ? 'var(--bg-card)' : 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 6, padding: '0.5rem 0.75rem', color: 'var(--text)', opacity: disabled ? 0.7 : 1 }}
        value={profile[key]} onChange={e => setProfile(p => ({ ...p, [key]: e.target.value }))}
      />
    </div>
  );

  if (loading) {
    return <div className="page-content"><TopNav title="Profile" /><div style={{ padding: '3rem', color: 'var(--text-muted)', textAlign: 'center' }}>Loading...</div></div>;
  }

  return (
    <div className="page-content">
      <TopNav title="Update Profile" />
      <div style={{ padding: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>

          {/* ── LEFT CARD: Profile ── */}
          <div className="card">
            <div className="card-header">
              <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Building2 size={18} /> Profile
              </span>
            </div>
            <div className="card-body">
              <MsgBox msg={profileMsg} />
              <form onSubmit={saveProfile}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ fontWeight: 500, fontSize: '0.875rem', display: 'block', marginBottom: '0.35rem' }}>Company Name</label>
                    <input disabled style={{ width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6, padding: '0.5rem 0.75rem', color: 'var(--text)', opacity: 0.7 }}
                      value={profile.company_name} onChange={e => setProfile(p => ({ ...p, company_name: e.target.value }))} />
                  </div>
                  <div>
                    <label style={{ fontWeight: 500, fontSize: '0.875rem', display: 'block', marginBottom: '0.35rem' }}>Contact Person Name</label>
                    <input style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 6, padding: '0.5rem 0.75rem', color: 'var(--text)' }}
                      value={profile.contact_person_name} onChange={e => setProfile(p => ({ ...p, contact_person_name: e.target.value }))} />
                  </div>
                  <div>
                    <label style={{ fontWeight: 500, fontSize: '0.875rem', display: 'block', marginBottom: '0.35rem' }}>Email</label>
                    <input type="email" disabled style={{ width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6, padding: '0.5rem 0.75rem', color: 'var(--text)', opacity: 0.7 }}
                      value={profile.email} />
                  </div>
                  <div>
                    <label style={{ fontWeight: 500, fontSize: '0.875rem', display: 'block', marginBottom: '0.35rem' }}>Mobile No.</label>
                    <input disabled style={{ width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6, padding: '0.5rem 0.75rem', color: 'var(--text)', opacity: 0.7 }}
                      value={profile.mobile} onChange={e => setProfile(p => ({ ...p, mobile: e.target.value }))} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginTop: '0.75rem' }}>
                  <div>
                    <label style={{ fontWeight: 500, fontSize: '0.875rem', display: 'block', marginBottom: '0.35rem' }}>Address</label>
                    <input style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 6, padding: '0.5rem 0.75rem', color: 'var(--text)' }}
                      placeholder="Enter Address" value={profile.address} onChange={e => setProfile(p => ({ ...p, address: e.target.value }))} />
                  </div>
                  <div>
                    <label style={{ fontWeight: 500, fontSize: '0.875rem', display: 'block', marginBottom: '0.35rem' }}>Pincode</label>
                    <input style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 6, padding: '0.5rem 0.75rem', color: 'var(--text)' }}
                      placeholder="Pincode" value={profile.pincode} onChange={e => setProfile(p => ({ ...p, pincode: e.target.value }))} />
                  </div>
                </div>

                <div style={{ marginTop: '1.25rem' }}>
                  <button type="submit" disabled={savingProfile} style={{ background: '#17a2b8', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.5rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem' }}>
                    <Save size={15} /> {savingProfile ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* ── RIGHT CARD: Change Password ── */}
          <div className="card">
            <div className="card-header">
              <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <KeyRound size={18} /> Change Password
              </span>
            </div>
            <div className="card-body">
              <MsgBox msg={pwMsg} />
              <div style={{ marginBottom: '0.9rem' }}>
                <label style={{ fontWeight: 500, fontSize: '0.875rem', display: 'block', marginBottom: '0.35rem' }}>Old Password</label>
                <input type="password" style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 6, padding: '0.5rem 0.75rem', color: 'var(--text)' }}
                  placeholder="Current password" value={password.oldPassword} onChange={e => setPassword(p => ({ ...p, oldPassword: e.target.value }))} />
              </div>
              <div style={{ marginBottom: '0.9rem' }}>
                <label style={{ fontWeight: 500, fontSize: '0.875rem', display: 'block', marginBottom: '0.35rem' }}>New Password</label>
                <input type="password" style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 6, padding: '0.5rem 0.75rem', color: 'var(--text)' }}
                  placeholder="Min. 6 characters. Only @, # allowed as special characters" value={password.newPassword} onChange={e => setPassword(p => ({ ...p, newPassword: e.target.value }))} />
                <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>(Enter at least 6 characters. Only @,# are allowed as special character)</small>
              </div>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ fontWeight: 500, fontSize: '0.875rem', display: 'block', marginBottom: '0.35rem' }}>Confirm Password</label>
                <input type="password" style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 6, padding: '0.5rem 0.75rem', color: 'var(--text)' }}
                  placeholder="Confirm new password" value={password.confirmPassword} onChange={e => setPassword(p => ({ ...p, confirmPassword: e.target.value }))} />
              </div>
              <button onClick={changePassword} disabled={savingPassword} style={{ background: '#17a2b8', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.5rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem' }}>
                <KeyRound size={15} /> {savingPassword ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
