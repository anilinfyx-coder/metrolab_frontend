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

function isMale(sex: unknown) {
  return sex === 1 || sex === '1' || String(sex).toLowerCase() === 'male';
}

function isFemale(sex: unknown) {
  return sex === 2 || sex === '2' || String(sex).toLowerCase() === 'female';
}

function Check({ checked }: { checked?: boolean }) {
  return <span className={`ahc-check${checked ? ' checked' : ''}`} aria-hidden />;
}

function Underline({ value, className = '' }: { value?: string | null; className?: string }) {
  return <span className={`ahc-line ${className}`.trim()}>{value || '\u00a0'}</span>;
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

  const company = labText(lab?.company_name) || labText(data.b2b_company_name);
  const address = labText(lab?.address) || labText(data.b2b_address);
  const phone = labText(lab?.public_phone_no) || labText(data.b2b_phone);
  const fax = labText(lab?.public_fax) || labText(data.b2b_fax);
  const email = labText(lab?.public_email) || labText(data.b2b_email);
  const labLogoFile = lab?.logo_file || data.b2b_logo;
  const labLogoUrl = textOrNull(labLogoFile) ? getUploadUrl(labLogoFile) : '';
  const showLabLogo = Boolean(labLogoUrl) && !logoFailed;
  const tellLine = [
    phone ? `(Tell) ${phone}` : '',
    fax ? `(Fax) ${fax}` : '',
  ].filter(Boolean).join(' ');

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
        <span className="ahc-toolbar-hint">Same layout &amp; lab branding as Download PDF and email attachment</span>
      </div>

      <div className="ahc-sheet">
        {company ? (
          <div className="ahc-watermark" aria-hidden>
            {company}
          </div>
        ) : null}

        {/* Header: logo left, lab details right */}
        <header className="ahc-banner">
          <div className="ahc-banner-logo">
            {showLabLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={labLogoUrl}
                alt={`${company} logo`}
                onError={() => setLogoFailed(true)}
              />
            ) : null}
          </div>
          <div className="ahc-banner-brand">
            {company ? <div className="ahc-banner-company">{company}</div> : null}
            {address ? <div>{address}</div> : null}
            {tellLine ? <div>{tellLine}</div> : null}
            {email ? <div>{email}</div> : null}
          </div>
        </header>

        <div className="ahc-rule" />
        <div className="ahc-rule ahc-rule-thin" />

        <h1 className="ahc-title">Adult Health Certificate</h1>

        {/* Patient */}
        <section className="ahc-patient">
          <div className="ahc-row">
            <span className="ahc-label">Name:</span>
            <Underline value={data.name} className="grow" />
            <span className="ahc-label ahc-sex-label">Sex:</span>
            <Check checked={isMale(data.sex)} />
            <span className="ahc-inline">Male</span>
            <Check checked={isFemale(data.sex)} />
            <span className="ahc-inline">Female</span>
          </div>

          <div className="ahc-row">
            <span className="ahc-label">DOB:</span>
            <Underline value={formatDate(data.dob, '')} className="mid" />
            <span className="ahc-label">Tel #:</span>
            <Underline value={data.tel} className="mid" />
          </div>

          <div className="ahc-address-block">
            <div className="ahc-row">
              <span className="ahc-label">Address:</span>
              <Underline value={data.street1} className="addr-street" />
              <Underline value={data.street2} className="addr-apt" />
              <Underline value={data.city} className="addr-city" />
              <Underline value={data.state} className="addr-state" />
              <Underline value={data.zipcode} className="addr-zip" />
            </div>
            <div className="ahc-addr-guides">
              <span className="g-street">Street Name/Number</span>
              <span className="g-apt">Apt#(if applicable)</span>
              <span className="g-city">City</span>
              <span className="g-state">State</span>
              <span className="g-zip">Zip code</span>
            </div>
          </div>
        </section>

        <p className="ahc-certify">I have examined the above named person and certify that he/she is:</p>

        <div className="ahc-check-list">
          <div className="ahc-check-item">
            <span className="ahc-num">1.</span>
            <Check checked={!!data.free_from_disease} />
            <span>Free from disease in communicable form.</span>
          </div>
          <div className="ahc-check-item">
            <span className="ahc-num">2.</span>
            <Check checked={!!data.satisfactory_physical} />
            <span>
              In satisfactory physical condition, this will permit, close association with children/elderly
              without danger to them.
            </span>
          </div>
        </div>

        <p className="ahc-intro">
          In addition to a general physical examination, the following test has been done:
        </p>

        <div className="ahc-tests">
          <div className="ahc-row wrap">
            <span className="ahc-label">Tuberculin test (check one):</span>
            <Check checked={data.tuberculin_test_type === 'Tine'} />
            <span className="ahc-inline">Tine</span>
            <Check checked={data.tuberculin_test_type === 'PPD'} />
            <span className="ahc-inline">PPD</span>
          </div>

          <div className="ahc-row wrap">
            <span className="ahc-label">Date planted:</span>
            <Underline value={formatDate(data.tuberculin_date_planted, '')} className="sm" />
            <span className="ahc-label">Date read:</span>
            <Underline value={formatDate(data.tuberculin_date_read, '')} className="sm" />
            <span className="ahc-label">Result:</span>
            <Underline value={data.tuberculin_result} className="sm grow" />
          </div>

          <div className="ahc-row wrap">
            <Check checked={!!(data.chest_xray_date || data.chest_xray_result)} />
            <span className="ahc-label">Chest x-ray:</span>
            <span className="ahc-label">Date:</span>
            <Underline value={formatDate(data.chest_xray_date, '')} className="sm" />
            <span className="ahc-label">Result:</span>
            <Underline value={data.chest_xray_result} className="sm grow" />
          </div>

          <div className="ahc-additional">
            <div className="ahc-row">
              <Check checked={!!data.additional_info} />
              <span className="ahc-label">
                Additional information, Past Medical History, Current Medications:
              </span>
            </div>
            <div className="ahc-blank-lines">
              <div className="ahc-blank-line">{data.additional_info || ''}</div>
              <div className="ahc-blank-line" />
            </div>
          </div>
        </div>

        <section className="ahc-digital-auth">
          <div className="ahc-digital-head">Electronically Authenticated Certificate</div>
          <div className="ahc-digital-body">
            <div className="ahc-digital-col">
              <div className="ahc-digital-label">Digitally Signed By</div>
              <div className="ahc-digital-value">{data.clinician_name || "-"}</div>
              <div className="ahc-digital-sub">{data.clinician_specialty || "MD / PA / NP"}</div>
            </div>
            <div className="ahc-digital-col">
              <div className="ahc-digital-label">Date of Examination</div>
              <div className="ahc-digital-value">{formatDate(data.date_of_examination, "") || "-"}</div>
              <div className="ahc-digital-label ahc-digital-gap">Clinician Address</div>
              <div className="ahc-digital-sub">{data.clinician_address || "-"}</div>
            </div>
          </div>
          <div className="ahc-digital-note">This document is electronically authenticated. No physical signature is required.</div>
        </section>
      </div>
    </div>
  );
}

