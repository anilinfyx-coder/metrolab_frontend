'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { MdDownload, MdCheckCircle, MdRadioButtonUnchecked } from 'react-icons/md';
import { apiFetch, toastApiError, toastApiSuccess, getUploadUrl } from '../../../../../../lib/api';
import { formatDate } from '../../../../../utils/dateFormat';
import PageLoader from '../../../../../components/PageLoader';
import { getStoredUser } from '../../../../../components/portalConfig';

type LabBranding = {
  company_name?: string | null;
  address?: string | null;
  public_phone_no?: string | null;
  public_fax?: string | null;
  public_email?: string | null;
  logo_file?: string | null;
};

function textOrNull(value: unknown): string | null {
  if (value == null) return null;
  const text = String(value).trim();
  if (!text || text.toLowerCase() === 'null' || text.toLowerCase() === 'undefined') return null;
  return text;
}

function labText(labValue: unknown): string {
  return textOrNull(labValue) || '';
}

function isMale(sex: unknown) {
  return sex === 1 || sex === '1' || String(sex).toLowerCase() === 'male';
}

function isFemale(sex: unknown) {
  return sex === 2 || sex === '2' || String(sex).toLowerCase() === 'female';
}

const Checkbox = ({ checked, label, onClick }: { checked: boolean; label?: string; onClick?: () => void }) => (
  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: onClick ? 'pointer' : 'default' }} onClick={onClick}>
    {checked ? <MdCheckCircle size={20} color="#0f172a" /> : <MdRadioButtonUnchecked size={20} color="#64748b" />}
    {label && <span style={{ fontSize: '15px', fontWeight: 500, color: '#0f172a' }}>{label}</span>}
  </div>
);

