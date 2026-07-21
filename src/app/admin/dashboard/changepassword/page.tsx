'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { MdHourglassEmpty, MdSave } from 'react-icons/md';
import TopNav from '../../../components/TopNav';
import { FormGroup } from '../../../components/FormField';
import PasswordInput from '../../../components/PasswordInput';
import { useRouter } from 'next/navigation';
import { apiFetch } from '../../../../lib/api';
import { createInvalidHandler, fieldStyle, formResolver } from '../../../../lib/formHelpers';
import {
  changePasswordFormSchema,
  PASSWORD_HELPER_TEXT,
  type ChangePasswordFormValues,
} from '../../../../lib/schemas';

const emptyForm: ChangePasswordFormValues = {
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
};

export default function ChangePasswordPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordFormValues>({
    resolver: formResolver<ChangePasswordFormValues>(changePasswordFormSchema),
    defaultValues: emptyForm,
  });

  const onSubmit = handleSubmit(async values => {
    setLoading(true);
    try {
      await apiFetch('/api/Auth/change-password', {
        method: 'POST',
        tokenKey: 'admin_token',
        acceptHttpOk: true,
        body: JSON.stringify({
          oldPassword: values.oldPassword,
          newPassword: values.newPassword,
        }),
        successMessage: 'Password changed successfully.',
        errorFallback: 'Error changing password',
      });
      reset(emptyForm);
    } catch {
      /* error toasted by apiFetch */
    } finally {
      setLoading(false);
    }
  }, createInvalidHandler<ChangePasswordFormValues>());

  return (
    <div className="page-content">
      <TopNav title="Change Password" />
      <div className="page-body page-body-narrow">
        <div className="card">
          <div className="card-header"><span className="card-title">Update Your Password</span></div>
          <div className="card-body">
            <form onSubmit={onSubmit} noValidate>
              <FormGroup label="Old Password" htmlFor="old-password" required error={errors.oldPassword?.message}>
                <PasswordInput
                  id="old-password"
                  placeholder="Enter old password"
                  data-field="oldPassword"
                  aria-invalid={!!errors.oldPassword}
                  style={fieldStyle(!!errors.oldPassword, { padding: '0.6rem 0.9rem', fontSize: '0.875rem' })}
                  {...register('oldPassword')}
                />
              </FormGroup>

              <FormGroup label="New Password" htmlFor="new-password" required error={errors.newPassword?.message}>
                <PasswordInput
                  id="new-password"
                  placeholder="Enter new password"
                  data-field="newPassword"
                  aria-invalid={!!errors.newPassword}
                  style={fieldStyle(!!errors.newPassword, { padding: '0.6rem 0.9rem', fontSize: '0.875rem' })}
                  {...register('newPassword')}
                />
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                  {PASSWORD_HELPER_TEXT}
                </div>
              </FormGroup>

              <FormGroup
                label="Confirm New Password"
                htmlFor="confirm-password"
                required
                error={errors.confirmPassword?.message}
              >
                <PasswordInput
                  id="confirm-password"
                  placeholder="Confirm new password"
                  data-field="confirmPassword"
                  aria-invalid={!!errors.confirmPassword}
                  style={fieldStyle(!!errors.confirmPassword, { padding: '0.6rem 0.9rem', fontSize: '0.875rem' })}
                  {...register('confirmPassword')}
                />
              </FormGroup>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => router.push('/admin/dashboard')}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? <><MdHourglassEmpty size={16} aria-hidden /> Updating...</> : <><MdSave size={16} aria-hidden /> Change Password</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
