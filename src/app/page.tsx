'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useForm, type SubmitErrorHandler } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { focusFirstInvalidField, formResolver } from '../lib/formHelpers';
import { FieldError } from './components/FormField';
import PasswordInput from './components/PasswordInput';
import { apiFetch } from '../lib/api';
import { loginSchema, type LoginFormValues } from '../lib/schemas';
import { useAppDispatch } from '../store/hooks';
import { clearCredentials, setCredentials, type AuthUser, type Portal } from '../store/authSlice';
import styles from './page.module.css';

const portalConfig: Record<Portal, { tokenKey: string; userKey: string; path: string }> = {
  superadmin: { tokenKey: 'superadmin_token', userKey: 'superadmin_user', path: '/superadmin/dashboard' },
  admin: { tokenKey: 'admin_token', userKey: 'admin_user', path: '/admin/dashboard' },
  b2b: { tokenKey: 'b2b_token', userKey: 'b2b_user', path: '/b2b/dashboard' },
  corporate: { tokenKey: 'corporate_token', userKey: 'corporate_user', path: '/corporate/dashboard' },
};

export default function UnifiedLoginPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({
    resolver: formResolver<LoginFormValues>(loginSchema),
    defaultValues: { username: '', password: '' },
  });

  useEffect(() => {
    localStorage.removeItem('superadmin_token');
    localStorage.removeItem('admin_token');
    localStorage.removeItem('b2b_token');
    localStorage.removeItem('corporate_token');
    dispatch(clearCredentials());
  }, [dispatch]);

  const loginMutation = useMutation({
    mutationFn: (values: LoginFormValues) =>
      apiFetch<AuthUser>('/api/Auth/login', {
        method: 'POST',
        skipAuth: true,
        errorFallback: 'Invalid credentials. Please try again.',
        successMessage: 'Signed in successfully.',
        body: JSON.stringify(values),
      }),
    onSuccess: user => {
      if (!user.portal) return;
      const config = portalConfig[user.portal];
      if (!config) return;

      localStorage.setItem(config.tokenKey, user.token);
      localStorage.setItem(config.userKey, JSON.stringify(user));
      dispatch(setCredentials(user));
      router.push(config.path);
    },
  });

  const handleInvalid: SubmitErrorHandler<LoginFormValues> = errors => {
    focusFirstInvalidField(errors);
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
          <p className={styles.heading}>
            Login to your Account
          </p>

          <form onSubmit={handleSubmit(values => loginMutation.mutate(values), handleInvalid)} autoComplete="on" noValidate>
            <div className={styles.field}>
              <div className={styles.labelRow}>
                <label className={styles.label} htmlFor="ml-email">Email address</label>
              </div>
              <div className={styles.inputWrap}>
                <input
                  id="ml-email"
                  type="text"
                  placeholder="superadmin@gmail.com"
                  autoComplete="username"
                  data-field="username"
                  aria-invalid={!!errors.username}
                  className={styles.input}
                  {...register('username')}
                />
              </div>
              <FieldError message={errors.username?.message} />
            </div>

            <div className={styles.field}>
              <div className={styles.labelRow}>
                <label className={styles.label} htmlFor="ml-password">Password</label>
                <a href="/forgot-password" className={styles.forgot} tabIndex={-1}>
                  Forgot password
                </a>
              </div>
              <PasswordInput
                id="ml-password"
                placeholder="••••••"
                autoComplete="current-password"
                data-field="password"
                aria-invalid={!!errors.password}
                className={styles.input}
                {...register('password')}
              />
              <FieldError message={errors.password?.message} />
            </div>

            <button
              id="ml-signin-btn"
              type="submit"
              disabled={loginMutation.isPending}
              className={styles.submit}
            >
              {loginMutation.isPending ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
