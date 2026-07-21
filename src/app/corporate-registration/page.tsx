'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { MdCheckCircle, MdHourglassEmpty } from 'react-icons/md';
import Link from 'next/link';
import { FormGroup } from '../components/FormField';
import { apiFetch, toastApiError } from '../../lib/api';
import { createInvalidHandler, fieldStyle, formResolver } from '../../lib/formHelpers';
import {
  corporateRegistrationSchema,
  type CorporateRegistrationFormValues,
} from '../../lib/schemas';

const emptyForm: CorporateRegistrationFormValues = {
  company_name: '',
  contact_person_name: '',
  mobile: '',
  email: '',
  address: '',
  country: '',
  state: '',
  city: '',
  pincode: '',
  otp: '',
};

const inputExtra = {
  padding: '0.6rem 0.9rem',
  background: '#fff',
  borderRadius: 6,
  color: '#2c3e50',
  fontSize: '0.875rem',
  fontFamily: 'inherit',
  outline: 'none',
  transition: 'border-color 0.15s',
} as const;

export default function CorporateRegistrationPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [otpGenerated, setOtpGenerated] = useState(false);

  const {
    register,
    handleSubmit,
    trigger,
    formState: { errors },
  } = useForm<CorporateRegistrationFormValues>({
    resolver: formResolver<CorporateRegistrationFormValues>(corporateRegistrationSchema),
    defaultValues: emptyForm,
  });

  const handleGenerateOTP = async () => {
    const ok = await trigger(['email', 'mobile']);
    if (!ok) return;

    setLoading(true);
    try {
      // In a real integration, call the actual OTP generation API
      // await apiFetch('/api/Auth/generate-otp', { skipAuth: true, method: 'POST', body: JSON.stringify({ email: form.email, mobile: form.mobile }) });

      // Simulating API Call
      await new Promise(r => setTimeout(r, 1000));
      setOtpGenerated(true);
    } catch {
      toastApiError('Unable to generate OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = handleSubmit(async values => {
    setLoading(true);

    try {
      await apiFetch('/api/CorporateClient/register', {
        method: 'POST',
        skipAuth: true,
        acceptHttpOk: true,
        body: JSON.stringify(values),
        successMessage: 'Registration submitted successfully.',
        errorFallback: 'Error registering account',
      });
      setSuccess(true);
    } catch {
      /* toast handled by apiFetch */
    } finally {
      setLoading(false);
    }
  }, createInvalidHandler<CorporateRegistrationFormValues>());

  const field = (
    name: keyof CorporateRegistrationFormValues,
    label: string,
    type = 'text',
    required = true,
  ) => (
    <FormGroup label={label} htmlFor={`reg-${name}`} required={required} error={errors[name]?.message}>
      <input
        id={`reg-${name}`}
        type={type}
        placeholder={`Enter ${label}`}
        data-field={name}
        aria-invalid={!!errors[name]}
        style={fieldStyle(!!errors[name], inputExtra)}
        {...register(name)}
      />
    </FormGroup>
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
              <MdCheckCircle size={16} style={{ verticalAlign: 'text-bottom', marginRight: '0.25rem' }} aria-hidden />
              Registration successful! Your account has been created.
            </div>
            <Link href="/" style={{ color: '#18BADD', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500 }}>
              ← Proceed to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleRegister} noValidate>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '0 1.5rem' }}>
              {field('company_name', 'Company Name')}
              {field('contact_person_name', 'Contact Person Name')}
              {field('mobile', 'Mobile Number', 'tel')}
              {field('email', 'Email Address', 'email')}
              {field('address', 'Address')}
              {field('country', 'Country')}
              {field('state', 'State')}
              {field('city', 'City')}
              {field('pincode', 'Pincode')}
            </div>

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
                  {loading ? <><MdHourglassEmpty size={16} aria-hidden /> Generating...</> : 'Generate OTP'}
                </button>
              ) : (
                <>
                  {field('otp', 'Enter OTP')}
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
                      {loading ? <><MdHourglassEmpty size={16} aria-hidden /> Registering...</> : 'Complete Registration'}
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
                </>
              )}
            </div>

            <div style={{ textAlign: 'center', marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid #e6e9ed' }}>
              <Link href="/" style={{ color: '#7f8c9a', textDecoration: 'none', fontSize: '0.85rem' }}>
                Already have an Account? Sign In Here
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
