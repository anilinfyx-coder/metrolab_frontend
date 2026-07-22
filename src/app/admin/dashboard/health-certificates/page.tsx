'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import TopNav from '../../../components/TopNav';
import ListingTable, { ActionIcons, ListingColumn, ListingHeaderActions } from '../../../components/ListingTable';
import { FormGroup, FieldError } from '../../../components/FormField';
import { useConfirm } from '../../../components/ConfirmModal';
import { formatDate } from '../../../utils/dateFormat';
import { apiFetch, toastApiError, toastApiSuccess } from '../../../../lib/api';
import { buildPageQuery, isPaginatedResult, PaginatedResult } from '../../../../lib/pagination';
import { createInvalidHandler, fieldStyle, formResolver } from '../../../../lib/formHelpers';
import {
  adultHealthCertificateSchema,
  type AdultHealthCertificateFormValues,
} from '../../../../lib/schemas';

interface HealthCertificate {
  id: number;
  patient_id: number;
  name?: string;
  patient_email?: string;
  patient_uid?: string;
  date_of_examination?: string;
  clinician_name?: string;
}

interface PatientSearchResult {
  id: number;
  name?: string;
  uid?: string;
  email?: string;
}

const CERT_QUERY_KEY = ['adultHealthCertificates'] as const;

const emptyForm: AdultHealthCertificateFormValues = {
  patient_id: '',
  free_from_disease: false,
  satisfactory_physical: false,
  tuberculin_test_type: '',
  tuberculin_date_planted: '',
  tuberculin_date_read: '',
  tuberculin_result: '',
  chest_xray_date: '',
  chest_xray_result: '',
  additional_info: '',
  clinician_name: '',
  clinician_specialty: 'MD',
  clinician_address: '',
  date_of_examination: '',
};

