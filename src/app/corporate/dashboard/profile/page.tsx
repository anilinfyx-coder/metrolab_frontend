'use client';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { MdBusiness, MdSave, MdVpnKey } from 'react-icons/md';
import TopNav from '../../../components/TopNav';
import PageLoader from '../../../components/PageLoader';
import { FormGroup } from '../../../components/FormField';
import PasswordInput from '../../../components/PasswordInput';
import { apiFetch } from '../../../../lib/api';
import { createInvalidHandler, fieldStyle, formResolver } from '../../../../lib/formHelpers';
import {
  corporatePasswordChangeSchema,
  corporateProfileUpdateSchema,
  PASSWORD_HELPER_TEXT,
  type CorporatePasswordChangeFormValues,
  type CorporateProfileUpdateFormValues,
} from '../../../../lib/schemas';

function getStoredUser() {
  if (typeof window === 'undefined') return null;
  try { return JSON.parse(localStorage.getItem('corporate_user') || '{}'); } catch { return {}; }
}

export default function CorporateProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [readOnlyProfile, setReadOnlyProfile] = useState({
    company_name: '',
    email: '',
    mobile: '',
  });

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    reset: resetProfile,
  } = useForm<CorporateProfileUpdateFormValues>({
    resolver: formResolver<CorporateProfileUpdateFormValues>(corporateProfileUpdateSchema),
    defaultValues: { contact_person_name: '', address: '', pincode: '' },
  });

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPassword,
    formState: { errors: passwordErrors },
  } = useForm<CorporatePasswordChangeFormValues>({
    resolver: formResolver<CorporatePasswordChangeFormValues>(corporatePasswordChangeSchema),
    defaultValues: { oldPassword: '', newPassword: '', confirmPassword: '' },
  });

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored?.id) { router.push('/corporate/login'); return; }
    setUserId(stored.id);

    apiFetch<Record<string, string>>(`/api/CorporateClients/${stored.id}`, {
      tokenKey: 'corporate_token',
      errorFallback: 'Unable to load profile.',
    })
      .then(u => {
        setReadOnlyProfile({
          company_name: u.company_name || '',
          email: u.email || '',
          mobile: u.mobile || '',
        });
        resetProfile({
          contact_person_name: u.contact_person_name || '',
          address: u.address || '',
          pincode: u.pincode || '',
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router, resetProfile]);

  const saveProfile = handleProfileSubmit(async values => {
    setSavingProfile(true);
    try {
      await apiFetch(`/api/CorporateClients/${userId}`, {
        method: 'PUT',
        tokenKey: 'corporate_token',
        body: JSON.stringify({
          company_name: readOnlyProfile.company_name,
          contact_person_name: values.contact_person_name,
          mobile: readOnlyProfile.mobile,
          address: values.address,
          pincode: values.pincode,
        }),
        successMessage: 'Profile updated successfully.',
        errorFallback: 'Update failed.',
      });
      const stored = getStoredUser() || {};
      localStorage.setItem('corporate_user', JSON.stringify({ ...stored, name: readOnlyProfile.company_name, email: readOnlyProfile.email }));
    } catch {
      /* toast handled by apiFetch */
    } finally {
      setSavingProfile(false);
    }
  });

  const changePassword = handlePasswordSubmit(async values => {
    setSavingPassword(true);
    try {
      await apiFetch(`/api/CorporateClients/${userId}`, {
        method: 'PUT',
        tokenKey: 'corporate_token',
        body: JSON.stringify({ password: values.newPassword }),
        successMessage: 'Password changed successfully.',
        errorFallback: 'Password update failed.',
      });
      resetPassword({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch {
      /* toast handled by apiFetch */
    } finally {
      setSavingPassword(false);
    }
  }, createInvalidHandler<CorporatePasswordChangeFormValues>());

  const disabledInputStyle = { width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6, padding: '0.5rem 0.75rem', color: 'var(--text)', opacity: 0.7 };

  if (loading) {
    return (
      <div className="page-content">
        <TopNav title="Profile" />
        <div className="page-body">
          <PageLoader message="Loading profile..." size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <TopNav title="Update Profile" />
      <div className="page-body">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>

          <div className="card">
            <div className="card-header">
              <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MdBusiness size={18} /> Profile
              </span>
            </div>
            <div className="card-body">
              <form onSubmit={saveProfile} noValidate>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ fontWeight: 500, fontSize: '0.875rem', display: 'block', marginBottom: '0.35rem' }}>Company Name</label>
                    <input disabled style={disabledInputStyle} value={readOnlyProfile.company_name} readOnly />
                  </div>
                  <FormGroup label="Contact Person Name" htmlFor="corp-contact">
                    <input id="corp-contact" data-field="contact_person_name" style={fieldStyle(false)} {...registerProfile('contact_person_name')} />
                  </FormGroup>
                  <div>
                    <label style={{ fontWeight: 500, fontSize: '0.875rem', display: 'block', marginBottom: '0.35rem' }}>Email</label>
                    <input type="email" disabled style={disabledInputStyle} value={readOnlyProfile.email} readOnly />
                  </div>
                  <div>
                    <label style={{ fontWeight: 500, fontSize: '0.875rem', display: 'block', marginBottom: '0.35rem' }}>Mobile No.</label>
                    <input disabled style={disabledInputStyle} value={readOnlyProfile.mobile} readOnly />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginTop: '0.75rem' }}>
                  <FormGroup label="Address" htmlFor="corp-address">
                    <input id="corp-address" placeholder="Enter Address" data-field="address" style={fieldStyle(false)} {...registerProfile('address')} />
                  </FormGroup>
                  <FormGroup label="Pincode" htmlFor="corp-pincode">
                    <input id="corp-pincode" placeholder="Pincode" data-field="pincode" style={fieldStyle(false)} {...registerProfile('pincode')} />
                  </FormGroup>
                </div>

                <div style={{ marginTop: '1.25rem' }}>
                  <button type="submit" disabled={savingProfile} style={{ background: '#17a2b8', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.5rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem' }}>
                    <MdSave size={15} /> {savingProfile ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MdVpnKey size={18} /> Change Password
              </span>
            </div>
            <div className="card-body">
              <form onSubmit={changePassword} noValidate>
                <FormGroup label="Old Password" htmlFor="corp-old-pwd">
                  <PasswordInput id="corp-old-pwd" placeholder="Current password" data-field="oldPassword" style={fieldStyle(false)} autoComplete="current-password" {...registerPassword('oldPassword')} />
                </FormGroup>
                <FormGroup label="New Password" htmlFor="corp-new-pwd" required error={passwordErrors.newPassword?.message}>
                  <PasswordInput id="corp-new-pwd" placeholder="Min. 6 characters. Only @, # allowed as special characters" data-field="newPassword" aria-invalid={!!passwordErrors.newPassword} style={fieldStyle(!!passwordErrors.newPassword)} autoComplete="new-password" {...registerPassword('newPassword')} />
                  <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{PASSWORD_HELPER_TEXT}</small>
                </FormGroup>
                <FormGroup label="Confirm Password" htmlFor="corp-confirm-pwd" required error={passwordErrors.confirmPassword?.message}>
                  <PasswordInput id="corp-confirm-pwd" placeholder="Confirm new password" data-field="confirmPassword" aria-invalid={!!passwordErrors.confirmPassword} style={fieldStyle(!!passwordErrors.confirmPassword)} autoComplete="new-password" {...registerPassword('confirmPassword')} />
                </FormGroup>
                <button type="submit" disabled={savingPassword} style={{ background: '#17a2b8', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.5rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem' }}>
                  <MdVpnKey size={15} /> {savingPassword ? 'Changing...' : 'Change Password'}
                </button>
              </form>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
