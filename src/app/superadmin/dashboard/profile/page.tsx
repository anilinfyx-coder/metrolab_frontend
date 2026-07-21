'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { apiFetch } from '../../../../lib/api';
import PageLoader from '../../../components/PageLoader';
import TopNav from '../../../components/TopNav';
import { FormGroup } from '../../../components/FormField';
import PasswordInput from '../../../components/PasswordInput';
import { createInvalidHandler, fieldStyle, formResolver } from '../../../../lib/formHelpers';
import {
  PASSWORD_HELPER_TEXT,
  superAdminChangePasswordSchema,
  superAdminProfileSchema,
  type SuperAdminChangePasswordFormValues,
  type SuperAdminProfileFormValues,
} from '../../../../lib/schemas';

export default function SuperAdminProfilePage() {
  const [loading, setLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    reset: resetProfile,
    formState: { errors: profileErrors },
  } = useForm<SuperAdminProfileFormValues>({
    resolver: formResolver<SuperAdminProfileFormValues>(superAdminProfileSchema),
    defaultValues: { name: '', email: '', mobile: '' },
  });

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPassword,
    formState: { errors: passwordErrors },
  } = useForm<SuperAdminChangePasswordFormValues>({
    resolver: formResolver<SuperAdminChangePasswordFormValues>(superAdminChangePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const loadProfile = async () => {
    setLoading(true);
    try {
      const profile = await apiFetch<{ name?: string; email?: string; mobile?: string }>('/api/SuperAdmin/getProfile', {
        method: 'POST',
        tokenKey: 'superadmin_token',
        body: JSON.stringify({}),
      });
      if (profile) {
        resetProfile({ name: profile.name || '', email: profile.email || '', mobile: profile.mobile || '' });
      }
    } catch {
      /* error toasted by apiFetch */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProfile(); }, [resetProfile]);

  const saveProfile = handleProfileSubmit(async values => {
    setProfileSaving(true);
    try {
      await apiFetch('/api/SuperAdmin/updateProfile', {
        method: 'POST',
        tokenKey: 'superadmin_token',
        body: JSON.stringify(values),
        successMessage: 'Profile updated successfully.',
        errorFallback: 'Failed to update profile',
      });
    } catch {
      /* error toasted by apiFetch */
    } finally {
      setProfileSaving(false);
    }
  }, createInvalidHandler<SuperAdminProfileFormValues>());

  const savePassword = handlePasswordSubmit(async values => {
    setPasswordSaving(true);
    try {
      await apiFetch('/api/SuperAdmin/changePassword', {
        method: 'POST',
        tokenKey: 'superadmin_token',
        body: JSON.stringify({
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        }),
        successMessage: 'Password changed successfully.',
        errorFallback: 'Failed to change password',
      });
      resetPassword({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch {
      /* error toasted by apiFetch */
    } finally {
      setPasswordSaving(false);
    }
  }, createInvalidHandler<SuperAdminChangePasswordFormValues>());

  if (loading) {
    return (
      <div className="page-content" style={{ paddingTop: 0 }}>
        <TopNav title="Super Admin Profile" />
        <PageLoader message="Loading profile..." size="lg" />
      </div>
    );
  }

  return (
    <div className="page-content" style={{ paddingTop: 0 }}>
      <TopNav title="Super Admin Profile" />

      <div className="page-body">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>

          <div className="card">
            <div className="card-header">
              <span className="card-title">Profile</span>
            </div>
            <div className="card-body">
              <form onSubmit={saveProfile} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <FormGroup label="Name" htmlFor="sa-name" required error={profileErrors.name?.message}>
                  <input id="sa-name" type="text" placeholder="Enter Name" data-field="name" className="form-control" aria-invalid={!!profileErrors.name} style={fieldStyle(!!profileErrors.name)} {...registerProfile('name')} />
                </FormGroup>

                <FormGroup label="Email" htmlFor="sa-email" required error={profileErrors.email?.message}>
                  <input id="sa-email" type="email" placeholder="Enter Email" data-field="email" className="form-control" aria-invalid={!!profileErrors.email} style={fieldStyle(!!profileErrors.email)} {...registerProfile('email')} />
                </FormGroup>

                <FormGroup label="Mobile No." htmlFor="sa-mobile" error={profileErrors.mobile?.message}>
                  <input id="sa-mobile" type="text" inputMode="numeric" placeholder="Enter Mobile No." data-field="mobile" className="form-control" aria-invalid={!!profileErrors.mobile} style={fieldStyle(!!profileErrors.mobile)} {...registerProfile('mobile')} />
                </FormGroup>

                <div style={{ marginTop: '1rem' }}>
                  <button type="submit" disabled={profileSaving} className="btn btn-block btn-info btn-sm" style={{ width: '160px', cursor: 'pointer' }}>
                    {profileSaving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <span className="card-title">Change Password</span>
            </div>
            <div className="card-body">
              <form onSubmit={savePassword} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <FormGroup label="Old Password" htmlFor="sa-old-pwd" required error={passwordErrors.currentPassword?.message}>
                  <PasswordInput id="sa-old-pwd" placeholder="Password" data-field="currentPassword" className="form-control" aria-invalid={!!passwordErrors.currentPassword} style={fieldStyle(!!passwordErrors.currentPassword)} autoComplete="current-password" {...registerPassword('currentPassword')} />
                </FormGroup>

                <FormGroup label="New Password" htmlFor="sa-new-pwd" required error={passwordErrors.newPassword?.message}>
                  <PasswordInput id="sa-new-pwd" placeholder="Password" data-field="newPassword" className="form-control" aria-invalid={!!passwordErrors.newPassword} style={fieldStyle(!!passwordErrors.newPassword)} autoComplete="new-password" {...registerPassword('newPassword')} />
                  <label className="form-label" style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {PASSWORD_HELPER_TEXT}
                  </label>
                </FormGroup>

                <FormGroup label="Confirm Password" htmlFor="sa-confirm-pwd" required error={passwordErrors.confirmPassword?.message}>
                  <PasswordInput id="sa-confirm-pwd" placeholder="Password" data-field="confirmPassword" className="form-control" aria-invalid={!!passwordErrors.confirmPassword} style={fieldStyle(!!passwordErrors.confirmPassword)} autoComplete="new-password" {...registerPassword('confirmPassword')} />
                </FormGroup>

                <div style={{ marginTop: '1rem' }}>
                  <button type="submit" disabled={passwordSaving} className="btn btn-block btn-info btn-sm" style={{ width: '160px', cursor: 'pointer' }}>
                    {passwordSaving ? 'Updating...' : 'Change Password'}
                  </button>
                </div>
              </form>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
