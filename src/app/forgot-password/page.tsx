'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm, type SubmitErrorHandler } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { apiFetch } from '../../lib/api';
import { forgotPasswordSchema, type ForgotPasswordFormValues } from '../../lib/schemas';
import { MdCheckCircle, MdEmail, MdHourglassEmpty } from 'react-icons/md';

export default function ForgotPasswordPage() {
  const [success, setSuccess] = useState(false);
  const { register, handleSubmit } = useForm<ForgotPasswordFormValues>({
    resolver: yupResolver(forgotPasswordSchema),
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

  const handleInvalid: SubmitErrorHandler<ForgotPasswordFormValues> = errors => {
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
          <h1 className="mb-[0.3rem] text-[1.35rem] font-bold text-[#2c3e50]">Forgot Password</h1>
          <p className="text-[0.85rem] text-[#7f8c9a]">Enter your email to receive a reset link</p>
        </div>

        {success ? (
          <div className="text-center">
            <div className="mb-6 rounded-md border border-[rgba(46,204,113,0.3)] bg-[rgba(46,204,113,0.1)] p-4 text-[0.9rem] text-[#27ae60]">
              <MdCheckCircle size={16} style={{ verticalAlign: 'text-bottom', marginRight: '0.25rem' }} aria-hidden />
              Check your email for a link to reset your password. If it doesn&apos;t appear within a few minutes, check your spam folder.
            </div>
            <Link href="/" className="text-[0.9rem] font-medium text-[#18BADD] no-underline">
              ← Back to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit(values => mutation.mutate(values), handleInvalid)} noValidate>
            <div className="mb-5">
              <label className="mb-[0.35rem] block text-[0.82rem] font-medium text-[#2c3e50]">
                Email Address
              </label>
              <input
                type="email"
                placeholder="Enter your email"
                autoComplete="email"
                className="w-full rounded-md border border-[#e6e9ed] bg-white px-[0.9rem] py-[0.6rem] text-[0.875rem] text-[#2c3e50] outline-none transition-colors focus:border-[#18BADD]"
                {...register('email')}
              />
            </div>

            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-[#18BADD] p-[0.7rem] text-[0.9rem] font-semibold text-white transition-colors hover:bg-[#12a0be] disabled:cursor-not-allowed disabled:bg-[#a0d4e0]"
            >
              {mutation.isPending ? (
                <><MdHourglassEmpty size={16} aria-hidden /> Sending...</>
              ) : (
                <><MdEmail size={16} aria-hidden /> Send Reset Link</>
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
