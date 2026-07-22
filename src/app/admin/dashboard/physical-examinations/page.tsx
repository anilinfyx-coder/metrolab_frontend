'use client';

import { useState } from 'react';
import { useForm, UseFormRegister } from 'react-hook-form';
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
  physicalExaminationCertificateSchema,
  type PhysicalExaminationCertificateFormValues,
} from '../../../../lib/schemas';

interface PhysicalExamCertificate {
  id: number;
  patient_id: number;
  name?: string;
  patient_email?: string;
  patient_uid?: string;
  date_of_examination?: string;
  clinician_name?: string;
  overall_condition?: string;
}

interface PatientSearchResult {
  id: number;
  name?: string;
  uid?: string;
  email?: string;
}

const CERT_QUERY_KEY = ['physicalExaminationCertificates'] as const;

const emptyForm: PhysicalExaminationCertificateFormValues = {
  patient_id: '',
  age: '',
  height: '',
  weight: '',
  bp: '',
  pulse: '',
  hearing_right: '',
  hearing_left: '',
  vision_right: '',
  vision_left: '',
  wear_glasses: false,
  eval_head: '',
  eval_nose: '',
  eval_mouth: '',
  eval_ears: '',
  eval_eyes: '',
  eval_lungs: '',
  eval_heart: '',
  eval_vascular: '',
  eval_abdomen: '',
  eval_spine: '',
  eval_skin: '',
  eval_neurologic: '',
  additional_comments: '',
  overall_condition: 'Fit',
  clinician_name: '',
  clinician_specialty: 'MD',
  date_of_examination: '',
  clinician_address: '',
};

const EVAL_FIELDS: { label: string; field: keyof PhysicalExaminationCertificateFormValues }[] = [
  { label: '1. Head, Neck, Face & Scalp', field: 'eval_head' },
  { label: '2. Nose and Sinuses', field: 'eval_nose' },
  { label: '3. Mouth and Throat', field: 'eval_mouth' },
  { label: '4. Ears', field: 'eval_ears' },
  { label: '5. Eyes, Pupils & Motion', field: 'eval_eyes' },
  { label: '6. Lungs, Chest & Breasts', field: 'eval_lungs' },
  { label: '7. Heart', field: 'eval_heart' },
  { label: '8. Vascular System', field: 'eval_vascular' },
  { label: '9. Abdomen and Viscera', field: 'eval_abdomen' },
  { label: '10. Spine, Muscular Skeletal', field: 'eval_spine' },
  { label: '11. Skin and Lymphatic', field: 'eval_skin' },
  { label: '12. Neurologic', field: 'eval_neurologic' },
];

function EvalSelect({
  label,
  field,
  register,
}: {
  label: string;
  field: keyof PhysicalExaminationCertificateFormValues;
  register: UseFormRegister<PhysicalExaminationCertificateFormValues>;
}) {
  return (
    <div className="cert-eval-row">
      <span className="cert-eval-label">{label}</span>
      <div className="cert-eval-options">
        <label>
          <input type="radio" value="N" {...register(field)} /> Normal (N)
        </label>
        <label>
          <input type="radio" value="AB" {...register(field)} /> Abnormal (AB)
        </label>
      </div>
    </div>
  );
}

