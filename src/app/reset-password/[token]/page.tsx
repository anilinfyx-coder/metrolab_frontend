'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useForm, type SubmitErrorHandler } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { MdCheckCircle } from 'react-icons/md';
import { focusFirstInvalidField, formResolver } from '../../../lib/formHelpers';
import { FieldError } from '../../components/FormField';
import PasswordInput from '../../components/PasswordInput';
import { apiFetch } from '../../../lib/api';
import { resetPasswordSchema, type ResetPasswordFormValues, PASSWORD_HELPER_TEXT } from '../../../lib/schemas';
import styles from '../../page.module.css';

export default function ResetPasswordTokenPage() {
  const router = useRouter();
  const params = useParams();
  const token = useMemo(() => {
    const raw = params?.token;
    if (typeof raw === 'string') return raw.trim();
    if (Array.isArray(raw) && raw[0]) return String(raw[0]).trim();
    return '';
  }, [params]);

  const [success, setSuccess] = useState(false);
  const [tokenError, setTokenError] = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm<ResetPasswordFormValues>({
    resolver: formResolver<ResetPasswordFormValues>(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  useEffect(() => {
    if (!token) {
      setTokenError('Invalid or missing reset token.');
    } else {
      setTokenError('');
    }
  }, [token]);

  const mutation = useMutation({
    mutationFn: async (values: ResetPasswordFormValues) => {
      if (!token) {
        throw new Error('Invalid reset token.');
      }
      return apiFetch('/api/Auth/reset-password', {
        method: 'POST',
        skipAuth: true,
        acceptHttpOk: true,
        errorFallback: 'Error resetting password',
        successMessage: 'Your password has been successfully reset.',
        body: JSON.stringify({
          token,
          newPassword: values.password,
        }),
      });
    },
    onSuccess: () => setSuccess(true),
  });

  const handleInvalid: SubmitErrorHandler<ResetPasswordFormValues> = formErrors => {
    focusFirstInvalidField(formErrors);
  };

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <div className={styles.logoWrap}>
          <Image
            src="/login-logo.png"
            alt="Metro Lab"
            width={280}
            height={250}
            priority
            className={styles.logo}
          />
        </div>

        <p className={styles.tagline}>
          Precision is our Home Mark
        </p>

        <div className={styles.formWrap}>
          <p className={styles.heading}>Reset Password</p>
          <p className={styles.subtext}>
            Enter your new password below to complete the reset.
          </p>

          {success ? (
            <div>
              <div className={styles.successBox}>
                <MdCheckCircle size={16} style={{ verticalAlign: 'text-bottom', marginRight: '0.35rem' }} aria-hidden />
                Your password has been successfully reset.
              </div>
              <button
                type="button"
                onClick={() => router.push('/')}
                className={styles.submit}
              >
                Go to Login
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(values => mutation.mutate(values), handleInvalid)} noValidate>
              {tokenError && (
                <div
                  role="alert"
                  style={{
                    marginBottom: '0.85rem',
                    padding: '0.75rem 0.9rem',
                    border: '1px solid rgba(239,68,68,0.35)',
                    borderRadius: 4,
                    background: 'rgba(239,68,68,0.08)',
                    color: '#b91c1c',
                    fontSize: '0.82rem',
                  }}
                >
                  {tokenError}
                </div>
              )}

              <div className={styles.field}>
                <div className={styles.labelRow}>
                  <label className={styles.label} htmlFor="rp-password">New Password</label>
                </div>
                <PasswordInput
                  id="rp-password"
                  placeholder="Enter new password"
                  data-field="password"
                  aria-invalid={!!errors.password}
                  className={styles.input}
                  {...register('password')}
                />
                <FieldError message={errors.password?.message} />
                <p style={{ margin: '0.35rem 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                  {PASSWORD_HELPER_TEXT}
                </p>
              </div>

              <div className={styles.field}>
                <div className={styles.labelRow}>
                  <label className={styles.label} htmlFor="rp-confirm">Confirm New Password</label>
                </div>
                <PasswordInput
                  id="rp-confirm"
                  placeholder="Confirm new password"
                  data-field="confirmPassword"
                  aria-invalid={!!errors.confirmPassword}
                  className={styles.input}
                  {...register('confirmPassword')}
                />
                <FieldError message={errors.confirmPassword?.message} />
              </div>

              <button
                type="submit"
                disabled={mutation.isPending || !token}
                className={styles.submit}
              >
                {mutation.isPending ? 'Resetting…' : 'Reset Password'}
              </button>

              <Link href="/" className={styles.backLink}>
                ← Back to Login
              </Link>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
