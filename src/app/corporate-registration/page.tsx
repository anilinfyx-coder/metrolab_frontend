'use client';
import { useState, FormEvent } from 'react';
import Link from 'next/link';

export default function CorporateRegistrationPage() {
  const [form, setForm] = useState({
    company_name: '',
    contact_person_name: '',
    mobile: '',
    email: '',
    address: '',
    country: '',
    state: '',
    city: '',
    pincode: '',
    otp: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [otpGenerated, setOtpGenerated] = useState(false);

  const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  const handleGenerateOTP = async () => {
    if (!form.email || !form.mobile) {
      setError('Please provide email and mobile to generate OTP.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      // In a real integration, call the actual OTP generation API
      // const res = await fetch(`${API}/api/Auth/generate-otp`, { method: 'POST', body: JSON.stringify({ email: form.email, mobile: form.mobile }) });
      
      // Simulating API Call
      await new Promise(r => setTimeout(r, 1000));
      setOtpGenerated(true);
    } catch {
      setError('Unable to generate OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.otp) {
      setError('Please enter the OTP.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch(`${API}/api/CorporateClient/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      
      if (data.response_code === '200' || res.ok) {
        setSuccess(true);
      } else {
        setError(typeof data.obj === 'string' ? data.obj : data.message || 'Error registering account');
      }
    } catch {
      setError('Unable to connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inp = (key: keyof typeof form, label: string, type = 'text', required = true) => (
    <div style={{ marginBottom: '1.25rem' }}>
      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 500, color: '#2c3e50', marginBottom: '0.35rem' }}>
        {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
      </label>
      <input
        type={type}
        placeholder={`Enter ${label}`}
        value={form[key]}
        onChange={e => setForm({ ...form, [key]: e.target.value })}
        required={required}
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
  );

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #f4f6f8 0%, #dde3ea 100%)',
      padding: '2rem 1rem',
    }}>
      <div style={{
        background: '#ffffff',
        border: '1px solid #e6e9ed',
        borderRadius: 12,
        padding: '2.5rem',
        width: '100%',
        maxWidth: 700,
        boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16,
            background: '#18BADD',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.75rem', margin: '0 auto 1rem', color: 'white', fontWeight: 'bold',
            boxShadow: `0 6px 20px rgba(24,186,221,0.4)`,
          }}>ML</div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#2c3e50', marginBottom: '0.3rem' }}>Corporate Registration</h1>
          <p style={{ fontSize: '0.85rem', color: '#7f8c9a' }}>Register your corporate account</p>
        </div>

        {success ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <div style={{
              background: 'rgba(46, 204, 113, 0.1)', border: '1px solid rgba(46, 204, 113, 0.3)',
              borderRadius: 6, padding: '1rem', marginBottom: '1.5rem',
              fontSize: '0.9rem', color: '#27ae60',
            }}>
              ✅ Registration successful! Your account has been created.
            </div>
            <Link href="/" style={{ color: '#18BADD', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500 }}>
              ← Proceed to Login
            </Link>
          </div>
        ) : (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '0 1.5rem' }}>
              {inp('company_name', 'Company Name')}
              {inp('contact_person_name', 'Contact Person Name')}
              {inp('mobile', 'Mobile Number', 'tel')}
              {inp('email', 'Email Address', 'email')}
              {inp('address', 'Address')}
              {inp('country', 'Country')}
              {inp('state', 'State')}
              {inp('city', 'City')}
              {inp('pincode', 'Pincode')}
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

            <div style={{ marginTop: '1rem' }}>
              {!otpGenerated ? (
                <button
                  type="button"
                  onClick={handleGenerateOTP}
                  disabled={loading}
                  style={{
                    width: '100%', padding: '0.8rem',
                    background: loading ? '#a0d4e0' : '#21145f',
                    color: 'white', border: 'none', borderRadius: 6,
                    fontSize: '0.9rem', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit', transition: 'background 0.15s',
                  }}
                >
                  {loading ? '⏳ Generating...' : 'Generate OTP'}
                </button>
              ) : (
                <form onSubmit={handleRegister}>
                  {inp('otp', 'Enter OTP')}
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                      type="submit"
                      disabled={loading}
                      style={{
                        flex: 1, padding: '0.8rem',
                        background: loading ? '#a0d4e0' : '#18BADD',
                        color: 'white', border: 'none', borderRadius: 6,
                        fontSize: '0.9rem', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                        fontFamily: 'inherit', transition: 'background 0.15s',
                      }}
                    >
                      {loading ? '⏳ Registering...' : 'Complete Registration'}
                    </button>
                    <button
                      type="button"
                      onClick={handleGenerateOTP}
                      style={{
                        padding: '0.8rem',
                        background: 'transparent',
                        color: '#2c3e50', border: '1px solid #e6e9ed', borderRadius: 6,
                        fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      Resend OTP
                    </button>
                  </div>
                </form>
              )}
            </div>

            <div style={{ textAlign: 'center', marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid #e6e9ed' }}>
              <Link href="/" style={{ color: '#7f8c9a', textDecoration: 'none', fontSize: '0.85rem' }}>
                Already have an Account? Sign In Here
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
