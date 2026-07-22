'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { MdDownload } from 'react-icons/md';
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

function Check({ checked }: { checked?: boolean }) {
  return <span className={`pec-check${checked ? ' checked' : ''}`} aria-hidden />;
}

function Underline({ value, className = '' }: { value?: string | null | number; className?: string }) {
  return <span className={`pec-line ${className}`.trim()}>{value != null && value !== '' ? String(value) : '\u00a0'}</span>;
}

const EVAL_ITEMS: { key: string; num: string; label: string }[] = [
  { key: 'eval_head', num: '1.', label: 'Head & Neck' },
  { key: 'eval_nose', num: '2.', label: 'Nose & Sinus' },
  { key: 'eval_mouth', num: '3.', label: 'Mouth & Throat' },
  { key: 'eval_ears', num: '4.', label: 'Ears' },
  { key: 'eval_eyes', num: '5.', label: 'Eyes' },
  { key: 'eval_lungs', num: '6.', label: 'Lungs & Chest' },
  { key: 'eval_heart', num: '7.', label: 'Heart' },
  { key: 'eval_vascular', num: '8.', label: 'Vascular System' },
  { key: 'eval_abdomen', num: '9.', label: 'Abdomen' },
  { key: 'eval_spine', num: '10.', label: 'Spine' },
  { key: 'eval_skin', num: '11.', label: 'Skin' },
  { key: 'eval_neurologic', num: '12.', label: 'Neurologic' },
];

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

  const company = labText(lab?.company_name) || labText(data.b2b_company_name);
  const address = labText(lab?.address) || labText(data.b2b_address);
  const phone = labText(lab?.public_phone_no) || labText(data.b2b_phone);
  const fax = labText(lab?.public_fax) || labText(data.b2b_fax);
  const email = labText(lab?.public_email) || labText(data.b2b_email);
  const labLogoFile = lab?.logo_file || data.b2b_logo;
  const labLogoUrl = textOrNull(labLogoFile) ? getUploadUrl(labLogoFile) : '';
  const showLabLogo = Boolean(labLogoUrl) && !logoFailed;
  const fullAddress = [data.street1, data.street2, data.city, data.state, data.zipcode]
    .filter(Boolean)
    .join(', ');
  const tellLine = [
    phone ? `(Tell) ${phone}` : '',
    fax ? `(Fax) ${fax}` : '',
  ].filter(Boolean).join(' ');

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
        <span className="pec-toolbar-hint">Same layout &amp; lab branding as Download PDF and email attachment</span>
      </div>

      <div className="pec-sheet">
        {company ? (
          <div className="pec-watermark" aria-hidden>
            {company}
          </div>
        ) : null}

        <header className="pec-banner">
          <div className="pec-banner-logo">
            {showLabLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={labLogoUrl}
                alt={`${company} logo`}
                onError={() => setLogoFailed(true)}
              />
            ) : null}
          </div>
          <div className="pec-banner-brand">
            {company ? <div className="pec-banner-company">{company}</div> : null}
            {address ? <div>{address}</div> : null}
            {tellLine ? <div>{tellLine}</div> : null}
            {email ? <div>{email}</div> : null}
          </div>
        </header>

        <div className="pec-rule" />
        <div className="pec-rule pec-rule-thin" />

        <h1 className="pec-title">Physical Examination Certificate</h1>

        <section className="pec-patient">
          <div className="pec-row">
            <span className="pec-label">Name:</span>
            <Underline value={data.name} className="grow" />
            <span className="pec-label">Age:</span>
            <Underline value={data.age} className="xs" />
            <span className="pec-label">Sex:</span>
            <Underline value={sexLabel(data.sex)} className="sm" />
          </div>

          <div className="pec-row">
            <span className="pec-label">Address:</span>
            <Underline value={fullAddress} className="grow" />
            <span className="pec-label">Tel #:</span>
            <Underline value={data.tel} className="sm" />
          </div>

          <div className="pec-row wrap">
            <span className="pec-label">Height:</span>
            <Underline value={data.height} className="xs" />
            <span className="pec-label">Weight:</span>
            <Underline value={data.weight} className="xs" />
            <span className="pec-label">B.P:</span>
            <Underline value={data.bp} className="sm" />
            <span className="pec-label">Pulse:</span>
            <Underline value={data.pulse} className="sm" />
          </div>

          <div className="pec-row wrap">
            <span className="pec-label">Hearing: Right</span>
            <Underline value={data.hearing_right} className="xs" />
            <span className="pec-label">Left</span>
            <Underline value={data.hearing_left} className="xs" />
            <span className="pec-label">Vision: Right</span>
            <Underline value={data.vision_right} className="xs" />
            <span className="pec-label">Left</span>
            <Underline value={data.vision_left} className="xs" />
          </div>

          <div className="pec-row">
            <span className="pec-label">Wear Glasses:</span>
            <Check checked={!!data.wear_glasses} />
            <span className="pec-inline">Yes</span>
            <Check checked={!data.wear_glasses} />
            <span className="pec-inline">No</span>
          </div>
        </section>

        <div className="pec-eval-head">
          <span>CLINICAL EVALUATION</span>
          <span className="pec-eval-col">NORMAL</span>
          <span className="pec-eval-col">ABNORMAL</span>
        </div>

        <div className="pec-eval-list">
          {EVAL_ITEMS.map(item => (
            <div key={item.key} className="pec-eval-row">
              <span className="pec-num">{item.num}</span>
              <span className="pec-eval-label">{item.label}</span>
              <span className="pec-eval-mark">{isNormal(data[item.key]) ? <Check checked /> : null}</span>
              <span className="pec-eval-mark">{isAbnormal(data[item.key]) ? <Check checked /> : null}</span>
            </div>
          ))}
        </div>

        <div className="pec-additional">
          <div className="pec-row">
            <span className="pec-num">13.</span>
            <span className="pec-label">
              Additional Comment, Past medical history, current medications:
            </span>
          </div>
          <div className="pec-blank-line">{data.additional_comments || '\u00a0'}</div>
        </div>

        <div className="pec-row pec-overall">
          <span className="pec-num">14.</span>
          <span className="pec-label">Overall Physical Condition</span>
          <Check checked={data.overall_condition === 'Fit'} />
          <span className="pec-inline">Fit</span>
          <Check checked={data.overall_condition === 'Unfit'} />
          <span className="pec-inline">Unfit</span>
        </div>

        <section className="pec-digital-auth">
          <div className="pec-digital-head">Electronically Authenticated Certificate</div>
          <div className="pec-digital-body">
            <div className="pec-digital-col">
              <div className="pec-digital-label">Digitally Signed By</div>
              <div className="pec-digital-value">{data.clinician_name || "-"}</div>
              <div className="pec-digital-sub">{data.clinician_specialty || "MD / PA / NP"}</div>
            </div>
            <div className="pec-digital-col">
              <div className="pec-digital-label">Date of Examination</div>
              <div className="pec-digital-value">{formatDate(data.date_of_examination, "") || "-"}</div>
              <div className="pec-digital-label pec-digital-gap">Clinician Address</div>
              <div className="pec-digital-sub">{data.clinician_address || "-"}</div>
            </div>
          </div>
          <div className="pec-digital-note">This document is electronically authenticated. No physical signature is required.</div>
        </section>
      </div>
    </div>
  );
}