const AHC_STYLES = `
  .ahc-page {
    background: #e8eef5;
    min-height: 100vh;
    padding: 24px 16px 48px;
    font-family: 'Times New Roman', Times, serif;
    color: #111;
  }
  .ahc-toolbar {
    max-width: 820px;
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
    background: #0f766e;
    color: #fff;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-family: Arial, sans-serif;
    font-weight: 600;
    cursor: pointer;
  }
  .ahc-print-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
  .ahc-toolbar-hint {
    font-family: Arial, sans-serif;
    font-size: 13px;
    color: #64748b;
  }
  .ahc-sheet {
    position: relative;
    max-width: 820px;
    margin: 0 auto;
    background: #fff;
    padding: 32px 44px 40px;
    box-shadow: 0 8px 28px rgba(15, 23, 42, 0.12);
    overflow: visible;
  }
  .ahc-watermark {
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
  .ahc-sheet > *:not(.ahc-watermark) {
    position: relative;
    z-index: 1;
  }
  .ahc-banner {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 18px;
    margin-bottom: 12px;
  }
  .ahc-banner-logo {
    flex-shrink: 0;
  }
  .ahc-banner-brand {
    flex: 1;
    min-width: 0;
    text-align: right;
    font-size: 13px;
    line-height: 1.45;
  }
  .ahc-banner-company {
    font-weight: 700;
    font-size: 14px;
  }
  .ahc-banner-logo img {
    height: 72px;
    width: auto;
    max-width: 140px;
    object-fit: contain;
  }
  .ahc-wordmark {
    font-size: 34px;
    font-weight: 800;
    letter-spacing: 2px;
    line-height: 1;
    margin-bottom: 4px;
    font-family: Arial Black, Arial, sans-serif;
  }
  .ahc-wordmark-metro {
    color: transparent;
    -webkit-text-stroke: 1.5px #1e293b;
  }
  .ahc-wordmark-lab {
    color: #c9a227;
    -webkit-text-stroke: 0;
  }
  .ahc-wordmark-lab-name {
    font-size: 22px;
    font-weight: 700;
    margin-bottom: 4px;
  }
  .ahc-banner-meta {
    font-size: 11px;
    line-height: 1.4;
    color: #222;
  }
  .ahc-rule {
    height: 0;
    border-top: 2px solid #6c9cd4;
    margin: 8px 0 0;
  }
  .ahc-rule-thin {
    border-top-width: 1px;
    margin-top: 3px;
    margin-bottom: 16px;
  }
  .ahc-org {
    text-align: center;
    font-size: 13px;
    line-height: 1.5;
    margin-bottom: 18px;
  }
  .ahc-org-name {
    font-weight: 700;
    font-size: 15px;
  }
  .ahc-title {
    text-align: center;
    font-size: 20px;
    font-weight: 700;
    margin: 8px 0 24px;
  }
  .ahc-patient,
  .ahc-tests,
  .ahc-signature {
    font-size: 13.5px;
  }
  .ahc-row {
    display: flex;
    align-items: flex-end;
    gap: 8px;
    margin-bottom: 14px;
    flex-wrap: nowrap;
  }
  .ahc-row.wrap {
    flex-wrap: wrap;
  }
  .ahc-label {
    white-space: nowrap;
    flex-shrink: 0;
  }
  .ahc-inline {
    margin-right: 10px;
  }
  .ahc-sex-label {
    margin-left: 18px;
  }
  .ahc-line {
    display: inline-block;
    border-bottom: 1px solid #111;
    min-height: 1.2em;
    padding: 0 6px 2px;
    font-weight: 600;
    font-family: Arial, sans-serif;
    font-size: 12.5px;
    text-align: center;
    vertical-align: bottom;
  }
  .ahc-line.grow { flex: 1; min-width: 120px; }
  .ahc-line.mid { flex: 1; min-width: 100px; max-width: 220px; }
  .ahc-line.sm { min-width: 90px; flex: 0 1 140px; }
  .ahc-line.sig { min-width: 180px; flex: 1; }
  .ahc-line.addr-street { flex: 2.2; min-width: 0; }
  .ahc-line.addr-apt { flex: 1.1; min-width: 0; }
  .ahc-line.addr-city { flex: 1.1; min-width: 0; }
  .ahc-line.addr-state { flex: 0.7; min-width: 0; }
  .ahc-line.addr-zip { flex: 0.8; min-width: 0; }
  .ahc-address-block { margin-bottom: 14px; }
  .ahc-addr-guides {
    display: grid;
    grid-template-columns: 2.2fr 1.1fr 1.1fr 0.7fr 0.8fr;
    gap: 8px;
    margin-left: 62px;
    margin-top: 4px;
    font-size: 9.5px;
    color: #555;
    text-align: center;
  }
  .ahc-certify {
    margin: 18px 0 12px;
    font-size: 13.5px;
  }
  .ahc-check-list {
    margin: 0 0 16px 8px;
  }
  .ahc-check-item {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    margin-bottom: 10px;
    line-height: 1.4;
  }
  .ahc-num {
    width: 18px;
    flex-shrink: 0;
  }
  .ahc-check {
    display: inline-block;
    width: 13px;
    height: 13px;
    border: 1.5px solid #111;
    flex-shrink: 0;
    margin-top: 2px;
    position: relative;
    background: #fff;
  }
  .ahc-check.checked::after {
    content: '✓';
    position: absolute;
    top: -4px;
    left: 0.5px;
    font-size: 14px;
    font-weight: 700;
    line-height: 1;
  }
  .ahc-intro {
    margin: 12px 0 14px;
    font-size: 13.5px;
  }
  .ahc-additional { margin-top: 8px; }
  .ahc-blank-lines { margin: 10px 0 0 22px; }
  .ahc-blank-line {
    border-bottom: 1px solid #111;
    min-height: 24px;
    margin-bottom: 12px;
    font-family: Arial, sans-serif;
    font-size: 12.5px;
    font-weight: 600;
    padding: 0 4px;
  }

  .ahc-digital-auth {
    margin-top: 28px;
    border: 1.5px solid #1e40af;
    border-radius: 4px;
    overflow: hidden;
    font-family: Arial, sans-serif;
  }
  .ahc-digital-head {
    background: #eff6ff;
    color: #1e40af;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-align: center;
    padding: 6px 8px;
    text-transform: uppercase;
  }
  .ahc-digital-body {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    padding: 12px 14px;
    font-size: 12px;
  }
  .ahc-digital-label {
    font-size: 10px;
    color: #555;
    margin-bottom: 2px;
  }
  .ahc-digital-gap { margin-top: 8px; }
  .ahc-digital-value {
    font-size: 13px;
    font-weight: 700;
    color: #111;
  }
  .ahc-digital-sub {
    font-size: 11px;
    color: #333;
    margin-top: 2px;
  }
  .ahc-digital-note {
    border-top: 1px solid #dbeafe;
    padding: 8px 12px;
    font-size: 10px;
    font-style: italic;
    color: #666;
    text-align: center;
  }

  .ahc-sig-wrap {
    position: relative;
    flex: 1;
    display: flex;
    align-items: flex-end;
    min-width: 160px;
  }
  .ahc-sig-img {
    position: absolute;
    bottom: 4px;
    left: 50%;
    transform: translateX(-50%);
    max-height: 36px;
    max-width: 160px;
    object-fit: contain;
    pointer-events: none;
  }
  .ahc-specialty {
    white-space: nowrap;
    font-size: 13px;
  }
  .ahc-specialty .on {
    font-weight: 700;
    text-decoration: underline;
  }
  .ahc-footer {
    text-align: center;
    margin-top: 36px;
    font-weight: 700;
    font-size: 13px;
  }
`;
