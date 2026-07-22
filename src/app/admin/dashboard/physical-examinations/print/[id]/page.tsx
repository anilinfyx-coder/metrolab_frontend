'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { MdDownload, MdCheckCircle, MdRadioButtonUnchecked, MdCancel } from 'react-icons/md';
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

function sexLabel(sex: unknown) {
  if (sex === 1 || sex === '1' || String(sex).toLowerCase() === 'male') return 'Male';
  if (sex === 2 || sex === '2' || String(sex).toLowerCase() === 'female') return 'Female';
  return sex ? String(sex) : '';
}

function isNormal(val: unknown) {
  const s = String(val || '').trim();
  return s.toLowerCase() === 'normal' || s.toUpperCase() === 'N';
}

function isAbnormal(val: unknown) {
  const s = String(val || '').trim();
  return s.toLowerCase() === 'abnormal' || s.toUpperCase() === 'AB';
}

const EVAL_ITEMS: { key: string; label: string }[] = [
  { key: 'eval_head', label: 'Head, Neck, Face & Scalp' },
  { key: 'eval_nose', label: 'Nose and Sinuses' },
  { key: 'eval_mouth', label: 'Mouth and Throat' },
  { key: 'eval_ears', label: 'Ears' },
  { key: 'eval_eyes', label: 'Eyes, Pupils and Ocular Motion' },
  { key: 'eval_lungs', label: 'Lungs, Chest, and Breasts' },
  { key: 'eval_heart', label: 'Heart' },
  { key: 'eval_vascular', label: 'Vascular System' },
  { key: 'eval_abdomen', label: 'Abdomen and Viscera' },
  { key: 'eval_spine', label: 'Spine, other Muscular Skeletal System' },
  { key: 'eval_skin', label: 'Skin and Lymphatic' },
  { key: 'eval_neurologic', label: 'Neurologic' },
];

const Checkbox = ({ checked, label, onClick }: { checked: boolean; label?: string; onClick?: () => void }) => (
  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: onClick ? 'pointer' : 'default' }} onClick={onClick}>
    {checked ? <MdCheckCircle size={18} color="#0f172a" /> : <MdRadioButtonUnchecked size={18} color="#64748b" />}
    {label && <span style={{ fontSize: '14px', fontWeight: 500, color: '#0f172a' }}>{label}</span>}
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

