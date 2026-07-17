'use client';
import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function UnifiedLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
        setError(typeof data.obj === 'string' ? data.obj : 'Invalid credentials. Please try again.');
      }
    } catch {
      setError('Unable to connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Open+Sans:ital,wght@0,400;0,600;0,700;1,400&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; }

        .ml-page {
          min-height: 100vh;
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          /* Dark teal at top → light cyan at bottom — exact match to screenshot */
          background: linear-gradient(
            to bottom,
            #0f7799 0%,
            #1a9bbf 18%,
            #32b8d8 38%,
            #68cde6 58%,
            #a8def2 76%,
            #c5ecf8 90%,
            #d5f2fb 100%
          );
          font-family: 'Open Sans', Arial, sans-serif;
        }

        /* Narrow center column — matches the ~280px wide form in screenshot */
        .ml-col {
          width: 100%;
          max-width: 300px;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 0 0 2rem 0;
        }

        /* ─── Logo: show the full logo image via mix-blend-mode so
               the white background disappears on the blue gradient ─── */
        .ml-logo-wrap {
          /* multiply blend removes the white bg so only the globe+text shows */
          mix-blend-mode: multiply;
          width: 220px;
          margin-bottom: 0px;
          line-height: 0;
        }

        /* ── Tagline ── */
        .ml-tagline {
          font-size: 0.9rem;
          font-style: italic;
          color: #1a5a72;
          text-align: center;
          margin-top: 6px;
          margin-bottom: 1.4rem;
          letter-spacing: 0.2px;
        }

        /* ── Form ── */
        .ml-form-wrap { width: 100%; }

        .ml-form-heading {
          font-size: 0.82rem;
          font-weight: 700;
          color: #0c3344;
          margin-bottom: 0.85rem;
        }

        .ml-field { width: 100%; margin-bottom: 0.65rem; }

        .ml-label-row {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 0.22rem;
        }

        .ml-label {
          font-size: 0.74rem;
          font-weight: 600;
          color: #0c3344;
        }

        .ml-forgot {
          font-size: 0.68rem;
          color: #3d7fc4;
          text-decoration: none;
          font-weight: 400;
        }
        .ml-forgot:hover { text-decoration: underline; }

        .ml-input-wrap { position: relative; width: 100%; }

        /* White inputs with very subtle border — exactly as screenshot */
        .ml-input {
          width: 100%;
          padding: 0.48rem 0.7rem;
          background: #ffffff;
          border: 1px solid #c5dce8;
          border-radius: 3px;
          font-size: 0.82rem;
          color: #0c3344;
          font-family: inherit;
          outline: none;
          transition: border-color 0.15s;
        }
        .ml-input:focus { border-color: #2ba4cc; }
        .ml-input::placeholder { color: #aac8d8; }
        .ml-input-pw { padding-right: 2.1rem; }

        /* Eye icon */
        .ml-eye {
          position: absolute;
          right: 0.45rem;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          padding: 0;
          cursor: pointer;
          color: #7aafc4;
          display: flex;
          align-items: center;
          line-height: 1;
        }
        .ml-eye:hover { color: #1a6e99; }

        /* Error */
        .ml-error {
          width: 100%;
          background: rgba(160,20,20,0.08);
          border: 1px solid rgba(160,20,20,0.2);
          border-radius: 3px;
          padding: 0.42rem 0.7rem;
          margin-bottom: 0.65rem;
          font-size: 0.74rem;
          color: #8b1a1a;
        }

        /* Sign in button — dark indigo, full width, matches screenshot exactly */
        .ml-btn {
          width: 100%;
          padding: 0.6rem;
          background: #1e1a70;
          color: #ffffff;
          border: none;
          border-radius: 4px;
          font-size: 0.875rem;
          font-weight: 600;
          letter-spacing: 0.5px;
          cursor: pointer;
          font-family: inherit;
          margin-top: 0.5rem;
          transition: background 0.15s;
        }
        .ml-btn:hover:not(:disabled) { background: #2c28a0; }
        .ml-btn:disabled { opacity: 0.7; cursor: not-allowed; }
      `}</style>

      <div className="ml-page">
        <div className="ml-col">

          {/* ── Metro Lab logo ──
              mix-blend-mode: multiply removes the white background
              so the globe + METRO LAB text shows cleanly on the gradient ── */}
          <div className="ml-logo-wrap">
            <Image
              src="/logo.png"
              alt="Metro Lab"
              width={220}
              height={155}
              priority
              style={{ width: '220px', height: 'auto', display: 'block' }}
            />
          </div>

          {/* ── Tagline ── */}
          <p className="ml-tagline">Precision is our Home Mark</p>

          {/* ── Login form ── */}
          <div className="ml-form-wrap">
            <p className="ml-form-heading">Login to your Metro Lab Account</p>

            <form onSubmit={handleLogin} autoComplete="on" noValidate>

              {/* Email */}
              <div className="ml-field">
                <div className="ml-label-row">
                  <label className="ml-label" htmlFor="ml-email">Email address</label>
                </div>
                <div className="ml-input-wrap">
                  <input
                    id="ml-email"
                    className="ml-input"
                    type="text"
                    placeholder="corporate@gmail.com"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    required
                    autoComplete="username"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="ml-field">
                <div className="ml-label-row">
                  <label className="ml-label" htmlFor="ml-password">Password</label>
                  <a href="/forgot-password" className="ml-forgot" tabIndex={-1}>Forgot password</a>
                </div>
                <div className="ml-input-wrap">
                  <input
                    id="ml-password"
                    className="ml-input ml-input-pw"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="ml-eye"
                    onClick={() => setShowPassword(v => !v)}
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20C5 20 1 12 1 12a18.45 18.45 0 0 1 5.06-5.94"/>
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {error && <div className="ml-error">⚠ {error}</div>}

              <button
                id="ml-signin-btn"
                type="submit"
                className="ml-btn"
                disabled={loading}
              >
                {loading ? 'Signing in…' : 'Sign in'}
              </button>

            </form>
          </div>
        </div>
      </div>
    </>
  );
}