export default function HealthCertificatesPage() {
  const confirmDialog = useConfirm();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<AdultHealthCertificateFormValues | null>(null);
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<PatientSearchResult | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AdultHealthCertificateFormValues>({
    resolver: formResolver<AdultHealthCertificateFormValues>(adultHealthCertificateSchema),
    defaultValues: emptyForm,
  });

  const patientId = watch('patient_id');

  const { data: certData, isLoading: loading } = useQuery({
    queryKey: [...CERT_QUERY_KEY, page, pageSize],
    queryFn: async () => {
      try {
        const result = await apiFetch<PaginatedResult<HealthCertificate> | HealthCertificate[]>(
          `/api/AdultHealthCertificates?${buildPageQuery(page, pageSize)}`,
          {
            tokenKey: 'admin_token',
            errorFallback: 'Failed to load health certificates.',
          },
        );
        if (isPaginatedResult<HealthCertificate>(result)) {
          return { items: result.items, total: result.total };
        }
        const list = result || [];
        return { items: list, total: list.length };
      } catch {
        return { items: [], total: 0 };
      }
    },
  });
  const certificates = certData?.items ?? [];
  const total = certData?.total ?? 0;

  const searchPatientMutation = useMutation({
    mutationFn: async (val: string) => {
      const isMobile = /^\d+$/.test(val);
      const q = isMobile ? `mobile=${encodeURIComponent(val)}` : `uid=${encodeURIComponent(val)}`;
      return apiFetch<PatientSearchResult>(`/api/Patient/search?${q}`, {
        tokenKey: 'admin_token',
        errorFallback: 'Patient not found.',
      });
    },
  });

  const saveMutation = useMutation({
    mutationFn: (values: AdultHealthCertificateFormValues) =>
      apiFetch('/api/AdultHealthCertificates', {
        method: 'POST',
        tokenKey: 'admin_token',
        body: JSON.stringify(values),
        successMessage: 'Health certificate issued successfully.',
        errorFallback: 'Failed to issue certificate.',
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/api/AdultHealthCertificates/${id}`, {
        method: 'DELETE',
        tokenKey: 'admin_token',
        successMessage: 'Certificate deleted successfully.',
        errorFallback: 'Failed to delete certificate.',
      }),
  });

  const emailMutation = useMutation({
    mutationFn: ({ id, email }: { id: number; email: string }) =>
      apiFetch('/api/AdultHealthCertificates/emailAdultHealthCertificate', {
        method: 'POST',
        tokenKey: 'admin_token',
        body: JSON.stringify({ id }),
        successMessage: email
          ? `Certificate emailed successfully to ${email}.`
          : 'Certificate emailed successfully.',
        errorFallback: 'Failed to email certificate.',
      }),
  });

  const openForm = () => {
    reset(emptyForm);
    setSelectedPatient(null);
    setPatientSearch('');
    setShowForm(true);
    setShowPreview(false);
    setPreviewData(null);
  };

  const closeForm = () => {
    setShowForm(false);
    setShowPreview(false);
    setPreviewData(null);
    reset(emptyForm);
    setSelectedPatient(null);
    setPatientSearch('');
  };

  const resetFormData = () => {
    reset(emptyForm);
    setSelectedPatient(null);
    setPatientSearch('');
    setShowPreview(false);
    setPreviewData(null);
  };

  const searchPatient = async () => {
    const val = patientSearch.trim();
    if (!val) {
      toastApiError('Enter a patient UID or mobile number.');
      return;
    }
    try {
      const patient = await searchPatientMutation.mutateAsync(val);
      setSelectedPatient(patient);
      setValue('patient_id', patient.id, { shouldValidate: true });
      toastApiSuccess(`Patient selected: ${patient.name || patient.uid || patient.id}`);
    } catch {
      setSelectedPatient(null);
      setValue('patient_id', '', { shouldValidate: true });
    }
  };

  const onSubmit = handleSubmit(values => {
    setPreviewData(values);
    setShowPreview(true);
  }, createInvalidHandler<AdultHealthCertificateFormValues>());

  const handleGenerateCertificate = async () => {
    if (!previewData) return;
    try {
      await saveMutation.mutateAsync(previewData);
      closeForm();
      await queryClient.invalidateQueries({ queryKey: CERT_QUERY_KEY });
    } catch {
      /* toasted by apiFetch */
    }
  };

  const handleDelete = async (cert: HealthCertificate) => {
    const ok = await confirmDialog({
      title: 'Delete certificate?',
      message: `Delete Adult Health Certificate #${cert.id} for ${cert.name || 'this patient'}? This cannot be undone.`,
      cancelText: 'Cancel',
      confirmText: 'Delete',
    });
    if (!ok) return;

    try {
      await deleteMutation.mutateAsync(cert.id);
      await queryClient.invalidateQueries({ queryKey: CERT_QUERY_KEY });
    } catch {
      /* toasted by apiFetch */
    }
  };

  const emailCert = async (cert: HealthCertificate) => {
    if (emailMutation.isPending) return;

    const email = (cert.patient_email || '').trim();
    const ok = await confirmDialog({
      title: 'Send certificate by email?',
      message: email
        ? `Email the Adult Health Certificate to ${email}?`
        : 'Send Adult Health Certificate to the patient via email?',
      cancelText: 'Cancel',
      confirmText: 'Send Email',
    });
    if (!ok) return;

    try {
      await emailMutation.mutateAsync({ id: cert.id, email });
    } catch {
      /* toasted by apiFetch — includes backend "No email address found for this patient" */
    }
  };

  const saving = saveMutation.isPending;
  const searching = searchPatientMutation.isPending;
  const emailing = emailMutation.isPending;

  const columns: ListingColumn<HealthCertificate>[] = [
    {
      key: 'id',
      label: 'Cert ID',
      sortable: true,
      filterable: true,
      width: '12%',
      getValue: row => String(row.id),
      render: row => `#${row.id}`,
    },
    {
      key: 'name',
      label: 'Patient Name',
      sortable: true,
      filterable: true,
      width: '28%',
      getValue: row => row.name || '',
      render: row => (
        <span>
          <strong>{row.name || '—'}</strong>
          {row.patient_uid ? (
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{row.patient_uid}</div>
          ) : null}
        </span>
      ),
    },
    {
      key: 'date_of_examination',
      label: 'Exam Date',
      sortable: true,
      filterable: true,
      width: '18%',
      getValue: row => (row.date_of_examination ? formatDate(row.date_of_examination) : ''),
      render: row => (row.date_of_examination ? formatDate(row.date_of_examination) : '—'),
    },
    {
      key: 'clinician_name',
      label: 'Clinician',
      sortable: true,
      filterable: true,
      width: '22%',
      getValue: row => row.clinician_name || '',
      render: row => row.clinician_name || '—',
    },
  ];

  return (
    <div className="page-content" style={{ paddingTop: 0 }}>
      <TopNav title="Adult Health Certificates" />

      {emailing && (
        <div className="test-reports-email-overlay" role="status" aria-live="polite" aria-busy="true">
          <div className="test-reports-email-overlay-card">
            <span className="test-reports-email-spinner" aria-hidden />
            <div className="test-reports-email-overlay-title">Sending email...</div>
            <div className="test-reports-email-overlay-text">
              Please wait while we generate and send the certificate PDF.
            </div>
          </div>
        </div>
      )}

      <div className={`page-body${emailing ? ' test-reports-page-busy' : ''}`}>
        {showForm && !showPreview ? (
          <div className="card">
            <div className="card-header cert-form-card-header">
              <span className="card-title">Issue Adult Health Certificate</span>
              <button type="button" className="btn btn-ghost" onClick={closeForm}>
                View Certificates List
              </button>
            </div>
            <form onSubmit={onSubmit} noValidate>
              <div className="card-body">
                <div className="cert-form">
                  <input type="hidden" data-field="patient_id" {...register('patient_id')} />

                  <div className="cert-form-section">
                    <h4 className="cert-form-section-title">Patient Selection</h4>
                    <FormGroup
                      label="Search Patient (UID or Mobile)"
                      htmlFor="hc-patient-search"
                      required
                      error={errors.patient_id?.message as string | undefined}
                    >
                      <div className="cert-form-search">
                        <input
                          id="hc-patient-search"
                          type="text"
                          className="form-control"
                          data-field="patient_id"
                          placeholder="Enter PT001 or 9999999999"
                          value={patientSearch}
                          onChange={e => setPatientSearch(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              void searchPatient();
                            }
                          }}
                          style={fieldStyle(!!errors.patient_id)}
                        />
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => void searchPatient()}
                          disabled={searching}
                        >
                          {searching ? 'Searching...' : 'Search'}
                        </button>
                      </div>
                    </FormGroup>
                    {(selectedPatient || patientId) && (
                      <div className="cert-form-selected">
                        Selected: {selectedPatient?.name || 'Patient'}
                        {selectedPatient?.uid ? ` (${selectedPatient.uid})` : ''} — ID {String(patientId)}
                      </div>
                    )}
                  </div>

                  <div className="cert-form-section">
                    <h4 className="cert-form-section-title">Physical Examination</h4>
                    <label className="cert-form-check">
                      <input type="checkbox" {...register('free_from_disease')} />
                      <span>1. Free from disease in communicable form.</span>
                    </label>
                    <label className="cert-form-check">
                      <input type="checkbox" {...register('satisfactory_physical')} />
                      <span>
                        2. In satisfactory physical condition, this will permit, close association with
                        children/elderly without danger to them.
                      </span>
                    </label>
                  </div>

                  <div className="cert-form-grid cert-form-grid-2">
                    <div className="cert-form-section">
                      <h4 className="cert-form-section-title">Tuberculin Test</h4>
                      <FormGroup label="Test Type" htmlFor="tuberculin_test_type">
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem' }}>
                          <label className="cert-form-check" style={{ marginBottom: 0 }}>
                            <input type="radio" value="" {...register('tuberculin_test_type')} />
                            <span>None</span>
                          </label>
                          <label className="cert-form-check" style={{ marginBottom: 0 }}>
                            <input type="radio" value="Tine" {...register('tuberculin_test_type')} />
                            <span>Tine</span>
                          </label>
                          <label className="cert-form-check" style={{ marginBottom: 0 }}>
                            <input type="radio" value="PPD" {...register('tuberculin_test_type')} />
                            <span>PPD</span>
                          </label>
                        </div>
                      </FormGroup>
                      <div className="cert-form-grid cert-form-grid-2">
                        <FormGroup label="Date Planted" htmlFor="tuberculin_date_planted">
                          <input
                            id="tuberculin_date_planted"
                            type="date"
                            className="form-control"
                            style={fieldStyle(false)}
                            {...register('tuberculin_date_planted')}
                          />
                        </FormGroup>
                        <FormGroup label="Date Read" htmlFor="tuberculin_date_read">
                          <input
                            id="tuberculin_date_read"
                            type="date"
                            className="form-control"
                            style={fieldStyle(false)}
                            {...register('tuberculin_date_read')}
                          />
                        </FormGroup>
                      </div>
                      <FormGroup label="Result" htmlFor="tuberculin_result">
                        <input
                          id="tuberculin_result"
                          type="text"
                          className="form-control"
                          style={fieldStyle(false)}
                          {...register('tuberculin_result')}
                        />
                      </FormGroup>
                    </div>

                    <div className="cert-form-section">
                      <h4 className="cert-form-section-title">Chest X-Ray</h4>
                      <FormGroup label="Date" htmlFor="chest_xray_date">
                        <input
                          id="chest_xray_date"
                          type="date"
                          className="form-control"
                          style={fieldStyle(false)}
                          {...register('chest_xray_date')}
                        />
                      </FormGroup>
                      <FormGroup label="Result" htmlFor="chest_xray_result">
                        <input
                          id="chest_xray_result"
                          type="text"
                          className="form-control"
                          style={fieldStyle(false)}
                          {...register('chest_xray_result')}
                        />
                      </FormGroup>
                    </div>
                  </div>

                  <div className="cert-form-section">
                    <h4 className="cert-form-section-title">Additional Information</h4>
                    <FormGroup label="Past Medical History, Current Medications" htmlFor="additional_info">
                      <textarea
                        id="additional_info"
                        className="form-control"
                        rows={3}
                        style={{ ...fieldStyle(false), resize: 'vertical' }}
                        {...register('additional_info')}
                      />
                    </FormGroup>
                  </div>

                  <div className="cert-form-section">
                    <h4 className="cert-form-section-title">Clinician Details</h4>
                    <div className="cert-form-grid cert-form-grid-3">
                      <FormGroup
                        label="Clinician Name"
                        htmlFor="clinician_name"
                        required
                        error={errors.clinician_name?.message}
                      >
                        <input
                          id="clinician_name"
                          type="text"
                          className="form-control"
                          data-field="clinician_name"
                          placeholder="e.g. Dr. John Doe"
                          aria-invalid={!!errors.clinician_name}
                          style={fieldStyle(!!errors.clinician_name)}
                          {...register('clinician_name')}
                        />
                      </FormGroup>
                      <div className="form-group">
                        <label>
                          Specialty<span className="required-star">*</span>
                        </label>
                        <div className="cert-radio-group" data-field="clinician_specialty" style={{ display: 'flex', gap: '1.25rem', marginTop: '0.5rem' }}>
                          {(['MD', 'PA', 'NP'] as const).map(spec => (
                            <label key={spec} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', cursor: 'pointer' }}>
                              <input 
                                type="radio" 
                                value={spec} 
                                {...register('clinician_specialty')} 
                                style={{ transform: 'scale(1.3)' }} 
                              />
                              {spec}
                            </label>
                          ))}
                        </div>
                        <FieldError message={errors.clinician_specialty?.message} />
                      </div>
                      <FormGroup
                        label="Date of Exam"
                        htmlFor="date_of_examination"
                        required
                        error={errors.date_of_examination?.message}
                      >
                        <input
                          id="date_of_examination"
                          type="date"
                          className="form-control"
                          data-field="date_of_examination"
                          aria-invalid={!!errors.date_of_examination}
                          style={fieldStyle(!!errors.date_of_examination)}
                          {...register('date_of_examination')}
                        />
                      </FormGroup>
                      <div className="cert-form-span-full">
                        <FormGroup label="Address" htmlFor="clinician_address">
                          <input
                            id="clinician_address"
                            type="text"
                            className="form-control"
                            style={fieldStyle(false)}
                            {...register('clinician_address')}
                          />
                        </FormGroup>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="cert-form-footer-actions">
                <button type="submit" className="btn btn-primary" disabled={saving || !patientId}>
                  Preview Certificate
                </button>
                <button type="button" className="btn btn-ghost" onClick={resetFormData} disabled={saving}>
                  Reset Data
                </button>
                <button type="button" className="btn btn-secondary" onClick={closeForm} disabled={saving}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        ) : showForm && showPreview && previewData ? (
          <div className="card">
            <div className="card-header cert-form-card-header">
              <span className="card-title">Preview Adult Health Certificate</span>
              <button type="button" className="btn btn-ghost" onClick={() => setShowPreview(false)} disabled={saving}>
                Back to Form
              </button>
            </div>
            <div className="card-body">
              <div className="cert-form-section">
                <h4 className="cert-form-section-title">Patient Details</h4>
                <p><strong>Patient:</strong> {selectedPatient?.name || 'Unknown'} (ID: {String(previewData.patient_id)})</p>
              </div>
              <div className="cert-form-section">
                <h4 className="cert-form-section-title">Physical Examination</h4>
                <p><strong>Free from communicable disease:</strong> {previewData.free_from_disease ? 'Yes' : 'No'}</p>
                <p><strong>Satisfactory physical condition:</strong> {previewData.satisfactory_physical ? 'Yes' : 'No'}</p>
              </div>
              <div className="cert-form-grid cert-form-grid-2">
                <div className="cert-form-section">
                  <h4 className="cert-form-section-title">Tuberculin Test</h4>
                  <p><strong>Test Type:</strong> {previewData.tuberculin_test_type || 'None'}</p>
                  <p><strong>Date Planted:</strong> {previewData.tuberculin_date_planted ? formatDate(previewData.tuberculin_date_planted) : '—'}</p>
                  <p><strong>Date Read:</strong> {previewData.tuberculin_date_read ? formatDate(previewData.tuberculin_date_read) : '—'}</p>
                  <p><strong>Result:</strong> {previewData.tuberculin_result || '—'}</p>
                </div>
                <div className="cert-form-section">
                  <h4 className="cert-form-section-title">Chest X-Ray</h4>
                  <p><strong>Date:</strong> {previewData.chest_xray_date ? formatDate(previewData.chest_xray_date) : '—'}</p>
                  <p><strong>Result:</strong> {previewData.chest_xray_result || '—'}</p>
                </div>
              </div>
              <div className="cert-form-section">
                <h4 className="cert-form-section-title">Additional Information</h4>
                <p>{previewData.additional_info || '—'}</p>
              </div>
              <div className="cert-form-section">
                <h4 className="cert-form-section-title">Clinician Details</h4>
                <p><strong>Name:</strong> {previewData.clinician_name}</p>
                <p><strong>Specialty:</strong> {previewData.clinician_specialty}</p>
                <p><strong>Date of Exam:</strong> {formatDate(previewData.date_of_examination)}</p>
                <p><strong>Address:</strong> {previewData.clinician_address || '—'}</p>
              </div>
            </div>
            <div className="cert-form-footer-actions">
              <button type="button" className="btn btn-primary" onClick={() => void handleGenerateCertificate()} disabled={saving}>
                {saving ? 'Generating...' : 'Generate Certificate'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowPreview(false)} disabled={saving}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <ListingTable
            title="Health Certificates"
            columns={columns}
            rows={certificates}
            loading={loading}
            emptyText="No certificates found."
            actionsLabel="Actions"
            actionsWidth={140}
            defaultPageSize={25}
            showTotal
            paginationMode="server"
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
            headerActions={
              <ListingHeaderActions onAdd={openForm} addLabel="Issue New Certificate" />
            }
            rowActions={cert => (
              <ActionIcons
                onMail={() => void emailCert(cert)}
                mailTitle={`Email certificate #${cert.id}`}
                onView={() =>
                  window.open(
                    `/admin/dashboard/health-certificates/print/${cert.id}`,
                    '_blank',
                    'noopener,noreferrer',
                  )
                }
                viewTitle="Print"
                onDelete={() => void handleDelete(cert)}
                deleteTitle="Delete"
              />
            )}
          />
        )}
      </div>
    </div>
  );
}
