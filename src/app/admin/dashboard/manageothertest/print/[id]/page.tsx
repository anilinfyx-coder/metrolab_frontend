'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { MdDownload } from 'react-icons/md';
import { apiFetch, toastApiError, toastApiSuccess, getUploadUrl } from '../../../../../../lib/api';
import { formatDate, formatDateTime } from '../../../../../utils/dateFormat';
import PageLoader from '../../../../../components/PageLoader';
import { getStoredUser } from '../../../../../components/portalConfig';

type LabBranding = {
  company_name?: string | null;
  tagline?: string | null;
  address?: string | null;
  public_phone_no?: string | null;
  public_fax?: string | null;
  public_email?: string | null;
  logo_file?: string | null;
  medical_officer_name?: string | null;
};

function textOrNull(value: unknown): string | null {
  if (value == null) return null;
  const text = String(value).trim();
  if (!text || text.toLowerCase() === 'null' || text.toLowerCase() === 'undefined') return null;
  return text;
}

function labText(v: unknown): string {
  return textOrNull(v) || '';
}

function showFlag(labTest: Record<string, unknown> | null | undefined, flag: string) {
  return !!(labTest && labTest[flag]);
}

export default function PrintLabTestReport() {
  const { id } = useParams();
  const [report, setReport] = useState<Record<string, any> | null>(null);
  const [patient, setPatient] = useState<Record<string, any> | null>(null);
  const [lab, setLab] = useState<LabBranding | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    (async () => {
      try {
        const details = await apiFetch<Record<string, any>>(
          '/api/LabTestCategoryReport/getLabTestCategoryReportDetails',
          {
            method: 'POST',
            tokenKey: 'admin_token',
            body: JSON.stringify({ id: Number(id) }),
            errorFallback: 'Report not found.',
            silent: true,
          },
        );

        const profile = await (async () => {
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
        })();

        let patientRow = null;
        if (details?.patient_id) {
          try {
            patientRow = await apiFetch<Record<string, any>>(`/api/Patient/${details.patient_id}`, {
              tokenKey: 'admin_token',
              silent: true,
            });
          } catch {
            patientRow = null;
          }
        }

        if (cancelled) return;
        setReport(details);
        setPatient(patientRow);
        setLab(profile);
        setLogoFailed(false);
      } catch (err) {
        if (!cancelled) {
          setReport(null);
          toastApiError(err, 'Failed to load report.');
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
      const blob = await apiFetch<Blob>('/api/LabTestCategoryReport/downloadLabTestCategoryReport', {
        method: 'POST',
        tokenKey: 'admin_token',
        body: JSON.stringify({ id: Number(id) }),
        errorFallback: 'Failed to download report PDF.',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${report?.uid || `Report-${id}`}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toastApiSuccess('Report PDF downloaded.');
    } catch {
      /* toasted */
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return <PageLoader message="Loading report..." size="lg" />;
  if (!report) return <div style={{ padding: 24, textAlign: 'center' }}>Report not found</div>;

  const labTest = report.labTest as Record<string, unknown> | null;
  const params: Record<string, any>[] = report.testResultParameterList || [];
  const company = labText(lab?.company_name) || labText(report.b2b_company_name);
  const address = labText(lab?.address) || labText(report.b2b_address);
  const phone = labText(lab?.public_phone_no) || labText(report.b2b_phone);
  const fax = labText(lab?.public_fax) || labText(report.b2b_fax);
  const email = labText(lab?.public_email) || labText(report.b2b_email);
  const tellLine = [phone ? `(Tell) ${phone}` : '', fax ? `(Fax) ${fax}` : ''].filter(Boolean).join(' ');
  const labLogoFile = lab?.logo_file || report.b2b_logo;
  const labLogoUrl = textOrNull(labLogoFile) ? getUploadUrl(labLogoFile) : '';
  const showLabLogo = Boolean(labLogoUrl) && !logoFailed;

  const mroFields = [
    { flag: 'show_final_result', label: 'Final Result', value: report.final_result },
    { flag: 'show_test_remark', label: 'Remark', value: report.test_remark },
    { flag: 'show_final_result_disposition', label: 'Final Result Disposition', value: report.final_result_disposition },
    { flag: 'show_final_remark', label: 'Final Remark', value: report.final_remark },
  ].filter((f) => showFlag(labTest, f.flag));

  return (
    <div className="ltr-page">
      <style dangerouslySetInnerHTML={{ __html: LTR_STYLES }} />

      <div className="ltr-toolbar no-print">
        <button type="button" className="ltr-print-btn" onClick={downloadPdf} disabled={downloading}>
          <MdDownload size={18} aria-hidden />
          {downloading ? 'Downloading...' : 'Download PDF'}
        </button>
        <span className="ltr-toolbar-hint">Same layout &amp; lab branding as Download PDF and email attachment</span>
      </div>

      <div className="ltr-sheet">
        <header className="ltr-banner">
          <div className="ltr-banner-logo">
            {showLabLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={labLogoUrl} alt={`${company} logo`} onError={() => setLogoFailed(true)} />
            ) : null}
          </div>
          <div className="ltr-banner-brand">
            {company ? <div className="ltr-banner-company">{company}</div> : null}
            {address ? <div>{address}</div> : null}
            {tellLine ? <div>{tellLine}</div> : null}
            {email ? <div>{email}</div> : null}
          </div>
        </header>

        <div className="ltr-rule" />
        <div className="ltr-rule ltr-rule-thin" />

        <h1 className="ltr-title">{report.lab_test_name || 'Lab Test Report'}</h1>
        <div className="ltr-printed">Report Printed On: {formatDateTime(new Date())}</div>

        <hr className="ltr-hr" />

        <div className="ltr-meta-grid">
          <div>
            <div><strong>UID:</strong> #{report.uid || report.id}</div>
            {showFlag(labTest, 'show_test_performed_by') ? (
              <div><strong>Test Performed by:</strong> {report.test_performed_by || '—'}</div>
            ) : null}
            <div><strong>Medical Officer:</strong> {labText(lab?.medical_officer_name) || '—'}</div>
          </div>
          <div>
            {showFlag(labTest, 'show_reason_for_test') ? (
              <div><strong>Reason for Test:</strong> {report.reason_for_test || '—'}</div>
            ) : null}
            {showFlag(labTest, 'show_report_status') ? (
              <div><strong>Reported Status:</strong> {report.report_status || '—'}</div>
            ) : null}
            {showFlag(labTest, 'show_regulation') ? (
              <div><strong>Regulation:</strong> {report.regulation || '—'}</div>
            ) : null}
          </div>
        </div>

        {patient ? (
          <section className="ltr-section">
            <div className="ltr-meta-grid">
              <div>
                <div><strong>Patient/Donor Name:</strong> {patient.name || '—'}</div>
                <div><strong>Patient/Donor Date Of Birth:</strong> {formatDate(patient.dob, '—')}</div>
                <div><strong>Patient/Donor Phone No:</strong> {patient.mobile || '—'}</div>
                <div>
                  <strong>Patient/Donor Address:</strong>{' '}
                  {[patient.street1, patient.street2, patient.city, patient.state, patient.zipcode ? `ZipCode: ${patient.zipcode}` : null]
                    .filter(Boolean)
                    .join(', ') || '—'}
                </div>
              </div>
              <div>
                <div><strong>Patient&apos;s SSN:</strong> {(patient as any).ssn || ''}</div>
                <div><strong>Patient/Donor Gender:</strong> {patient.gender === 1 ? 'Male' : patient.gender === 2 ? 'Female' : patient.gender || '—'}</div>
              </div>
            </div>
          </section>
        ) : null}

        {params.length > 0 ? (
          <section className="ltr-section">
            <h2 className="ltr-section-title">Drugs Tested</h2>
            <table className="ltr-table">
              <thead>
                <tr>
                  <th>Drug Name</th>
                  <th>Result</th>
                  <th>Laboratory Screening Cutoff*</th>
                  <th>Laboratory Confirmation Cutoff*</th>
                </tr>
              </thead>
              <tbody>
                {params.map((p) => (
                  <tr key={p.report_request_parameters_id || p.id}>
                    <td>{p.label || p.name || '—'}</td>
                    <td>{p.value || '—'}</td>
                    <td>{p.screening_cutoff ?? '—'}{p.unit_text ? ` ${p.unit_text}` : ''}</td>
                    <td>{p.confirmation_cutoff ?? '—'}{p.unit_text ? ` ${p.unit_text}` : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : null}

        {mroFields.length > 0 ? (
          <section className="ltr-section">
            <h2 className="ltr-section-title">Medical Review Officer</h2>
            {mroFields.map((f) => (
              <div key={f.flag} className="ltr-mro-row">
                <strong>{f.label}:</strong> {f.value || '—'}
              </div>
            ))}
          </section>
        ) : null}

        <p className="ltr-footnote">* Represents laboratory screening and confirmation values</p>
      </div>
    </div>
  );
}

const LTR_STYLES = `
  .ltr-page { background: #e8eef5; min-height: 100vh; padding: 24px 16px 48px; font-family: 'Times New Roman', Times, serif; color: #111; }
  .ltr-toolbar { max-width: 900px; margin: 0 auto 16px; display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
  .ltr-print-btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 18px; background: #0f766e; color: #fff; border: none; border-radius: 6px; font-size: 14px; font-family: Arial, sans-serif; font-weight: 600; cursor: pointer; }
  .ltr-print-btn:disabled { opacity: 0.7; cursor: not-allowed; }
  .ltr-toolbar-hint { font-family: Arial, sans-serif; font-size: 13px; color: #64748b; }
  .ltr-sheet { max-width: 900px; margin: 0 auto; background: #fff; padding: 32px 44px 40px; box-shadow: 0 8px 28px rgba(15, 23, 42, 0.12); }
  .ltr-banner { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; margin-bottom: 10px; }
  .ltr-banner-logo img { height: 72px; width: auto; max-width: 140px; object-fit: contain; }
  .ltr-banner-brand { flex: 1; text-align: right; font-size: 13px; line-height: 1.45; }
  .ltr-banner-company { font-weight: 700; font-size: 14px; margin-bottom: 2px; }
  .ltr-rule { height: 0; border-top: 2px solid #6c9cd4; margin: 8px 0 0; }
  .ltr-rule-thin { border-top-width: 1px; margin-top: 3px; margin-bottom: 16px; }
  .ltr-title { text-align: center; font-size: 20px; font-weight: 700; margin: 8px 0 8px; }
  .ltr-printed { text-align: right; font-size: 12px; font-family: Arial, sans-serif; margin-bottom: 12px; }
  .ltr-hr { border: none; border-top: 1px solid #111; margin: 0 0 16px; }
  .ltr-meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 24px; font-size: 13px; font-family: Arial, sans-serif; margin-bottom: 20px; }
  .ltr-section { margin-bottom: 24px; }
  .ltr-section-title { font-size: 14px; color: #1a5f9e; margin: 0 0 12px; font-family: Arial, sans-serif; }
  .ltr-table { width: 100%; border-collapse: collapse; font-family: Arial, sans-serif; font-size: 12px; }
  .ltr-table th, .ltr-table td { border: 1px solid #111; padding: 6px 8px; text-align: left; }
  .ltr-table th { background: #f8fafc; font-weight: 700; }
  .ltr-mro-row { font-family: Arial, sans-serif; font-size: 13px; margin-bottom: 8px; }
  .ltr-footnote { font-size: 11px; font-family: Arial, sans-serif; color: #444; margin-top: 24px; }
`;
