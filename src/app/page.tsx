'use client';
import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function UnifiedLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Auto clear any old tokens if someone explicitly goes to login
  useEffect(() => {
    localStorage.removeItem('superadmin_token');
    localStorage.removeItem('admin_token');
    localStorage.removeItem('b2b_token');
    localStorage.removeItem('corporate_token');
  }, []);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const res = await fetch(`${API}/api/Auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      
      if (data.response_code === '200') {
        const user = data.obj;
        const portal = user.portal;
        
        // Save token and user based on portal
        if (portal === 'superadmin') {
          localStorage.setItem('superadmin_token', user.token);
          localStorage.setItem('superadmin_user', JSON.stringify(user));
          router.push('/superadmin/dashboard');
        } else if (portal === 'admin') {
          localStorage.setItem('admin_token', user.token);
          localStorage.setItem('admin_user', JSON.stringify(user));
          router.push('/admin/dashboard');
        } else if (portal === 'b2b') {
          localStorage.setItem('b2b_token', user.token);
          localStorage.setItem('b2b_user', JSON.stringify(user));
          router.push('/b2b/dashboard');
        } else if (portal === 'corporate') {
          localStorage.setItem('corporate_token', user.token);
          localStorage.setItem('corporate_user', JSON.stringify(user));
          router.push('/corporate/dashboard');
        } else {
          setError('Unknown portal role');
        }
      } else {
        setError(typeof data.obj === 'string' ? data.obj : 'Invalid credentials');
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
          <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#2c3e50', marginBottom: '0.3rem' }}>Metrolab Login</h1>
          <p style={{ fontSize: '0.85rem', color: '#7f8c9a' }}>Enter your email and password to continue</p>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '1.1rem' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 500, color: '#2c3e50', marginBottom: '0.35rem' }}>
              Email or Username
            </label>
            <input
              type="text"
              placeholder="Enter email or username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              autoComplete="username"
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
          
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 500, color: '#2c3e50', marginBottom: '0.35rem' }}>
              Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
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
            disabled={loading}
            style={{
              width: '100%', padding: '0.7rem',
              background: loading ? '#a0d4e0' : '#18BADD',
              color: 'white', border: 'none', borderRadius: 6,
              fontSize: '0.9rem', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', transition: 'background 0.15s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            }}
            onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = '#12a0be'; }}
            onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = '#18BADD'; }}
          >
            {loading ? '⏳ Signing in...' : '🔐 Sign In'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid #e6e9ed' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
            <Link href="/forgot-password" style={{ color: '#18BADD', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 500 }}>
              Forgot your password?
            </Link>
            <Link href="/corporate-registration" style={{ color: '#2c3e50', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 500 }}>
              Don't have a corporate account? <span style={{ color: '#18BADD' }}>Register here</span>
            </Link>
          </div>
          <span style={{ fontSize: '0.72rem', color: '#aab4be' }}>Metrolab — Precision is our Home Mark</span>
        </div>
      </div>
    </div>
  );
}
