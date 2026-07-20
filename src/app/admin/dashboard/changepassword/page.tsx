'use client';
import { useState, FormEvent } from 'react';
import { MdHourglassEmpty, MdSave } from 'react-icons/md';
import TopNav from '../../../components/TopNav';
import { useRouter } from 'next/navigation';
import { apiFetch, toastApiError } from '../../../../lib/api';

export default function ChangePasswordPage() {
  const router = useRouter();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toastApiError('New passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      await apiFetch('/api/Auth/change-password', {
        method: 'POST',
        tokenKey: 'admin_token',
        acceptHttpOk: true,
        body: JSON.stringify({ oldPassword, newPassword }),
        successMessage: 'Password changed successfully.',
        errorFallback: 'Error changing password',
      });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      // Error toast handled by apiFetch
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-content">
      <TopNav title="Change Password" />
      <div style={{ padding: '1.5rem', maxWidth: 600, margin: '0 auto' }}>
        <div className="card">
          <div className="card-header"><span className="card-title">Update Your Password</span></div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 500, color: 'var(--text)', marginBottom: '0.35rem' }}>
                  Old Password <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="password"
                  placeholder="Enter old password"
                  value={oldPassword}
                  onChange={e => setOldPassword(e.target.value)}
                  required
                  style={{
                    width: '100%', padding: '0.6rem 0.9rem',
                    background: 'var(--bg-input)', border: '1px solid var(--border)',
                    borderRadius: 6, color: 'var(--text)', fontSize: '0.875rem',
                    fontFamily: 'inherit', outline: 'none',
                    transition: 'border-color 0.15s',
                  }}
                  onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 500, color: 'var(--text)', marginBottom: '0.35rem' }}>
                  New Password <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                  style={{
                    width: '100%', padding: '0.6rem 0.9rem',
                    background: 'var(--bg-input)', border: '1px solid var(--border)',
                    borderRadius: 6, color: 'var(--text)', fontSize: '0.875rem',
                    fontFamily: 'inherit', outline: 'none',
                    transition: 'border-color 0.15s',
                  }}
                  onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 500, color: 'var(--text)', marginBottom: '0.35rem' }}>
                  Confirm New Password <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  style={{
                    width: '100%', padding: '0.6rem 0.9rem',
                    background: 'var(--bg-input)', border: '1px solid var(--border)',
                    borderRadius: 6, color: 'var(--text)', fontSize: '0.875rem',
                    fontFamily: 'inherit', outline: 'none',
                    transition: 'border-color 0.15s',
                  }}
                  onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => router.push('/admin/dashboard')}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? <><MdHourglassEmpty size={16} aria-hidden /> Updating...</> : <><MdSave size={16} aria-hidden /> Change Password</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
