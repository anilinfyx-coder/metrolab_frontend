'use client';
import { useState, FormEvent } from 'react';
import TopNav from '../../../components/TopNav';
import { useRouter } from 'next/navigation';

export default function ChangePasswordPage() {
  const router = useRouter();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    
    setLoading(true);
    setMsg(null);
    
    try {
      const token = localStorage.getItem('admin_token');
      const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      const res = await fetch(`${API}/api/Auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'token': token || '' },
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      const data = await res.json();
      
      if (data.response_code === '200' || res.ok) {
        setMsg({ type: 'success', text: 'Password changed successfully.' });
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setMsg({ type: 'error', text: typeof data.obj === 'string' ? data.obj : data.message || 'Error changing password' });
      }
    } catch {
      setMsg({ type: 'error', text: 'Unable to connect to server. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-content">
      <TopNav title="Change Password" />
      <div style={{ padding: '1.5rem', maxWidth: 600, margin: '0 auto' }}>
        {msg && (
          <div style={{
            background: msg.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${msg.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
            borderRadius: 8, padding: '1rem', marginBottom: '1.5rem',
            fontSize: '0.9rem', color: msg.type === 'success' ? '#10b981' : '#ef4444'
          }}>
            {msg.text}
          </div>
        )}
        
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
                  {loading ? '⏳ Updating...' : '💾 Change Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
