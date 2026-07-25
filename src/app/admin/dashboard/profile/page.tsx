'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import TopNav from '../../../components/TopNav';
import PageLoader from '../../../components/PageLoader';
import { FormGroup } from '../../../components/FormField';
import PasswordInput from '../../../components/PasswordInput';
import { getStoredUser } from '../../../components/portalConfig';
import { apiFetch } from '../../../../lib/api';
import { createInvalidHandler, fieldStyle, formResolver, registerMobile } from '../../../../lib/formHelpers';
import {
  PASSWORD_HELPER_TEXT,
  changePasswordFormSchema,
  profileSchemaForPortal,
  type ChangePasswordFormValues,
  type ProfilePortalFormValues,
} from '../../../../lib/schemas';

const emptyPassword: ChangePasswordFormValues = {
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
};

export default function AdminProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    reset: resetProfile,
    formState: { errors: profileErrors },
  } = useForm<ProfilePortalFormValues>({
    resolver: formResolver<ProfilePortalFormValues>(profileSchemaForPortal(false)),
    defaultValues: {
      id: 0,
      name: '',
      email: '',
      mobile: '',
      password: '',
      contact_person_name: '',
      company_name: '',
    },
  });

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPassword,
    formState: { errors: passwordErrors },
  } = useForm<ChangePasswordFormValues>({
    resolver: formResolver<ChangePasswordFormValues>(changePasswordFormSchema),
    defaultValues: emptyPassword,
  });

  useEffect(() => {
    const stored = getStoredUser('admin_user');
    if (!stored?.id) {
      router.push('/');
      return;
    }
    setUserId(stored.id);
    setLoading(true);
    apiFetch<{ name?: string; email?: string; mobile?: string }>(`/api/AdminUsers/${stored.id}`, {
      tokenKey: 'admin_token',
      errorFallback: 'Unable to load profile.',
    })
      .then(u => {
        resetProfile({
          id: stored.id!,
          name: u.name || '',
          email: u.email || '',
          mobile: u.mobile || '',
          password: '',
          contact_person_name: '',
          company_name: '',
        });
      })
      .catch(() => {
        resetProfile({
          id: stored.id!,
          name: stored.name || '',
          email: stored.email || '',
          mobile: '',
          password: '',
          contact_person_name: '',
          company_name: '',
        });
      })
      .finally(() => setLoading(false));
  }, [router, resetProfile]);

  const saveProfile = handleProfileSubmit(async values => {
    setProfileSaving(true);
    try {
      const updated = await apiFetch<Record<string, unknown>>(`/api/AdminUsers/${values.id}`, {
        method: 'PUT',
        tokenKey: 'admin_token',
        body: JSON.stringify({
          name: values.name.trim(),
          email: values.email.trim(),
          mobile: (values.mobile || '').trim() || null,
        }),
        successMessage: 'Profile updated successfully.',
        errorFallback: 'Failed to update profile',
      });
      const stored = getStoredUser('admin_user') || {};
      localStorage.setItem(
        'admin_user',
        JSON.stringify({
          ...stored,
          ...updated,
          id: values.id,
          name: values.name.trim(),
          email: values.email.trim(),
        }),
      );
    } catch {
      /* error toasted by apiFetch */
    } finally {
      setProfileSaving(false);
    }
  }, createInvalidHandler<ProfilePortalFormValues>());

  const savePassword = handlePasswordSubmit(async values => {
    if (!userId) return;
    setPasswordSaving(true);
    try {
      await apiFetch('/api/AdminUsers/changePassword', {
        method: 'POST',
        tokenKey: 'admin_token',
        body: JSON.stringify({
          userId,
          oldPassword: values.oldPassword,
          newPassword: values.newPassword,
        }),
        successMessage: 'Password changed successfully.',
        errorFallback: 'Failed to change password',
      });
      resetPassword(emptyPassword);
    } catch {
      /* error toasted by apiFetch */
    } finally {
      setPasswordSaving(false);
    }
  }, createInvalidHandler<ChangePasswordFormValues>());

  if (loading) {
    return (
      <div className="page-content" style={{ paddingTop: 0 }}>
        <TopNav title="Update Profile" />
        <PageLoader message="Loading profile..." size="lg" />
      </div>
    );
  }

  return (
    <div className="page-content" style={{ paddingTop: 0 }}>
      <TopNav title="Update Profile" />

      <div className="page-body">
        <div
          className="resp-grid-2"
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}
        >
          <div className="card">
            <div className="card-header">
              <span className="card-title">Profile</span>
            </div>
            <div className="card-body">
              <form onSubmit={saveProfile} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <FormGroup label="Name" htmlFor="admin-name" required error={profileErrors.name?.message}>
                  <input
                    id="admin-name"
                    type="text"
                    placeholder="Enter Name"
                    data-field="name"
                    className="form-control"
                    aria-invalid={!!profileErrors.name}
                    style={fieldStyle(!!profileErrors.name)}
                    {...registerProfile('name')}
                  />
                </FormGroup>

                <FormGroup label="Email" htmlFor="admin-email" required error={profileErrors.email?.message}>
                  <input
                    id="admin-email"
                    type="email"
                    placeholder="Enter Email"
                    data-field="email"
                    className="form-control"
                    aria-invalid={!!profileErrors.email}
                    style={fieldStyle(!!profileErrors.email)}
                    {...registerProfile('email')}
                  />
                </FormGroup>

                <FormGroup label="Mobile No." htmlFor="admin-mobile" error={profileErrors.mobile?.message}>
                  <input
                    id="admin-mobile"
                    type="text"
                    placeholder="Enter Mobile No."
                    data-field="mobile"
                    className="form-control"
                    aria-invalid={!!profileErrors.mobile}
                    style={fieldStyle(!!profileErrors.mobile)}
                    {...registerMobile(registerProfile, 'mobile')}
                  />
                </FormGroup>

                <div style={{ marginTop: '1rem' }}>
                  <button
                    type="submit"
                    disabled={profileSaving}
                    className="btn btn-block btn-info btn-sm"
                    style={{ width: '160px', cursor: 'pointer' }}
                  >
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
                <FormGroup
                  label="Old Password"
                  htmlFor="admin-old-pwd"
                  required
                  error={passwordErrors.oldPassword?.message}
                >
                  <PasswordInput
                    id="admin-old-pwd"
                    placeholder="Password"
                    data-field="oldPassword"
                    className="form-control"
                    aria-invalid={!!passwordErrors.oldPassword}
                    style={fieldStyle(!!passwordErrors.oldPassword)}
                    autoComplete="current-password"
                    {...registerPassword('oldPassword')}
                  />
                </FormGroup>

                <FormGroup
                  label="New Password"
                  htmlFor="admin-new-pwd"
                  required
                  error={passwordErrors.newPassword?.message}
                >
                  <PasswordInput
                    id="admin-new-pwd"
                    placeholder="Password"
                    data-field="newPassword"
                    className="form-control"
                    aria-invalid={!!passwordErrors.newPassword}
                    style={fieldStyle(!!passwordErrors.newPassword)}
                    autoComplete="new-password"
                    {...registerPassword('newPassword')}
                  />
                  <label className="form-label" style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {PASSWORD_HELPER_TEXT}
                  </label>
                </FormGroup>

                <FormGroup
                  label="Confirm Password"
                  htmlFor="admin-confirm-pwd"
                  required
                  error={passwordErrors.confirmPassword?.message}
                >
                  <PasswordInput
                    id="admin-confirm-pwd"
                    placeholder="Password"
                    data-field="confirmPassword"
                    className="form-control"
                    aria-invalid={!!passwordErrors.confirmPassword}
                    style={fieldStyle(!!passwordErrors.confirmPassword)}
                    autoComplete="new-password"
                    {...registerPassword('confirmPassword')}
                  />
                </FormGroup>

                <div style={{ marginTop: '1rem' }}>
                  <button
                    type="submit"
                    disabled={passwordSaving}
                    className="btn btn-block btn-info btn-sm"
                    style={{ width: '160px', cursor: 'pointer' }}
                  >
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