const UnderlineField = ({ label, value, flex, width, suffix }: any) => (
  <div style={{ display: 'flex', alignItems: 'flex-end', flex: flex || (width ? 'none' : 1), width, margin: '6px 12px 6px 0', minWidth: 0 }}>
    <span style={{ whiteSpace: 'nowrap', marginRight: 6, fontSize: '15px', color: '#1e293b' }}>{label}</span>
    <span style={{ borderBottom: '1px solid #334155', flex: 1, textAlign: 'center', fontSize: '15px', minHeight: '1.4em', minWidth: '40px', padding: '0 4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 600, color: '#0f172a' }}>{value || ''}</span>
    {suffix && <span style={{ whiteSpace: 'nowrap', marginLeft: 6, fontSize: '15px', color: '#1e293b' }}>{suffix}</span>}
  </div>
);

const METRO_FALLBACK = {
  company: 'Metro Lab',
  addressLine: '8424 Georgia Ave, Silver Spring, MD 20910',
  phone: '301-448-1379',
  fax: '240-644-8833',
  email: 'results@metrolabwdc.com',
  website: 'https://metrolabwdc.com',
};

function labOrFallback(labValue: unknown, fallback: string) {
  const text = textOrNull(labValue);
  return text ? text : fallback;
}

export default function PrintAdultHealthCertificate() {
  const { id } = useParams();
  const [data, setData] = useState<Record<string, any> | null>(null);
  const [lab, setLab] = useState<LabBranding | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    (async () => {
      try {
        const [cert, profile] = await Promise.all([
          apiFetch<Record<string, any>>(`/api/AdultHealthCertificates/${id}`, {
            tokenKey: 'admin_token',
            errorFallback: 'Certificate not found.',
            silent: true,
          }),
          (async () => {
            const stored = getStoredUser('admin_user') as Record<string, unknown> | null;
            if (!stored?.id) return null;
            try {
              return await apiFetch<LabBranding & Record<string, unknown>>('/api/AdminUsers/getProfile', {
                method: 'POST',
                tokenKey: 'admin_token',
                body: JSON.stringify({ id: stored.id }),
                silent: true,
              });
            } catch {
              const b2bId = stored.user_id;
              if (!b2bId) return null;
              try {
                return await apiFetch<LabBranding>(`/api/B2bClients/${b2bId}`, {
                  tokenKey: 'admin_token',
                  silent: true,
                });
              } catch {
                return null;
              }
            }
          })(),
        ]);
        if (cancelled) return;
        setData(cert);
        setLab(profile);
        setLogoFailed(false);
      } catch (err) {
        if (!cancelled) {
          setData(null);
          toastApiError(err, 'Failed to load certificate.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const downloadPdf = async () => {
    if (!id || downloading) return;
    setDownloading(true);
    try {
      const blob = await apiFetch<Blob>('/api/AdultHealthCertificates/downloadAdultHealthCertificate', {
        method: 'POST',
        tokenKey: 'admin_token',
        body: JSON.stringify({ id: Number(id) }),
        errorFallback: 'Failed to download certificate PDF.',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Adult_Health_Certificate_${id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toastApiSuccess('Certificate PDF downloaded.');
    } catch {
      /* toasted by apiFetch */
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return <PageLoader message="Loading certificate..." size="lg" />;
  if (!data) return <div style={{ padding: 24, textAlign: 'center' }}>Certificate not found</div>;

  const company = labOrFallback(lab?.company_name, METRO_FALLBACK.company);
  const phone = labOrFallback(lab?.public_phone_no, METRO_FALLBACK.phone);
  const fax = labOrFallback(lab?.public_fax, METRO_FALLBACK.fax);
  const email = labOrFallback(lab?.public_email, METRO_FALLBACK.email);
  const website = labOrFallback(lab?.website, METRO_FALLBACK.website).replace(/^https?:\/\//i, '');
  const bannerAddress = labOrFallback(lab?.address, METRO_FALLBACK.addressLine);
  const isSuperAdmin = !!getStoredUser('superadmin_user');
  const labLogoUrl = textOrNull(lab?.logo_file) ? getUploadUrl(lab?.logo_file) : '';
  const hasB2BLogo = Boolean(labLogoUrl) && !logoFailed;
  const showMetroLabLogo = isSuperAdmin;
  const showB2BLogo = !isSuperAdmin && hasB2BLogo;
  const specialty = String(data.clinician_specialty || '').toUpperCase();
  const signatureUrl = textOrNull(lab?.medical_officer_signature_file_name)
    ? getUploadUrl(lab?.medical_officer_signature_file_name)
    : '';

  return (
    <div className="ahc-page">
      <style dangerouslySetInnerHTML={{ __html: AHC_STYLES }} />

      <div className="ahc-toolbar no-print">
        <button
          type="button"
          className="ahc-print-btn"
          onClick={downloadPdf}
          disabled={downloading}
        >
          <MdDownload size={18} aria-hidden />
          {downloading ? 'Downloading...' : 'Download PDF'}
        </button>
        <span className="ahc-toolbar-hint">Optimized digital layout for PDF generation</span>
      </div>

      <div className="ahc-sheet">
        {company ? (
          <div className="ahc-watermark" aria-hidden>
            {company}
          </div>
        ) : null}

        {/* Header matching the traditional image */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid #60a5fa', paddingBottom: '16px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            {showMetroLabLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src="/login-logo.png" alt="Metro Lab" style={{ height: '70px', objectFit: 'contain' }} />
            ) : showB2BLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={labLogoUrl} alt="Logo" style={{ height: '70px', objectFit: 'contain' }} onError={() => setLogoFailed(true)} />
            ) : (
              <div style={{ width: '70px', height: '70px' }}></div>
            )}
            <div>
              <div style={{ fontSize: '32px', fontWeight: 900, letterSpacing: '1px', marginBottom: '4px', fontFamily: 'Arial, sans-serif' }}>
                {showMetroLabLogo || company === METRO_FALLBACK.company ? (
                  <>
                    <span style={{ color: '#fff', textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000' }}>METRO</span>
                    {' '}
                    <span style={{ color: '#fde047', textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000' }}>LAB</span>
                  </>
                ) : (
                  <span style={{ color: '#0f172a' }}>{company.toUpperCase()}</span>
                )}
              </div>
              <div style={{ fontSize: '13px', color: '#1e293b', fontWeight: 500, lineHeight: '1.6' }}>
                {bannerAddress}<br />
                Phone: {phone} • Fax: {fax} • {email}
              </div>
            </div>
          </div>
          {/* Social icons removed per request */}
        </div>

        {/* Center Text */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h2 style={{ margin: '0', fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>Adult Health Certificate</h2>
        </div>

        {/* Patient Details */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: '8px', alignItems: 'flex-end' }}>
            <UnderlineField label="Name:" value={data.name} flex={2} />
            <div style={{ display: 'flex', alignItems: 'flex-end', marginLeft: '16px' }}>
              <span style={{ fontSize: '15px', marginRight: '16px', color: '#1e293b' }}>Sex:</span>
              <div style={{ borderBottom: '1px solid #334155', width: '40px', textAlign: 'center', marginRight: '8px', fontWeight: 600, color: '#0f172a' }}>
                {isMale(data.sex) ? '✔' : ''}
              </div>
              <span style={{ fontSize: '15px', marginRight: '16px', color: '#1e293b' }}>Male</span>
              <div style={{ borderBottom: '1px solid #334155', width: '40px', textAlign: 'center', marginRight: '8px', fontWeight: 600, color: '#0f172a' }}>
                {isFemale(data.sex) ? '✔' : ''}
              </div>
              <span style={{ fontSize: '15px', color: '#1e293b' }}>Female</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: '16px' }}>
            <UnderlineField label="DOB:" value={formatDate(data.dob, '')} flex={1} />
            <UnderlineField label="Tel #:" value={data.tel} flex={1.5} />
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '16px' }}>
            <span style={{ fontSize: '15px', color: '#1e293b', marginTop: '4px' }}>Address:</span>
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, marginLeft: '8px' }}>
              <div style={{ borderBottom: '1px solid #334155', display: 'flex', paddingBottom: '2px' }}>
                <span style={{ flex: 2, textAlign: 'center', fontWeight: 600, color: '#0f172a' }}>{data.street1 || ''}</span>
                <span style={{ flex: 1, textAlign: 'center', fontWeight: 600, color: '#0f172a' }}>{data.street2 || ''}</span>
                <span style={{ flex: 1.5, textAlign: 'center', fontWeight: 600, color: '#0f172a' }}>{data.city || ''}</span>
                <span style={{ flex: 1, textAlign: 'center', fontWeight: 600, color: '#0f172a' }}>{data.state || ''}</span>
                <span style={{ flex: 1, textAlign: 'center', fontWeight: 600, color: '#0f172a' }}>{data.zipcode || ''}</span>
              </div>
              <div style={{ display: 'flex', fontSize: '12px', color: '#475569', marginTop: '4px' }}>
                <span style={{ flex: 2, textAlign: 'center' }}>Street Name/Number</span>
                <span style={{ flex: 1, textAlign: 'center' }}>Apt#(if applicable)</span>
                <span style={{ flex: 1.5, textAlign: 'center' }}>City</span>
                <span style={{ flex: 1, textAlign: 'center' }}>State</span>
                <span style={{ flex: 1, textAlign: 'center' }}>Zip code</span>
              </div>
            </div>
          </div>
        </div>

        {/* Clinical Certification */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', marginBottom: '16px' }}>
            I have examined the above named person and certify that he/she is:
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '16px', paddingLeft: '16px' }}>
            <div style={{ width: '24px', fontSize: '15px', color: '#1e293b', paddingTop: '2px' }}>1.</div>
            <Checkbox checked={data.free_from_disease} />
            <div style={{ marginLeft: '12px', fontSize: '15px', color: '#1e293b', paddingTop: '1px' }}>
              Free from disease in communicable form.
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', paddingLeft: '16px' }}>
            <div style={{ width: '24px', fontSize: '15px', color: '#1e293b', paddingTop: '2px' }}>2.</div>
            <Checkbox checked={data.satisfactory_physical} />
            <div style={{ marginLeft: '12px', fontSize: '15px', color: '#1e293b', lineHeight: '1.5', paddingTop: '1px' }}>
              In satisfactory physical condition, this will permit, close association with<br />
              children/elderly without danger to them.
            </div>
          </div>
        </div>

        {/* Tests */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{ fontSize: '15px', color: '#1e293b', marginBottom: '24px' }}>
            In addition to a general physical examination, the following test has been done:
          </div>

          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', marginBottom: '16px' }}>
              <span style={{ fontSize: '15px', color: '#1e293b', marginRight: '16px' }}>Tuberculin test (check one):</span>
              <div style={{ borderBottom: '1px solid #334155', width: '40px', textAlign: 'center', marginRight: '8px', fontWeight: 600, color: '#0f172a' }}>
                {data.tuberculin_test_type === 'Tine' ? '✔' : ''}
              </div>
              <span style={{ fontSize: '15px', marginRight: '24px', color: '#1e293b' }}>Tine</span>

              <div style={{ borderBottom: '1px solid #334155', width: '40px', textAlign: 'center', marginRight: '8px', fontWeight: 600, color: '#0f172a' }}>
                {data.tuberculin_test_type === 'PPD' ? '✔' : ''}
              </div>
              <span style={{ fontSize: '15px', color: '#1e293b' }}>PPD</span>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap' }}>
              <UnderlineField label="Date planted:" value={formatDate(data.tuberculin_date_planted, '')} flex={1} />
              <UnderlineField label="Date read:" value={formatDate(data.tuberculin_date_read, '')} flex={1} />
              <UnderlineField label="Result:" value={data.tuberculin_result} flex={1} />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '32px' }}>
            <Checkbox checked={!!data.chest_xray_date || !!data.chest_xray_result} />
            <div style={{ display: 'flex', flex: 1, marginLeft: '12px' }}>
              <UnderlineField label="Chest x-ray: Date:" value={formatDate(data.chest_xray_date, '')} flex={1} />
              <UnderlineField label="Result:" value={data.chest_xray_result} flex={1.5} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <Checkbox checked={!!data.additional_info} />
              <div style={{ marginLeft: '12px', fontSize: '15px', color: '#1e293b' }}>
                Additional information, Past Medical History, Current Medications:
              </div>
            </div>
            <div style={{ borderBottom: '1px solid #334155', minHeight: '32px', width: '100%', marginTop: '8px', fontWeight: 600, color: '#0f172a', paddingBottom: '4px' }}>
              {data.additional_info || ''}
            </div>
            <div style={{ borderBottom: '1px solid #334155', height: '32px', width: '100%', marginTop: '8px' }}></div>
          </div>
        </div>

        {/* Signature Section */}
        <div style={{ marginTop: '64px', paddingLeft: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', marginBottom: '24px' }}>
            <span style={{ fontSize: '15px', marginRight: '8px', color: '#1e293b' }}>Name/Signature of examining Clinician:</span>
            <div style={{ borderBottom: '1px solid #334155', flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'flex-end', height: '40px', maxWidth: '400px', paddingBottom: '4px' }}>
              <span style={{ fontWeight: 600, color: '#0f172a' }}>{data.clinician_name}</span>
            </div>
            <span style={{ fontSize: '15px', marginLeft: '8px', color: '#1e293b' }}>{specialty || 'MD/PA/NP'}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', marginBottom: '24px', width: '400px' }}>
            <span style={{ fontSize: '15px', marginRight: '8px', color: '#1e293b' }}>Date of examination</span>
            <div style={{ borderBottom: '1px solid #334155', flex: 1, textAlign: 'center', fontWeight: 600, color: '#0f172a', paddingBottom: '2px' }}>
              {formatDate(data.date_of_examination, '')}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', marginBottom: '24px', width: '600px' }}>
            <span style={{ fontSize: '15px', marginRight: '8px', color: '#1e293b' }}>Address</span>
            <div style={{ borderBottom: '1px solid #334155', flex: 1, textAlign: 'center', fontWeight: 600, color: '#0f172a', paddingBottom: '2px' }}>
              {data.clinician_address || ''}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

const AHC_STYLES = `
  .ahc-page {
    background: #f1f5f9;
    min-height: 100vh;
    padding: 32px 16px 48px;
    font-family: 'Times New Roman', Times, serif;
    color: #0f172a;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  .ahc-toolbar {
    max-width: 850px;
    margin: 0 auto 16px;
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
  }
  .ahc-print-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 18px;
    background: #0ea5e9;
    color: #fff;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 4px 6px -1px rgba(14, 165, 233, 0.2);
    transition: all 0.2s;
  }
  .ahc-print-btn:hover { background: #0284c7; }
  .ahc-print-btn:disabled { opacity: 0.7; cursor: not-allowed; }
  .ahc-toolbar-hint { font-size: 13px; color: #64748b; font-weight: 500; }
  
  .ahc-sheet {
    position: relative;
    max-width: 850px;
    margin: 0 auto;
    background: #fff;
    padding: 64px;
    border-radius: 4px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
    overflow: hidden;
  }
  .ahc-watermark {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 120px;
    font-weight: 900;
    letter-spacing: 16px;
    color: rgba(241, 245, 249, 0.6);
    transform: rotate(-35deg);
    pointer-events: none;
    z-index: 0;
    white-space: nowrap;
  }
  .ahc-sheet > *:not(.ahc-watermark) { position: relative; z-index: 1; }
  
  @media print {
    @page { margin: 0; size: auto; }
    body { background: #fff; }
    .ahc-page { padding: 0; background: #fff; }
    .ahc-sheet { box-shadow: none; padding: 48px; border-radius: 0; max-width: 100%; }
  }
`;
