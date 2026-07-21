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
import { createInvalidHandler, fieldStyle, formResolver } from '../../../../lib/formHelpers';
import {
  b2bProfileSettingsSchema,
  changePasswordFormSchema,
  PASSWORD_HELPER_TEXT,
  type B2bProfileSettingsFormValues,
  type ChangePasswordFormValues,
} from '../../../../lib/schemas';

const emptyProfile: B2bProfileSettingsFormValues = {
  id: 0,
  support_person_name: '',
  support_mobile: '',
  support_email: '',
  primary_color_code: '#0076A3',
  public_phone_no: '',
  public_email: '',
  public_fax: '',
  tagline: '',
  smtp_server: '',
  smtp_port: '',
  smtp_email: '',
  smtp_password: '',
  company_name: '',
  contact_person_name: '',
};

export default function B2BProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPwd, setChangingPwd] = useState(false);

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    reset: resetProfile,
    setValue: setProfileValue,
    getValues: getProfileValues,
    watch: watchProfile,
    formState: { errors: profileErrors },
  } = useForm<B2bProfileSettingsFormValues>({
    resolver: formResolver<B2bProfileSettingsFormValues>(b2bProfileSettingsSchema),
    defaultValues: emptyProfile,
  });

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPassword,
    formState: { errors: passwordErrors },
  } = useForm<ChangePasswordFormValues>({
    resolver: formResolver<ChangePasswordFormValues>(changePasswordFormSchema),
    defaultValues: { oldPassword: '', newPassword: '', confirmPassword: '' },
  });

  const primaryColor = watchProfile('primary_color_code');

  useEffect(() => {
    const stored = getStoredUser('b2b_user');
    if (!stored?.id) {
      router.push('/');
      return;
    }
    apiFetch<Record<string, string | number>>(`/api/B2bClients/${stored.id}`, {
      tokenKey: 'b2b_token',
      errorFallback: 'Unable to load profile.',
    })
      .then(u => {
        resetProfile({
          id: Number(u.id),
          support_person_name: String(u.support_person_name || ''),
          support_mobile: String(u.support_mobile || ''),
          support_email: String(u.support_email || ''),
          primary_color_code: String(u.primary_color_code || '#0076A3'),
          public_phone_no: String(u.public_phone_no || ''),
          public_email: String(u.public_email || ''),
          public_fax: String(u.public_fax || ''),
          tagline: String(u.tagline || ''),
          smtp_server: String(u.smtp_server || ''),
          smtp_port: String(u.smtp_port || ''),
          smtp_email: String(u.smtp_email || ''),
          smtp_password: String(u.smtp_password || ''),
          company_name: String(u.company_name || ''),
          contact_person_name: String(u.contact_person_name || ''),
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router, resetProfile]);

  const saveProfile = handleProfileSubmit(async values => {
    setSaving(true);
    const payload = {
      support_person_name: (values.support_person_name || '').trim(),
      support_mobile: (values.support_mobile || '').trim(),
      support_email: (values.support_email || '').trim(),
      primary_color_code: (values.primary_color_code || '').trim(),
      public_phone_no: (values.public_phone_no || '').trim(),
      public_email: (values.public_email || '').trim(),
      public_fax: (values.public_fax || '').trim(),
      tagline: (values.tagline || '').trim(),
      smtp_server: (values.smtp_server || '').trim(),
      smtp_port: (values.smtp_port || '').trim(),
      smtp_email: (values.smtp_email || '').trim(),
      smtp_password: values.smtp_password,
    };
    try {
      await apiFetch(`/api/B2bClients/${values.id}`, {
        method: 'PUT',
        tokenKey: 'b2b_token',
        body: JSON.stringify(payload),
        successMessage: 'Profile updated successfully.',
        errorFallback: 'Failed to save profile.',
      });
      const stored = getStoredUser('b2b_user') || {};
      localStorage.setItem(
        'b2b_user',
        JSON.stringify({
          ...stored,
          id: values.id,
          name: values.company_name || stored.name,
          email: stored.email,
        })
      );
    } catch {
      /* toast handled by apiFetch */
    } finally {
      setSaving(false);
    }
  }, createInvalidHandler<B2bProfileSettingsFormValues>());

  const changePassword = handlePasswordSubmit(async values => {
    setChangingPwd(true);
    try {
      await apiFetch('/api/B2bClients/changePassword', {
        method: 'POST',
        tokenKey: 'b2b_token',
        body: JSON.stringify({
          userId: getProfileValues('id'),
          oldPassword: values.oldPassword,
          newPassword: values.newPassword,
        }),
        successMessage: 'Password changed successfully.',
        errorFallback: 'Failed to change password.',
      });
      resetPassword({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch {
      /* toast handled by apiFetch */
    } finally {
      setChangingPwd(false);
    }
  }, createInvalidHandler<ChangePasswordFormValues>());

  const profileField = (
    id: string,
    label: string,
    key: keyof B2bProfileSettingsFormValues,
    opts?: { type?: string; placeholder?: string; error?: string }
  ) => (
    <FormGroup label={label} htmlFor={id} error={opts?.error}>
      {opts?.type === 'password' ? (
        <PasswordInput
          id={id}
          placeholder={opts?.placeholder}
          data-field={key}
          aria-invalid={!!opts?.error}
          style={fieldStyle(!!opts?.error)}
          {...registerProfile(key)}
        />
      ) : (
        <input
          id={id}
          type={opts?.type || 'text'}
          placeholder={opts?.placeholder}
          data-field={key}
          aria-invalid={!!opts?.error}
          style={fieldStyle(!!opts?.error)}
          {...registerProfile(key)}
        />
      )}
    </FormGroup>
  );

  return (
    <div className="page-content" style={{ paddingTop: 0 }}>
      <TopNav title="B2B Profile" />

      <div className="page-body">
        {loading ? (
          <PageLoader message="Loading profile..." />
        ) : (
          <div className="split-pane" style={{ gridTemplateColumns: 'minmax(0, 2fr) minmax(260px, 1fr)' }}>
            <div className="card">
              <div className="card-header">
                <span className="card-title" style={{ color: 'var(--text)', fontWeight: 700 }}>Profile</span>
              </div>
              <div className="card-body">
                <form onSubmit={saveProfile} noValidate>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1.25rem' }}>
                    {profileField('support_person_name', 'Support Person Name', 'support_person_name')}
                    {profileField('support_mobile', 'Support Mobile', 'support_mobile', { error: profileErrors.support_mobile?.message })}
                    {profileField('support_email', 'Support Email', 'support_email', { type: 'email', error: profileErrors.support_email?.message })}

                    <div className="form-group">
                      <label htmlFor="primary_color_code">Primary Colour code</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <input
                          type="color"
                          aria-label="Pick color"
                          value={/^#[0-9A-Fa-f]{6}$/.test(primaryColor || '') ? primaryColor : '#0076A3'}
                          onChange={e => setProfileValue('primary_color_code', e.target.value.toUpperCase(), { shouldValidate: true })}
                          style={{
                            width: 36,
                            height: 36,
                            padding: 0,
                            border: '1px solid var(--border)',
                            borderRadius: 4,
                            cursor: 'pointer',
                            background: 'transparent',
                          }}
                        />
                        <input
                          id="primary_color_code"
                          type="text"
                          data-field="primary_color_code"
                          placeholder="#0076A3"
                          style={{ ...fieldStyle(false), flex: 1 }}
                          {...registerProfile('primary_color_code')}
                        />
                      </div>
                    </div>

                    {profileField('public_phone_no', 'Public Phone Number', 'public_phone_no')}
                    {profileField('public_email', 'Public Email', 'public_email', { type: 'email', error: profileErrors.public_email?.message })}
                    {profileField('public_fax', 'Public Fax', 'public_fax')}
                    {profileField('tagline', 'Tagline', 'tagline')}
                    {profileField('smtp_server', 'SMTP Server', 'smtp_server')}
                    {profileField('smtp_port', 'SMTP Port', 'smtp_port')}
                    {profileField('smtp_email', 'SMTP Email', 'smtp_email', { type: 'email', error: profileErrors.smtp_email?.message })}
                    {profileField('smtp_password', 'SMTP Password', 'smtp_password', { type: 'password' })}
                  </div>

                  <div style={{ marginTop: '0.5rem' }}>
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                      {saving ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <span className="card-title" style={{ color: 'var(--text)', fontWeight: 700 }}>Change Password</span>
              </div>
              <div className="card-body">
                <form onSubmit={changePassword} noValidate>
                  <FormGroup label="Old Password" htmlFor="old_password" required error={passwordErrors.oldPassword?.message}>
                    <PasswordInput
                      id="old_password"
                      placeholder="Password"
                      data-field="oldPassword"
                      aria-invalid={!!passwordErrors.oldPassword}
                      style={fieldStyle(!!passwordErrors.oldPassword)}
                      autoComplete="current-password"
                      {...registerPassword('oldPassword')}
                    />
                  </FormGroup>
                  <FormGroup label="New Password" htmlFor="new_password" required error={passwordErrors.newPassword?.message}>
                    <PasswordInput
                      id="new_password"
                      placeholder="Password"
                      data-field="newPassword"
                      aria-invalid={!!passwordErrors.newPassword}
                      style={fieldStyle(!!passwordErrors.newPassword)}
                      autoComplete="new-password"
                      {...registerPassword('newPassword')}
                    />
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.35rem', fontStyle: 'italic' }}>
                      {PASSWORD_HELPER_TEXT}
                    </div>
                  </FormGroup>
                  <FormGroup label="Confirm Password" htmlFor="confirm_password" required error={passwordErrors.confirmPassword?.message}>
                    <PasswordInput
                      id="confirm_password"
                      placeholder="Password"
                      data-field="confirmPassword"
                      aria-invalid={!!passwordErrors.confirmPassword}
                      style={fieldStyle(!!passwordErrors.confirmPassword)}
                      autoComplete="new-password"
                      {...registerPassword('confirmPassword')}
                    />
                  </FormGroup>
                  <button type="submit" className="btn btn-primary" disabled={changingPwd}>
                    {changingPwd ? 'Saving…' : 'Change Password'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