export default function PrintPhysicalExamination() {
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
          apiFetch<Record<string, any>>(`/api/PhysicalExaminationCertificates/${id}`, {
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
      const blob = await apiFetch<Blob>('/api/PhysicalExaminationCertificates/downloadPhysicalExaminationCertificate', {
        method: 'POST',
        tokenKey: 'admin_token',
        body: JSON.stringify({ id: Number(id) }),
        errorFallback: 'Failed to download certificate PDF.',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Physical_Exam_Certificate_${id}.pdf`;
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
  const signatureUrl = textOrNull(lab?.medical_officer_signature_file_name)
    ? getUploadUrl(lab?.medical_officer_signature_file_name)
    : '';
  const fullAddress = [data.street1, data.street2, data.city, data.state, data.zipcode]
    .filter(Boolean)
    .join(', ');

  const isFit = data.overall_condition === 'Fit';
  const isUnfit = data.overall_condition === 'Unfit';

  return (
    <div className="pec-page">
      <style dangerouslySetInnerHTML={{ __html: PEC_STYLES }} />

      <div className="pec-toolbar no-print">
        <button
          type="button"
          className="pec-print-btn"
          onClick={downloadPdf}
          disabled={downloading}
        >
          <MdDownload size={18} aria-hidden />
          {downloading ? 'Downloading...' : 'Download PDF'}
        </button>
        <span className="pec-toolbar-hint">Optimized digital layout for PDF generation</span>
      </div>

      <div className="pec-sheet">
        {company ? (
          <div className="pec-watermark" aria-hidden>
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
          <h2 style={{ margin: '0', fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>Physical Examination Certificate</h2>
        </div>

        {/* Patient Details */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: '8px' }}>
            <UnderlineField label="Name:" value={data.name} flex={2.5} />
            <UnderlineField label="DOB:" value={formatDate(data.dob, '')} flex={1} />
            <UnderlineField label="Tel #:" value={data.tel} flex={1.5} />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: '8px' }}>
            <UnderlineField label="Address:" value={fullAddress} flex={1} />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: '8px' }}>
            <UnderlineField label="Sex:" value={sexLabel(data.sex)} flex={1} />
            <UnderlineField label="Age:" value={data.age} flex={1} />
            <UnderlineField label="Height:" value={data.height} flex={1} />
            <UnderlineField label="Weight:" value={data.weight} flex={1} />
          </div>
        </div>

        {/* Evaluation Key */}
        <div style={{ marginBottom: '24px', marginLeft: '12px' }}>
          <div style={{ fontWeight: 800, fontSize: '15px', color: '#0f172a', marginBottom: '4px' }}>EVALUATED with corresponding letter</div>
          <div style={{ display: 'flex', gap: '64px', fontWeight: 800, fontSize: '15px', color: '#0f172a' }}>
            <span>NORMAL = N</span>
            <span>ABNORMAL = AB</span>
          </div>
        </div>

        {/* Vitals */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: '8px' }}>
            <UnderlineField label="Blood pressure: -" value={data.bp} width="300px" />
            <UnderlineField label="Pulse: -" value={data.pulse} width="250px" />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: '8px' }}>
            <UnderlineField label="Hearing: Right:" value={data.hearing_right} width="250px" />
            <UnderlineField label="Left:" value={data.hearing_left} width="250px" />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center' }}>
            <UnderlineField label="Vision: Right 20 /" value={data.vision_right} width="180px" />
            <UnderlineField label="Left 20 /" value={data.vision_left} width="180px" />
            <div style={{ display: 'flex', alignItems: 'center', marginLeft: '16px', fontSize: '15px', color: '#1e293b' }}>
              <span style={{ marginRight: '12px' }}>Wear glasses:</span>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <span style={{ marginRight: '6px' }}>Yes</span>
                  <span style={{ borderBottom: '1px solid #334155', width: '40px', textAlign: 'center', fontWeight: 600, color: '#0f172a' }}>
                    {data.wear_glasses ? '✔' : ''}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <span style={{ marginRight: '6px' }}>No</span>
                  <span style={{ borderBottom: '1px solid #334155', width: '40px', textAlign: 'center', fontWeight: 600, color: '#0f172a' }}>
                    {!data.wear_glasses && data.wear_glasses !== null ? '✔' : ''}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* List of Eval Items */}
        <div style={{ paddingLeft: '24px', marginBottom: '32px', fontSize: '15px', color: '#1e293b' }}>
          {EVAL_ITEMS.map((item, idx) => (
            <div key={item.key} style={{ display: 'flex', marginBottom: '12px', alignItems: 'flex-end' }}>
              <div style={{ width: '320px' }}>{idx + 1}. {item.label}</div>
              <div style={{ borderBottom: '1px solid #334155', width: '200px', textAlign: 'center', fontWeight: 600, color: '#0f172a', paddingBottom: '2px' }}>
                {isNormal(data[item.key]) ? 'N' : isAbnormal(data[item.key]) ? 'AB' : (data[item.key] || '')}
              </div>
            </div>
          ))}
          <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column' }}>
            <div>13. Additional Comment, Past medical history, current medications:</div>
            <div style={{ borderBottom: '1px solid #334155', minHeight: '30px', width: '100%', marginTop: '8px', fontWeight: 600, color: '#0f172a', paddingBottom: '4px' }}>{data.additional_comments || ''}</div>
            <div style={{ borderBottom: '1px solid #334155', height: '30px', width: '100%', marginTop: '8px' }}></div>
          </div>

          <div style={{ marginTop: '32px', display: 'flex', alignItems: 'flex-end' }}>
            <div style={{ marginRight: '16px' }}>14. Overall Physical Condition</div>
            <div style={{ display: 'flex', flex: 1, gap: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', width: '150px' }}>
                <span style={{ marginRight: '8px' }}>Fit</span>
                <div style={{ borderBottom: '1px solid #334155', flex: 1, textAlign: 'center', fontWeight: 600, color: '#0f172a', paddingBottom: '2px' }}>{isFit ? '✔' : ''}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', width: '150px' }}>
                <span style={{ marginRight: '8px' }}>Unfit</span>
                <div style={{ borderBottom: '1px solid #334155', flex: 1, textAlign: 'center', fontWeight: 600, color: '#0f172a', paddingBottom: '2px' }}>{isUnfit ? '✔' : ''}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Signature Section */}
        <div style={{ marginTop: '48px', paddingLeft: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', marginBottom: '24px' }}>
            <span style={{ fontSize: '15px', marginRight: '8px', color: '#1e293b' }}>Name/Signature of examining Clinician:</span>
            <div style={{ borderBottom: '1px solid #334155', flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'flex-end', height: '40px', maxWidth: '400px', paddingBottom: '4px' }}>
              <span style={{ fontWeight: 600, color: '#0f172a' }}>{data.clinician_name}</span>
            </div>
            <span style={{ fontSize: '15px', marginLeft: '8px', color: '#1e293b' }}>{data.clinician_specialty || 'MD/PA/NP'}</span>
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

const PEC_STYLES = `
  .pec-page {
    background: #f1f5f9;
    min-height: 100vh;
    padding: 32px 16px 48px;
    font-family: 'Times New Roman', Times, serif;
    color: #0f172a;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  .pec-toolbar {
    max-width: 850px;
    margin: 0 auto 16px;
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
  }
  .pec-print-btn {
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
  .pec-print-btn:hover { background: #0284c7; }
  .pec-print-btn:disabled { opacity: 0.7; cursor: not-allowed; }
  .pec-toolbar-hint { font-size: 13px; color: #64748b; font-weight: 500; }
  
  .pec-sheet {
    position: relative;
    max-width: 850px;
    margin: 0 auto;
    background: #fff;
    padding: 64px;
    border-radius: 4px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
    overflow: hidden;
  }
  .pec-watermark {
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
  .pec-sheet > *:not(.pec-watermark) { position: relative; z-index: 1; }
  
  @media print {
    @page { margin: 0; size: auto; }
    body { background: #fff; }
    .pec-page { padding: 0; background: #fff; }
    .pec-sheet { box-shadow: none; padding: 48px; border-radius: 0; max-width: 100%; }
  }
`;