const PEC_STYLES = `
  .pec-page {
    background: #e8eef5;
    min-height: 100vh;
    padding: 24px 16px 48px;
    font-family: 'Times New Roman', Times, serif;
    color: #111;
  }
  .pec-toolbar {
    max-width: 820px;
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
    background: #0f766e;
    color: #fff;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-family: Arial, sans-serif;
    font-weight: 600;
    cursor: pointer;
  }
  .pec-print-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
  .pec-toolbar-hint {
    font-family: Arial, sans-serif;
    font-size: 13px;
    color: #64748b;
  }
  .pec-sheet {
    position: relative;
    max-width: 820px;
    min-height: 11in;
    margin: 0 auto;
    background: #fff;
    padding: 24px 40px 28px;
    box-shadow: 0 8px 28px rgba(15, 23, 42, 0.12);
    overflow: visible;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
  }
  .pec-watermark {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 72px;
    font-weight: 700;
    letter-spacing: 8px;
    color: rgba(100, 116, 139, 0.08);
    transform: rotate(-28deg);
    pointer-events: none;
    z-index: 0;
    white-space: nowrap;
  }
  .pec-sheet > *:not(.pec-watermark) {
    position: relative;
    z-index: 1;
  }
  .pec-banner {
    display: flex;
    align-items: center;
    gap: 18px;
    margin-bottom: 10px;
  }
  .pec-banner-logo img {
    height: 64px;
    width: auto;
    max-width: 130px;
    object-fit: contain;
  }
  .pec-banner-brand {
    flex: 1;
    min-width: 0;
    text-align: right;
    font-size: 12px;
    line-height: 1.45;
  }
  .pec-banner-company {
    font-weight: 700;
    font-size: 14px;
    margin-bottom: 2px;
  }
  .pec-wordmark {
    font-size: 30px;
    font-weight: 800;
    letter-spacing: 2px;
    line-height: 1;
    margin-bottom: 4px;
    font-family: Arial Black, Arial, sans-serif;
  }
  .pec-wordmark-metro {
    color: transparent;
    -webkit-text-stroke: 1.5px #1e293b;
  }
  .pec-wordmark-lab { color: #c9a227; }
  .pec-wordmark-lab-name {
    font-size: 20px;
    font-weight: 700;
    margin-bottom: 4px;
  }
  .pec-banner-meta {
    font-size: 11px;
    line-height: 1.4;
    color: #222;
  }
  .pec-rule {
    height: 0;
    border-top: 2px solid #6c9cd4;
    margin: 8px 0 0;
  }
  .pec-rule-thin {
    border-top-width: 1px;
    margin-top: 3px;
    margin-bottom: 12px;
  }
  .pec-org {
    text-align: center;
    font-size: 12.5px;
    line-height: 1.45;
    margin-bottom: 12px;
  }
  .pec-org-name { font-weight: 700; font-size: 14px; }
  .pec-title {
    text-align: center;
    font-size: 18px;
    font-weight: 700;
    margin: 4px 0 12px;
  }
  .pec-patient { font-size: 13px; }
  .pec-row {
    display: flex;
    align-items: flex-end;
    gap: 8px;
    margin-bottom: 8px;
    flex-wrap: nowrap;
  }
  .pec-row.wrap { flex-wrap: wrap; }
  .pec-overall { margin-top: 8px; margin-bottom: 0; }
  .pec-label { white-space: nowrap; flex-shrink: 0; }
  .pec-inline { margin-right: 10px; }
  .pec-line {
    display: inline-block;
    border-bottom: 1px solid #111;
    min-height: 1.2em;
    padding: 0 6px 2px;
    font-weight: 600;
    font-family: Arial, sans-serif;
    font-size: 12px;
    text-align: center;
    vertical-align: bottom;
  }
  .pec-line.grow { flex: 1; min-width: 80px; }
  .pec-line.mid { flex: 1; min-width: 100px; max-width: 220px; }
  .pec-line.sm { min-width: 70px; flex: 0 1 110px; }
  .pec-line.xs { min-width: 48px; flex: 0 0 56px; }
  .pec-line.sig { min-width: 160px; flex: 1; }
  .pec-check {
    display: inline-block;
    width: 13px;
    height: 13px;
    border: 1.5px solid #111;
    flex-shrink: 0;
    margin-top: 2px;
    position: relative;
    background: #fff;
  }
  .pec-check.checked::after {
    content: '✓';
    position: absolute;
    top: -4px;
    left: 0.5px;
    font-size: 14px;
    font-weight: 700;
    line-height: 1;
  }
  .pec-eval-head {
    display: grid;
    grid-template-columns: 1fr 80px 90px;
    font-weight: 700;
    font-size: 12.5px;
    margin: 10px 0 6px;
    gap: 8px;
  }
  .pec-eval-col { text-align: center; }
  .pec-eval-list { font-size: 13px; }
  .pec-eval-row {
    display: grid;
    grid-template-columns: 28px 1fr 80px 90px;
    align-items: center;
    margin-bottom: 4px;
    gap: 4px;
  }
  .pec-num { width: 28px; flex-shrink: 0; }
  .pec-eval-label { }
  .pec-eval-mark {
    text-align: center;
    font-weight: 700;
    font-family: Arial, sans-serif;
    display: flex;
    justify-content: center;
  }
  .pec-additional { margin-top: 6px; }
  .pec-blank-line {
    border-bottom: 1px solid #111;
    min-height: 18px;
    margin: 6px 0 0 28px;
    font-family: Arial, sans-serif;
    font-size: 12px;
    font-weight: 600;
    padding: 0 4px;
  }

  .pec-digital-auth {
    margin-top: auto;
    border: 1.5px solid #1e40af;
    border-radius: 4px;
    overflow: hidden;
    font-family: Arial, sans-serif;
  }
  .pec-digital-head {
    background: #eff6ff;
    color: #1e40af;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-align: center;
    padding: 6px 8px;
    text-transform: uppercase;
  }
  .pec-digital-body {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    padding: 12px 14px;
    font-size: 12px;
  }
  .pec-digital-label { font-size: 10px; color: #555; margin-bottom: 2px; }
  .pec-digital-gap { margin-top: 8px; }
  .pec-digital-value { font-size: 13px; font-weight: 700; color: #111; }
  .pec-digital-sub { font-size: 11px; color: #333; margin-top: 2px; }
  .pec-digital-note {
    border-top: 1px solid #dbeafe;
    padding: 8px 12px;
    font-size: 10px;
    font-style: italic;
    color: #666;
    text-align: center;
  }

  .pec-sig-wrap {
    position: relative;
    flex: 1;
    display: flex;
    align-items: flex-end;
    min-width: 140px;
  }
  .pec-sig-img {
    position: absolute;
    bottom: 4px;
    left: 50%;
    transform: translateX(-50%);
    max-height: 36px;
    max-width: 160px;
    object-fit: contain;
    pointer-events: none;
  }
  .pec-specialty { white-space: nowrap; font-size: 13px; }
  .pec-footer {
    text-align: center;
    margin-top: 28px;
    font-weight: 700;
    font-size: 13px;
  }
`;
