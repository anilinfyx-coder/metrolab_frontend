'use client';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { usePathname, useRouter } from 'next/navigation';
import TopNav from './TopNav';
import PageLoader from './PageLoader';
import { FormGroup } from './FormField';
import PasswordInput from './PasswordInput';
import { getPortalFromPath, getStoredUser } from './portalConfig';
import { apiFetch } from '../../lib/api';
import { createInvalidHandler, fieldStyle, formResolver } from '../../lib/formHelpers';
import { profileSchemaForPortal, type ProfilePortalFormValues } from '../../lib/schemas';

const emptyProfile: ProfilePortalFormValues = {
  id: 0,
  name: '',
  email: '',
  mobile: '',
  password: '',
  contact_person_name: '',
  company_name: '',
};

export default function ProfilePage() {
  const pathname = usePathname();
  const router = useRouter();
  const portal = getPortalFromPath(pathname || '');
  const isOrg = portal.nameField === 'company_name';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const schema = useMemo(() => profileSchemaForPortal(isOrg), [isOrg]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ProfilePortalFormValues>({
    resolver: formResolver<ProfilePortalFormValues>(schema),
    defaultValues: emptyProfile,
  });

  useEffect(() => {
    const stored = getStoredUser(portal.userKey);
    if (!stored?.id) {
      router.push(portal.loginPath);
      return;
    }
    apiFetch<Record<string, string | number>>(`${portal.apiPath}/${stored.id}`, {
      tokenKey: portal.tokenKey,
      errorFallback: 'Unable to load profile.',
    })
      .then(u => {
        reset({
          id: Number(u.id),
          name: String(u.name || ''),
          email: String(u.email || ''),
          mobile: String(u.mobile || ''),
          password: '',
          contact_person_name: String(u.contact_person_name || ''),
          company_name: String(u.company_name || ''),
        });
      })
      .catch(() => {
        reset({
          ...emptyProfile,
          id: stored.id!,
          name: stored.name || '',
          email: stored.email || '',
          company_name: stored.company_name || '',
        });
      })
      .finally(() => setLoading(false));
  }, [portal, router, reset]);

  const save = handleSubmit(async values => {
    setSaving(true);

    const payload: Record<string, unknown> = {
      email: values.email.trim(),
      mobile: (values.mobile || '').trim() || null,
    };

    if (portal.nameField === 'company_name') {
      payload.company_name = (values.company_name || '').trim() || (values.name || '').trim();
      if (portal.key === 'b2b') payload.contact_person_name = (values.contact_person_name || '').trim() || null;
    } else {
      payload.name = (values.name || '').trim();
    }

    if (values.password?.trim()) {
      payload.password = values.password.trim();
    }

    try {
      const updated = await apiFetch<Record<string, unknown>>(`${portal.apiPath}/${values.id}`, {
        method: 'PUT',
        tokenKey: portal.tokenKey,
        body: JSON.stringify(payload),
        successMessage: 'Profile updated successfully.',
        errorFallback: 'Update failed.',
      });
      const displayName =
        portal.nameField === 'company_name'
          ? (values.company_name || values.name || values.email)
          : (values.name || values.email);
      const stored = getStoredUser(portal.userKey) || {};
      localStorage.setItem(
        portal.userKey,
        JSON.stringify({
          ...stored,
          ...updated,
          id: values.id,
          name: displayName,
          email: values.email.trim(),
        })
      );
      setValue('password', '');
    } catch {
      /* toast handled by apiFetch */
    } finally {
      setSaving(false);
    }
  }, createInvalidHandler<ProfilePortalFormValues>());

  return (
    <div className="page-content" style={{ paddingTop: 0 }}>
      <TopNav title="Update Profile" />
      <div style={{ padding: '1.25rem 1.5rem', maxWidth: 560 }}>
        <div className="card">
          <div className="card-header">
            <span className="card-title section-title-accent">Profile Details</span>
          </div>
          <div className="card-body">
            {loading ? (
              <PageLoader message="Loading profile..." />
            ) : (
              <form onSubmit={save} noValidate>
                {isOrg ? (
                  <>
                    <FormGroup
                      label="Company / Lab Name"
                      htmlFor="profile-company"
                      required
                      error={errors.company_name?.message}
                    >
                      <input
                        id="profile-company"
                        data-field="company_name"
                        aria-invalid={!!errors.company_name}
                        style={fieldStyle(!!errors.company_name)}
                        {...register('company_name', {
                          onChange: e => {
                            setValue('name', e.target.value);
                          },
                        })}
                      />
                    </FormGroup>
                    {portal.key === 'b2b' && (
                      <FormGroup
                        label="Contact Person"
                        htmlFor="profile-contact"
                        error={errors.contact_person_name?.message}
                      >
                        <input
                          id="profile-contact"
                          data-field="contact_person_name"
                          aria-invalid={!!errors.contact_person_name}
                          style={fieldStyle(!!errors.contact_person_name)}
                          {...register('contact_person_name')}
                        />
                      </FormGroup>
                    )}
                  </>
                ) : (
                  <FormGroup label="Name" htmlFor="profile-name" required error={errors.name?.message}>
                    <input
                      id="profile-name"
                      data-field="name"
                      aria-invalid={!!errors.name}
                      style={fieldStyle(!!errors.name)}
                      {...register('name')}
                    />
                  </FormGroup>
                )}

                <FormGroup label="Email" htmlFor="profile-email" required error={errors.email?.message}>
                  <input
                    id="profile-email"
                    type="email"
                    data-field="email"
                    aria-invalid={!!errors.email}
                    style={fieldStyle(!!errors.email)}
                    {...register('email')}
                  />
                </FormGroup>

                <FormGroup label="Mobile" htmlFor="profile-mobile" error={errors.mobile?.message}>
                  <input
                    id="profile-mobile"
                    inputMode="numeric"
                    data-field="mobile"
                    aria-invalid={!!errors.mobile}
                    style={fieldStyle(!!errors.mobile)}
                    {...register('mobile')}
                  />
                </FormGroup>

                <FormGroup label="New Password" htmlFor="profile-password" error={errors.password?.message}>
                  <PasswordInput
                    id="profile-password"
                    data-field="password"
                    aria-invalid={!!errors.password}
                    style={fieldStyle(!!errors.password)}
                    autoComplete="new-password"
                    placeholder="Leave blank to keep current"
                    {...register('password')}
                  />
                  <div style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.35rem' }}>
                    (leave blank to keep current)
                  </div>
                </FormGroup>

                <div style={{ display: 'flex', gap: '0.65rem' }}>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button type="button" className="btn btn-reset" onClick={() => router.back()}>
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
