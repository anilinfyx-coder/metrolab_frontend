'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { formatDate } from '../../../utils/dateFormat';
import { apiFetch } from '../../../../lib/api';

export default function SuperAdminProfilePage() {
  const [loading, setLoading] = useState(true);

  const [profileForm, setProfileForm] = useState({ name: '', email: '', mobile: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const profile = await apiFetch<{ name?: string; email?: string; mobile?: string }>('/api/SuperAdmin/getProfile', {
        method: 'POST',
        tokenKey: 'superadmin_token',
        body: JSON.stringify({}),
      });
      if (profile) {
        setProfileForm({ name: profile.name || '', email: profile.email || '', mobile: profile.mobile || '' });
      }
    } catch {
      /* error toasted by apiFetch */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProfile(); }, []);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileForm.name || !profileForm.email) {
      toast.error('Name and Email are required');
      return;
    }
    setProfileSaving(true);
    try {
      await apiFetch('/api/SuperAdmin/updateProfile', {
        method: 'POST',
        tokenKey: 'superadmin_token',
        body: JSON.stringify(profileForm),
        successMessage: 'Profile updated successfully!',
        errorFallback: 'Failed to update profile',
      });
    } catch {
      /* error toasted by apiFetch */
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }
    setPasswordSaving(true);
    try {
      await apiFetch('/api/SuperAdmin/changePassword', {
        method: 'POST',
        tokenKey: 'superadmin_token',
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
        successMessage: 'Password changed successfully!',
        errorFallback: 'Failed to change password',
      });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch {
      /* error toasted by apiFetch */
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
            {formatDate(new Date())}
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
