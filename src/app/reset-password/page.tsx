'use client';
import { useState, FormEvent, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const emailParam = searchParams.get('email');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token || !emailParam) {
      setError('Invalid or missing reset token.');
    }
  }, [token, emailParam]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!token || !emailParam) {
      setError('Invalid reset token.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const res = await fetch(`${API}/api/Auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailParam, token, newPassword: password }),
      });
      const data = await res.json();
      
      if (data.response_code === '200' || res.ok) {
        setSuccess(true);
      } else {
        setError(typeof data.obj === 'string' ? data.obj : data.message || 'Error resetting password');
      }
    } catch {
      setError('Unable to connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #f4f6f8 0%, #dde3ea 100%)',
      padding: '1rem',
    }}>
      <div style={{
        background: '#ffffff',
        border: '1px solid #e6e9ed',
        borderRadius: 12,
        padding: '2.5rem',
        width: '100%',
        maxWidth: 420,
        boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16,
            background: '#18BADD',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.75rem', margin: '0 auto 1rem', color: 'white', fontWeight: 'bold',
            boxShadow: `0 6px 20px rgba(24,186,221,0.4)`,
          }}>ML</div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#2c3e50', marginBottom: '0.3rem' }}>Reset Password</h1>
          <p style={{ fontSize: '0.85rem', color: '#7f8c9a' }}>Enter your new password below</p>
        </div>

        {success ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              background: 'rgba(46, 204, 113, 0.1)', border: '1px solid rgba(46, 204, 113, 0.3)',
              borderRadius: 6, padding: '1rem', marginBottom: '1.5rem',
              fontSize: '0.9rem', color: '#27ae60',
            }}>
              ✅ Your password has been successfully reset.
            </div>
            <button
              onClick={() => router.push('/')}
              style={{
                width: '100%', padding: '0.7rem',
                background: '#18BADD', color: 'white', border: 'none', borderRadius: 6,
                fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer',
                fontFamily: 'inherit', transition: 'background 0.15s',
              }}
            >
              Go to Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 500, color: '#2c3e50', marginBottom: '0.35rem' }}>
                New Password
              </label>
              <input
                type="password"
                placeholder="Enter new password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={{
                  width: '100%', padding: '0.6rem 0.9rem',
                  background: '#fff', border: '1px solid #e6e9ed',
                  borderRadius: 6, color: '#2c3e50', fontSize: '0.875rem',
                  fontFamily: 'inherit', outline: 'none',
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => e.target.style.borderColor = '#18BADD'}
                onBlur={e => e.target.style.borderColor = '#e6e9ed'}
              />
            </div>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 500, color: '#2c3e50', marginBottom: '0.35rem' }}>
                Confirm New Password
              </label>
              <input
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                style={{
                  width: '100%', padding: '0.6rem 0.9rem',
                  background: '#fff', border: '1px solid #e6e9ed',
                  borderRadius: 6, color: '#2c3e50', fontSize: '0.875rem',
                  fontFamily: 'inherit', outline: 'none',
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => e.target.style.borderColor = '#18BADD'}
                onBlur={e => e.target.style.borderColor = '#e6e9ed'}
              />
            </div>

            {error && (
              <div style={{
                background: 'rgba(231,76,60,0.08)', border: '1px solid rgba(231,76,60,0.2)',
                borderRadius: 6, padding: '0.65rem 0.9rem', marginBottom: '1rem',
                fontSize: '0.83rem', color: '#c0392b',
              }}>
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !token}
              style={{
                width: '100%', padding: '0.7rem',
                background: loading || !token ? '#a0d4e0' : '#18BADD',
                color: 'white', border: 'none', borderRadius: 6,
                fontSize: '0.9rem', fontWeight: 600, cursor: loading || !token ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit', transition: 'background 0.15s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              }}
              onMouseEnter={e => { if (!loading && token) (e.currentTarget as HTMLButtonElement).style.background = '#12a0be'; }}
              onMouseLeave={e => { if (!loading && token) (e.currentTarget as HTMLButtonElement).style.background = '#18BADD'; }}
            >
              {loading ? '⏳ Resetting...' : '🔐 Reset Password'}
            </button>
            
            <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
              <Link href="/" style={{ color: '#7f8c9a', textDecoration: 'none', fontSize: '0.85rem' }}>
                Back to Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
