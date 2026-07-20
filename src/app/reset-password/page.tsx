'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm, type SubmitErrorHandler } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { apiFetch } from '../../lib/api';
import { resetPasswordSchema, type ResetPasswordFormValues } from '../../lib/schemas';
import { MdCheckCircle, MdHourglassEmpty, MdVpnKey } from 'react-icons/md';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const emailParam = searchParams.get('email');
  const [success, setSuccess] = useState(false);

  const { register, handleSubmit } = useForm<ResetPasswordFormValues>({
    resolver: yupResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  useEffect(() => {
    if (!token || !emailParam) {
      toast.error('Invalid or missing reset token.');
    }
  }, [token, emailParam]);

  const mutation = useMutation({
    mutationFn: async (values: ResetPasswordFormValues) => {
      if (!token || !emailParam) {
        const message = 'Invalid reset token.';
        toast.error(message);
        throw new Error(message);
      }
      return apiFetch('/api/Auth/reset-password', {
        method: 'POST',
        skipAuth: true,
        acceptHttpOk: true,
        errorFallback: 'Error resetting password',
        successMessage: 'Your password has been successfully reset.',
        body: JSON.stringify({
          email: emailParam,
          token,
          newPassword: values.password,
        }),
      });
    },
    onSuccess: () => setSuccess(true),
  });

  const handleInvalid: SubmitErrorHandler<ResetPasswordFormValues> = errors => {
    const firstError = Object.values(errors)[0];
    if (firstError?.message) toast.error(firstError.message);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(135deg,#f4f6f8_0%,#dde3ea_100%)] p-4">
      <div className="w-full max-w-[420px] rounded-xl border border-[#e6e9ed] bg-white p-10 shadow-[0_8px_32px_rgba(0,0,0,0.1)]">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#18BADD] text-[1.75rem] font-bold text-white shadow-[0_6px_20px_rgba(24,186,221,0.4)]">
            ML
          </div>
          <h1 className="mb-[0.3rem] text-[1.35rem] font-bold text-[#2c3e50]">Reset Password</h1>
          <p className="text-[0.85rem] text-[#7f8c9a]">Enter your new password below</p>
        </div>

        {success ? (
          <div className="text-center">
            <div className="mb-6 rounded-md border border-[rgba(46,204,113,0.3)] bg-[rgba(46,204,113,0.1)] p-4 text-[0.9rem] text-[#27ae60]">
              <MdCheckCircle size={16} style={{ verticalAlign: 'text-bottom', marginRight: '0.25rem' }} aria-hidden />
              Your password has been successfully reset.
            </div>
            <button
              type="button"
              onClick={() => router.push('/')}
              className="w-full cursor-pointer rounded-md bg-[#18BADD] p-[0.7rem] text-[0.9rem] font-semibold text-white transition-colors hover:bg-[#12a0be]"
            >
              Go to Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(values => mutation.mutate(values), handleInvalid)} noValidate>
            <div className="mb-5">
              <label className="mb-[0.35rem] block text-[0.82rem] font-medium text-[#2c3e50]">
                New Password
              </label>
              <input
                type="password"
                placeholder="Enter new password"
                className="w-full rounded-md border border-[#e6e9ed] bg-white px-[0.9rem] py-[0.6rem] text-[0.875rem] text-[#2c3e50] outline-none transition-colors focus:border-[#18BADD]"
                {...register('password')}
              />
            </div>

            <div className="mb-6">
              <label className="mb-[0.35rem] block text-[0.82rem] font-medium text-[#2c3e50]">
                Confirm New Password
              </label>
              <input
                type="password"
                placeholder="Confirm new password"
                className="w-full rounded-md border border-[#e6e9ed] bg-white px-[0.9rem] py-[0.6rem] text-[0.875rem] text-[#2c3e50] outline-none transition-colors focus:border-[#18BADD]"
                {...register('confirmPassword')}
              />
            </div>

            <button
              type="submit"
              disabled={mutation.isPending || !token}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-[#18BADD] p-[0.7rem] text-[0.9rem] font-semibold text-white transition-colors hover:bg-[#12a0be] disabled:cursor-not-allowed disabled:bg-[#a0d4e0]"
            >
              {mutation.isPending ? (
                <><MdHourglassEmpty size={16} aria-hidden /> Resetting...</>
              ) : (
                <><MdVpnKey size={16} aria-hidden /> Reset Password</>
              )}
            </button>

            <div className="mt-5 text-center">
              <Link href="/" className="text-[0.85rem] text-[#7f8c9a] no-underline">
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
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