export default function PhysicalExaminationsPage() {
  const confirmDialog = useConfirm();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<PhysicalExaminationCertificateFormValues | null>(null);
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
  } = useForm<PhysicalExaminationCertificateFormValues>({
    resolver: formResolver<PhysicalExaminationCertificateFormValues>(physicalExaminationCertificateSchema),
    defaultValues: emptyForm,
  });

  const patientId = watch('patient_id');

  const { data: certData, isLoading: loading } = useQuery({
    queryKey: [...CERT_QUERY_KEY, page, pageSize],
    queryFn: async () => {
      try {
        const result = await apiFetch<PaginatedResult<PhysicalExamCertificate> | PhysicalExamCertificate[]>(
          `/api/PhysicalExaminationCertificates?${buildPageQuery(page, pageSize)}`,
          {
            tokenKey: 'admin_token',
            errorFallback: 'Failed to load physical examination certificates.',
          },
        );
        if (isPaginatedResult<PhysicalExamCertificate>(result)) {
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
    mutationFn: (values: PhysicalExaminationCertificateFormValues) =>
      apiFetch('/api/PhysicalExaminationCertificates', {
        method: 'POST',
        tokenKey: 'admin_token',
        body: JSON.stringify(values),
        successMessage: 'Physical examination certificate issued successfully.',
        errorFallback: 'Failed to issue certificate.',
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/api/PhysicalExaminationCertificates/${id}`, {
        method: 'DELETE',
        tokenKey: 'admin_token',
        successMessage: 'Certificate deleted successfully.',
        errorFallback: 'Failed to delete certificate.',
      }),
  });

  const emailMutation = useMutation({
    mutationFn: ({ id, email }: { id: number; email: string }) =>
      apiFetch('/api/PhysicalExaminationCertificates/emailPhysicalExaminationCertificate', {
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
      // Match prior behavior: selecting a patient clears vitals tied to the previous selection
      setValue('patient_id', patient.id, { shouldValidate: true });
      setValue('age', '');
      setValue('height', '');
      setValue('weight', '');
      toastApiSuccess(`Patient selected: ${patient.name || patient.uid || patient.id}`);
    } catch {
      setSelectedPatient(null);
      setValue('patient_id', '', { shouldValidate: true });
    }
  };

  const onSubmit = handleSubmit(values => {
    setPreviewData(values);
    setShowPreview(true);
  }, createInvalidHandler<PhysicalExaminationCertificateFormValues>());

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

  const handleDelete = async (cert: PhysicalExamCertificate) => {
    const ok = await confirmDialog({
      title: 'Delete certificate?',
      message: `Delete Physical Examination Certificate #${cert.id} for ${cert.name || 'this patient'}? This cannot be undone.`,
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

  const emailCert = async (cert: PhysicalExamCertificate) => {
    if (emailMutation.isPending) return;

    const email = (cert.patient_email || '').trim();
    // Same as original: confirm first, then POST { id } — backend validates patient email
    const ok = await confirmDialog({
      title: 'Send certificate by email?',
      message: email
        ? `Email the Physical Examination Certificate to ${email}?`
        : 'Send Physical Examination Certificate to patient via email?',
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

  const columns: ListingColumn<PhysicalExamCertificate>[] = [
    {
      key: 'id',
      label: 'Cert ID',
      sortable: true,
      filterable: true,
      width: '10%',
      getValue: row => String(row.id),
      render: row => `#${row.id}`,
    },
    {
      key: 'name',
      label: 'Patient',
      sortable: true,
      filterable: true,
      width: '24%',
      getValue: row => row.name || '',
      render: row => (
        <span>
          <strong>{row.name || '—'}</strong>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            {row.patient_uid || `ID: ${row.patient_id}`}
          </div>
        </span>
      ),
    },
    {
      key: 'date_of_examination',
      label: 'Exam Date',
      sortable: true,
      filterable: true,
      width: '16%',
      getValue: row => (row.date_of_examination ? formatDate(row.date_of_examination) : ''),
      render: row => (row.date_of_examination ? formatDate(row.date_of_examination) : '—'),
    },
    {
      key: 'clinician_name',
      label: 'Clinician',
      sortable: true,
      filterable: true,
      width: '18%',
      getValue: row => row.clinician_name || '',
      render: row => row.clinician_name || '—',
    },
    {
      key: 'overall_condition',
      label: 'Condition',
      sortable: true,
      filterable: true,
      width: '12%',
      getValue: row => row.overall_condition || '',
      render: row => (
        <span className={`badge ${row.overall_condition === 'Fit' ? 'badge-success' : 'badge-danger'}`}>
          {row.overall_condition || '—'}
        </span>
      ),
    },
  ];

  return (
    <div className="page-content" style={{ paddingTop: 0 }}>
      <TopNav title="Physical Examination Certificates" />

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
              <span className="card-title">Issue Physical Examination Certificate</span>
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
                      htmlFor="pe-patient-search"
                      required
                      error={errors.patient_id?.message as string | undefined}
                    >
                      <div className="cert-form-search">
                        <input
                          id="pe-patient-search"
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
                    <h4 className="cert-form-section-title">Vitals & Basics</h4>
                    <div className="cert-form-grid cert-form-grid-3">
                      <FormGroup label="Age" htmlFor="age">
                        <input id="age" type="text" className="form-control" style={fieldStyle(false)} {...register('age')} />
                      </FormGroup>
                      <FormGroup label="Height" htmlFor="height">
                        <input id="height" type="text" className="form-control" style={fieldStyle(false)} {...register('height')} />
                      </FormGroup>
                      <FormGroup label="Weight" htmlFor="weight">
                        <input id="weight" type="text" className="form-control" style={fieldStyle(false)} {...register('weight')} />
                      </FormGroup>
                      <FormGroup label="Blood Pressure" htmlFor="bp">
                        <input id="bp" type="text" className="form-control" style={fieldStyle(false)} {...register('bp')} />
                      </FormGroup>
                      <FormGroup label="Pulse" htmlFor="pulse">
                        <input id="pulse" type="text" className="form-control" style={fieldStyle(false)} {...register('pulse')} />
                      </FormGroup>
                    </div>
                  </div>

                  <div className="cert-form-section">
                    <h4 className="cert-form-section-title">Hearing & Vision</h4>
                    <div className="cert-form-grid cert-form-grid-2">
                      <FormGroup label="Hearing Right" htmlFor="hearing_right">
                        <input
                          id="hearing_right"
                          type="text"
                          className="form-control"
                          style={fieldStyle(false)}
                          {...register('hearing_right')}
                        />
                      </FormGroup>
                      <FormGroup label="Hearing Left" htmlFor="hearing_left">
                        <input
                          id="hearing_left"
                          type="text"
                          className="form-control"
                          style={fieldStyle(false)}
                          {...register('hearing_left')}
                        />
                      </FormGroup>
                      <FormGroup label="Vision Right (20/___)" htmlFor="vision_right">
                        <input
                          id="vision_right"
                          type="text"
                          className="form-control"
                          style={fieldStyle(false)}
                          {...register('vision_right')}
                        />
                      </FormGroup>
                      <FormGroup label="Vision Left (20/___)" htmlFor="vision_left">
                        <input
                          id="vision_left"
                          type="text"
                          className="form-control"
                          style={fieldStyle(false)}
                          {...register('vision_left')}
                        />
                      </FormGroup>
                      <div className="cert-form-span-full">
                        <label className="cert-form-check">
                          <input type="checkbox" {...register('wear_glasses')} />
                          <span>Wear Glasses</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="cert-form-section">
                    <h4 className="cert-form-section-title">Evaluation (NORMAL = N, ABNORMAL = AB)</h4>
                    <div className="cert-eval-list">
                      {EVAL_FIELDS.map(item => (
                        <EvalSelect key={item.field} label={item.label} field={item.field} register={register} />
                      ))}
                    </div>
                    <FormGroup
                      label="13. Additional Comment, Past medical history, current medications"
                      htmlFor="additional_comments"
                    >
                      <textarea
                        id="additional_comments"
                        className="form-control"
                        rows={3}
                        style={{ ...fieldStyle(false), resize: 'vertical' }}
                        {...register('additional_comments')}
                      />
                    </FormGroup>
                  </div>

                  <div className="cert-form-section">
                    <h4 className="cert-form-section-title">Conclusion & Signature</h4>
                    <div className="cert-form-grid cert-form-grid-3">
                      <FormGroup label="14. Overall Physical Condition" htmlFor="overall_condition">
                        <select
                          id="overall_condition"
                          className="form-control"
                          style={fieldStyle(false)}
                          {...register('overall_condition')}
                        >
                          <option value="Fit">Fit</option>
                          <option value="Unfit">Unfit</option>
                        </select>
                      </FormGroup>
                      <FormGroup
                        label="Examining Clinician Name"
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
                        <div className="cert-radio-group" data-field="clinician_specialty">
                          {(['MD', 'PA', 'NP'] as const).map(spec => (
                            <label key={spec}>
                              <input type="radio" value={spec} {...register('clinician_specialty')} />
                              {spec}
                            </label>
                          ))}
                        </div>
                        <FieldError message={errors.clinician_specialty?.message} />
                      </div>
                      <FormGroup
                        label="Date of Examination"
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
              <span className="card-title">Preview Physical Examination Certificate</span>
              <button type="button" className="btn btn-ghost" onClick={() => setShowPreview(false)} disabled={saving}>
                Back to Form
              </button>
            </div>
            <div className="card-body">
              <div className="cert-form-section">
                <h4 className="cert-form-section-title">Patient Details & Vitals</h4>
                <p><strong>Patient:</strong> {selectedPatient?.name || 'Unknown'} (ID: {String(previewData.patient_id)})</p>
                <p><strong>Age:</strong> {previewData.age || '—'} | <strong>Height:</strong> {previewData.height || '—'} | <strong>Weight:</strong> {previewData.weight || '—'}</p>
                <p><strong>Blood Pressure:</strong> {previewData.bp || '—'} | <strong>Pulse:</strong> {previewData.pulse || '—'}</p>
              </div>
              <div className="cert-form-section">
                <h4 className="cert-form-section-title">Hearing & Vision</h4>
                <p><strong>Hearing Right:</strong> {previewData.hearing_right || '—'} | <strong>Hearing Left:</strong> {previewData.hearing_left || '—'}</p>
                <p><strong>Vision Right:</strong> {previewData.vision_right || '—'} | <strong>Vision Left:</strong> {previewData.vision_left || '—'}</p>
                <p><strong>Wears Glasses:</strong> {previewData.wear_glasses ? 'Yes' : 'No'}</p>
              </div>
              <div className="cert-form-section">
                <h4 className="cert-form-section-title">Evaluation</h4>
                <div className="cert-form-grid cert-form-grid-3">
                  {EVAL_FIELDS.map(item => (
                    <p key={item.field} style={{ margin: '4px 0' }}><strong>{item.label}:</strong> {previewData[item.field] === 'N' ? 'Normal' : previewData[item.field] === 'AB' ? 'Abnormal' : '—'}</p>
                  ))}
                </div>
              </div>
              <div className="cert-form-section">
                <h4 className="cert-form-section-title">Conclusion & Signature</h4>
                <p><strong>Additional Comments:</strong> {previewData.additional_comments || '—'}</p>
                <p><strong>Overall Condition:</strong> {previewData.overall_condition}</p>
                <p><strong>Clinician:</strong> {previewData.clinician_name} ({previewData.clinician_specialty})</p>
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
            title="Physical Examinations"
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
                    `/admin/dashboard/physical-examinations/print/${cert.id}`,
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
