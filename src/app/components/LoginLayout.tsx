'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm, type SubmitErrorHandler } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { focusFirstInvalidField, formResolver } from '../../lib/formHelpers';
import { FieldError } from '../components/FormField';
import PasswordInput from './PasswordInput';
import { apiFetch } from '../../lib/api';
import { loginSchema, type LoginFormValues } from '../../lib/schemas';
import { useAppDispatch } from '../../store/hooks';
import { setCredentials, type AuthUser } from '../../store/authSlice';
import { MdHourglassEmpty, MdVpnKey } from 'react-icons/md';

interface LoginPageProps {
  title: string;
  subtitle: string;
  icon: string;
  iconBg?: string;
  apiEndpoint: string;
  tokenKey: string;
  userKey: string;
  dashboardPath: string;
  usernameLabel?: string;
  usernamePlaceholder?: string;
  usernameType?: string;
}

export default function LoginLayout({
  title, subtitle, icon, iconBg = '#18BADD',
  apiEndpoint, tokenKey, userKey, dashboardPath,
  usernameLabel = 'Email Address',
  usernamePlaceholder = 'Enter email address',
  usernameType = 'email',
}: LoginPageProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({
    resolver: formResolver<LoginFormValues>(loginSchema),
    defaultValues: { username: '', password: '' },
  });

  const loginMutation = useMutation({
    mutationFn: (values: LoginFormValues) =>
      apiFetch<AuthUser>(apiEndpoint, {
        method: 'POST',
        skipAuth: true,
        errorFallback: 'Invalid credentials',
        successMessage: 'Signed in successfully.',
        body: JSON.stringify(values),
      }),
    onSuccess: user => {
      localStorage.setItem(tokenKey, user.token);
      localStorage.setItem(userKey, JSON.stringify(user));
      dispatch(setCredentials(user));
      router.push(dashboardPath);
    },
  });

  const handleInvalid: SubmitErrorHandler<LoginFormValues> = errors => {
    focusFirstInvalidField(errors);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(135deg,#f4f6f8_0%,#dde3ea_100%)] p-4">
      <div className="w-full max-w-[420px] rounded-xl border border-[#e6e9ed] bg-white p-10 shadow-[0_8px_32px_rgba(0,0,0,0.1)]">
        <div className="mb-8 text-center">
          <div
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-[1.75rem]"
            style={{ background: iconBg, boxShadow: `0 6px 20px ${iconBg}40` }}
          >
            {icon}
          </div>
          <h1 className="mb-[0.3rem] text-[1.35rem] font-bold text-[#2c3e50]">{title}</h1>
          <p className="text-[0.85rem] text-[#7f8c9a]">{subtitle}</p>
        </div>

        <form onSubmit={handleSubmit(values => loginMutation.mutate(values), handleInvalid)} noValidate>
          <div className="mb-[1.1rem]">
            <label className="mb-[0.35rem] block text-[0.82rem] font-medium text-[#2c3e50]">
              {usernameLabel}
            </label>
            <input
              type={usernameType}
              placeholder={usernamePlaceholder}
              autoComplete="username"
              data-field="username"
              aria-invalid={!!errors.username}
              className="w-full rounded-md border border-[#e6e9ed] bg-white px-[0.9rem] py-[0.6rem] text-[0.875rem] text-[#2c3e50] outline-none transition-colors focus:border-[#18BADD]"
              {...register('username')}
            />
            <FieldError message={errors.username?.message} />
          </div>

          <div className="mb-5">
            <label className="mb-[0.35rem] block text-[0.82rem] font-medium text-[#2c3e50]">
              Password
            </label>
            <PasswordInput
              placeholder="••••••••"
              autoComplete="current-password"
              data-field="password"
              aria-invalid={!!errors.password}
              className="w-full rounded-md border border-[#e6e9ed] bg-white px-[0.9rem] py-[0.6rem] text-[0.875rem] text-[#2c3e50] outline-none transition-colors focus:border-[#18BADD]"
              {...register('password')}
            />
            <FieldError message={errors.password?.message} />
          </div>

          <button
            type="submit"
            disabled={loginMutation.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-[#18BADD] p-[0.7rem] text-[0.9rem] font-semibold text-white transition-colors hover:bg-[#12a0be] disabled:cursor-not-allowed disabled:bg-[#a0d4e0]"
          >
            {loginMutation.isPending ? (
              <><MdHourglassEmpty size={16} aria-hidden /> Signing in...</>
            ) : (
              <><MdVpnKey size={16} aria-hidden /> Sign In</>
            )}
          </button>
        </form>

        <div className="mt-6 border-t border-[#e6e9ed] pt-5 text-center">
          <Link href="/" className="text-[0.8rem] text-[#7f8c9a] no-underline">
            ← Back to portal selection
          </Link>
        </div>

        <div className="mt-3 text-center">
          <span className="text-[0.72rem] text-[#aab4be]">Metrolab — Precision is our Home Mark</span>
        </div>
      </div>
    </div>
  );
}
