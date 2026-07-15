'use client';

import { useState, useEffect } from 'react';
import { Mail, Phone, User, Lock, Save, KeyRound, AlertCircle, CheckCircle2 } from 'lucide-react';

const API = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, '');
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('superadmin_token') || '' : ''; }

export default function SuperAdminProfilePage() {
  const [loading, setLoading] = useState(true);

  const [profileForm, setProfileForm] = useState({ name: '', email: '', mobile: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string; section: 'profile' | 'password' } | null>(null);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/SuperAdmin/getProfile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', token: getToken() },
        body: JSON.stringify({}) // Backend uses req.user.id
      });
      const d = await res.json();
      if (d.response_code === '200' && d.obj) {
        setProfileForm({ name: d.obj.name || '', email: d.obj.email || '', mobile: d.obj.mobile || '' });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProfile(); }, []);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileForm.name || !profileForm.email) {
      setMsg({ type: 'error', text: 'Name and Email are required', section: 'profile' }); return;
    }
    setProfileSaving(true); setMsg(null);
    try {
      const res = await fetch(`${API}/api/SuperAdmin/updateProfile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', token: getToken() },
        body: JSON.stringify(profileForm)
      });
      const d = await res.json();
      if (d.response_code === '200') {
        setMsg({ type: 'success', text: 'Profile updated successfully!', section: 'profile' });
      } else {
        setMsg({ type: 'error', text: d.obj || 'Failed to update profile', section: 'profile' });
      }
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message, section: 'profile' });
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMsg({ type: 'error', text: 'New passwords do not match', section: 'password' }); return;
    }
    if (passwordForm.newPassword.length < 6) {
      setMsg({ type: 'error', text: 'Password must be at least 6 characters long', section: 'password' }); return;
    }
    setPasswordSaving(true); setMsg(null);
    try {
      const res = await fetch(`${API}/api/SuperAdmin/changePassword`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', token: getToken() },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      });
      const d = await res.json();
      if (d.response_code === '200') {
        setMsg({ type: 'success', text: 'Password changed successfully!', section: 'password' });
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        setMsg({ type: 'error', text: d.obj || 'Failed to change password', section: 'password' });
      }
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message, section: 'password' });
    } finally {
      setPasswordSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <>
      <div className="topnav">
        <h1 className="topnav-title">Super Admin Profile</h1>
        <div className="topnav-actions">
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
          <div className="avatar">A</div>
        </div>
      </div>

      <div className="page-content">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>

          {/* Personal Details Form */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Profile</span>
            </div>
            <div className="card-body">
              <form onSubmit={handleProfileSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {msg && msg.section === 'profile' && (
                  <div className={`badge ${msg.type === 'error' ? 'badge-danger' : 'badge-success'}`} style={{ padding: '10px', display: 'block', marginBottom: '10px' }}>
                    {msg.text}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Name</label>
                  <input
                    type="text"
                    required
                    value={profileForm.name}
                    onChange={e => setProfileForm({ ...profileForm, name: e.target.value })}
                    className="form-control"
                    placeholder="Enter Name"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    required
                    value={profileForm.email}
                    onChange={e => setProfileForm({ ...profileForm, email: e.target.value })}
                    className="form-control"
                    placeholder="Enter Email"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Mobile No.</label>
                  <input
                    type="text"
                    value={profileForm.mobile}
                    onChange={e => setProfileForm({ ...profileForm, mobile: e.target.value })}
                    className="form-control"
                    placeholder="Enter Mobile No."
                  />
                </div>

                <div style={{ marginTop: '1rem' }}>
                  <button type="submit" disabled={profileSaving} className="btn btn-block btn-info btn-sm" style={{ width: '160px', cursor: 'pointer' }}>
                    {profileSaving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Change Password Form */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Change Password</span>
            </div>
            <div className="card-body">
              <form onSubmit={handlePasswordSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {msg && msg.section === 'password' && (
                  <div className={`badge ${msg.type === 'error' ? 'badge-danger' : 'badge-success'}`} style={{ padding: '10px', display: 'block', marginBottom: '10px' }}>
                    {msg.text}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Old Password</label>
                  <input
                    type="password"
                    required
                    value={passwordForm.currentPassword}
                    onChange={e => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    className="form-control"
                    placeholder="Password"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <input
                    type="password"
                    required
                    value={passwordForm.newPassword}
                    onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    className="form-control"
                    placeholder="Password"
                  />
                  <label className="form-label" style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    (Enter atleast 6 characters. Only @,# are allowed as special character)
                  </label>
                </div>

                <div className="form-group">
                  <label className="form-label">Confirm Password</label>
                  <input
                    type="password"
                    required
                    value={passwordForm.confirmPassword}
                    onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    className="form-control"
                    placeholder="Password"
                  />
                </div>

                <div style={{ marginTop: '1rem' }}>
                  <button type="submit" disabled={passwordSaving} className="btn btn-block btn-info btn-sm" style={{ width: '160px', cursor: 'pointer' }}>
                    {passwordSaving ? 'Updating...' : 'Change Password'}
                  </button>
                </div>
              </form>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
