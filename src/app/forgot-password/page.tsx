'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useForm, type SubmitErrorHandler } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { MdCheckCircle } from 'react-icons/md';
import { focusFirstInvalidField, formResolver } from '../../lib/formHelpers';
import { FieldError } from '../components/FormField';
import { apiFetch } from '../../lib/api';
import { forgotPasswordSchema, type ForgotPasswordFormValues } from '../../lib/schemas';
import styles from '../page.module.css';

export default function ForgotPasswordPage() {
  const [success, setSuccess] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordFormValues>({
    resolver: formResolver<ForgotPasswordFormValues>(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const mutation = useMutation({
    mutationFn: (values: ForgotPasswordFormValues) =>
      apiFetch('/api/Auth/forgot-password', {
        method: 'POST',
        skipAuth: true,
        acceptHttpOk: true,
        errorFallback: 'Error sending request',
        successMessage: 'Reset link sent. Please check your email.',
        body: JSON.stringify(values),
      }),
    onSuccess: () => setSuccess(true),
  });

  const handleInvalid: SubmitErrorHandler<ForgotPasswordFormValues> = formErrors => {
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
          <p className={styles.heading}>Forgot Password</p>
          <p className={styles.subtext}>
            Enter your email address and we&apos;ll send you a link to reset your password.
          </p>

          {success ? (
            <div>
              <div className={styles.successBox}>
                <MdCheckCircle size={16} style={{ verticalAlign: 'text-bottom', marginRight: '0.35rem' }} aria-hidden />
                Check your email for a link to reset your password. If it doesn&apos;t appear within a few minutes, check your spam folder.
              </div>
              <Link href="/" className={styles.backLink}>
                ← Back to Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit(values => mutation.mutate(values), handleInvalid)} noValidate>
              <div className={styles.field}>
                <div className={styles.labelRow}>
                  <label className={styles.label} htmlFor="fp-email">Email address</label>
                </div>
                <div className={styles.inputWrap}>
                  <input
                    id="fp-email"
                    type="email"
                    placeholder="Enter your email"
                    autoComplete="email"
                    data-field="email"
                    aria-invalid={!!errors.email}
                    className={styles.input}
                    {...register('email')}
                  />
                </div>
                <FieldError message={errors.email?.message} />
              </div>

              <button
                type="submit"
                disabled={mutation.isPending}
                className={styles.submit}
              >
                {mutation.isPending ? 'Sending…' : 'Send Reset Link'}
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
