'use client';
import { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { MdAdd, MdClose, MdDelete, MdEdit } from 'react-icons/md';
import TopNav from '../../../components/TopNav';
import PageLoader from '../../../components/PageLoader';
import { useConfirm } from '../../../components/ConfirmModal';
import { FormGroup } from '../../../components/FormField';
import { apiFetch } from '../../../../lib/api';
import { createInvalidHandler, fieldStyle, formResolver } from '../../../../lib/formHelpers';
import { b2bPatientSchema, type B2bPatientFormValues } from '../../../../lib/schemas';

interface Patient {
  id: number;
  uid: string;
  name: string;
  mobile: string;
  email: string;
  dob: string;
  gender: number | null;
  city: string;
  state: string;
  zipcode: string;
  status: boolean | null;
  deleted: boolean | null;
}

const emptyPatient: B2bPatientFormValues = {
  name: '',
  mobile: '',
  email: '',
  dob: '',
  gender: 1,
  city: '',
  state: '',
  zipcode: '',
  uid: '',
};

export default function PatientsPage() {
  const confirmDialog = useConfirm();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<B2bPatientFormValues>({
    resolver: formResolver<B2bPatientFormValues>(b2bPatientSchema),
    defaultValues: emptyPatient,
  });

  const fetchPatients = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<Patient[]>('/api/Patient', {
        tokenKey: 'b2b_token',
        errorFallback: 'Unable to load patients.',
      });
      setPatients(data || []);
    } catch {
      setPatients([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPatients(); }, [fetchPatients]);

  const filtered = patients.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.mobile?.includes(search) ||
    p.email?.toLowerCase().includes(search.toLowerCase())
  );

  const closeModal = () => {
    setShowModal(false);
    setEditId(null);
    reset(emptyPatient);
  };

  const openAdd = () => {
    setEditId(null);
    reset(emptyPatient);
    setShowModal(true);
  };

  const openEdit = (p: Patient) => {
    setEditId(p.id);
    reset({
      name: p.name || '',
      mobile: p.mobile || '',
      email: p.email || '',
      dob: p.dob ? p.dob.split('T')[0] : '',
      gender: p.gender ?? 1,
      city: p.city || '',
      state: p.state || '',
      zipcode: p.zipcode || '',
      uid: p.uid || '',
    });
    setShowModal(true);
  };

  const handleSave = handleSubmit(async values => {
    setSaving(true);
    try {
      const path = editId ? `/api/Patient/${editId}` : '/api/Patient';
      const method = editId ? 'PUT' : 'POST';
      await apiFetch(path, {
        method,
        tokenKey: 'b2b_token',
        body: JSON.stringify(values),
        successMessage: `Patient ${editId ? 'updated' : 'added'} successfully.`,
        errorFallback: editId ? 'Unable to update patient.' : 'Unable to add patient.',
      });
      closeModal();
      fetchPatients();
    } catch {
      /* toast handled by apiFetch */
    } finally {
      setSaving(false);
    }
  }, createInvalidHandler<B2bPatientFormValues>());

  const handleDelete = async (id: number) => {
    const ok = await confirmDialog({
      title: 'You are trying to delete Patient, Please confirm',
      message: 'This cannot be restored once deleted.',
      cancelText: 'NO, WAIT!',
      confirmText: 'CONFIRM DELETION',
    });
    if (!ok) return;
    try {
      await apiFetch(`/api/Patient/${id}`, {
        method: 'DELETE',
        tokenKey: 'b2b_token',
        successMessage: 'Patient deleted successfully.',
        errorFallback: 'Unable to delete patient.',
      });
      fetchPatients();
    } catch {
      /* toast handled by apiFetch */
    }
  };

  const genderLabel = (g: number | null) => g === 1 ? 'Male' : g === 2 ? 'Female' : 'Other';

  return (
    <>
      <TopNav title="Patients">
          <button id="add-patient-btn" className="btn btn-primary" onClick={openAdd}><MdAdd size={16} style={{ verticalAlign: 'text-bottom', marginRight: '0.35rem' }} aria-hidden />Add Patient</button>
        </TopNav>

      <div className="page-content">
        <div className="page-header">
          <div>
            <h2 className="page-title">Patient Management</h2>
            <p className="page-subtitle">{patients.length} total patients registered</p>
          </div>
          <div className="search-bar" style={{ minWidth: 280 }}>
            <span>🔍</span>
            <input
              id="patient-search"
              type="text"
              placeholder="Search by name, mobile, email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>UID</th>
                  <th>Name</th>
                  <th>Mobile</th>
                  <th>Email</th>
                  <th>Gender</th>
                  <th>City</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8}><PageLoader message="Loading patients..." /></td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No patients found</td></tr>
                ) : filtered.map(p => (
                  <tr key={p.id}>
                    <td><span className="badge badge-primary">{p.uid}</span></td>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td>{p.mobile}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{p.email}</td>
                    <td>{genderLabel(p.gender)}</td>
                    <td>{p.city}</td>
                    <td>
                      <span className={`badge ${p.status ? 'badge-success' : 'badge-danger'}`}>
                        {p.status ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-ghost btn-sm" id={`edit-patient-${p.id}`} onClick={() => openEdit(p)}><MdEdit size={14} style={{ verticalAlign: 'text-bottom', marginRight: '0.25rem' }} aria-hidden />Edit</button>
                        <button className="btn btn-danger btn-sm" id={`del-patient-${p.id}`} onClick={() => handleDelete(p.id)}><MdDelete size={14} aria-hidden /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editId ? 'Edit Patient' : 'Add New Patient'}</h2>
              <button className="btn btn-ghost btn-sm" id="close-patient-modal" onClick={closeModal}><MdClose size={16} aria-hidden /></button>
            </div>
            <form onSubmit={handleSave} noValidate>
              <div className="modal-body">
                <div className="form-row">
                  <FormGroup label="Full Name" htmlFor="patient-name" required error={errors.name?.message}>
                    <input
                      id="patient-name"
                      type="text"
                      placeholder="John Doe"
                      data-field="name"
                      aria-invalid={!!errors.name}
                      style={fieldStyle(!!errors.name)}
                      {...register('name')}
                    />
                  </FormGroup>
                  <FormGroup label="UID" htmlFor="patient-uid" error={errors.uid?.message}>
                    <input
                      id="patient-uid"
                      type="text"
                      placeholder="PT-001"
                      data-field="uid"
                      aria-invalid={!!errors.uid}
                      style={fieldStyle(!!errors.uid)}
                      {...register('uid')}
                    />
                  </FormGroup>
                </div>
                <div className="form-row">
                  <FormGroup label="Mobile" htmlFor="patient-mobile" required error={errors.mobile?.message}>
                    <input
                      id="patient-mobile"
                      type="text"
                      inputMode="numeric"
                      placeholder="9-10 digits"
                      data-field="mobile"
                      aria-invalid={!!errors.mobile}
                      style={fieldStyle(!!errors.mobile)}
                      {...register('mobile')}
                    />
                  </FormGroup>
                  <FormGroup label="Email" htmlFor="patient-email" error={errors.email?.message}>
                    <input
                      id="patient-email"
                      type="email"
                      placeholder="patient@email.com"
                      data-field="email"
                      aria-invalid={!!errors.email}
                      style={fieldStyle(!!errors.email)}
                      {...register('email')}
                    />
                  </FormGroup>
                </div>
                <div className="form-row">
                  <FormGroup label="Date of Birth" htmlFor="patient-dob" error={errors.dob?.message}>
                    <input
                      id="patient-dob"
                      type="date"
                      data-field="dob"
                      aria-invalid={!!errors.dob}
                      style={fieldStyle(!!errors.dob)}
                      {...register('dob')}
                    />
                  </FormGroup>
                  <FormGroup label="Gender" htmlFor="patient-gender" error={errors.gender?.message}>
                    <select
                      id="patient-gender"
                      data-field="gender"
                      aria-invalid={!!errors.gender}
                      style={fieldStyle(!!errors.gender)}
                      {...register('gender', { valueAsNumber: true })}
                    >
                      <option value={1}>Male</option>
                      <option value={2}>Female</option>
                      <option value={3}>Other</option>
                    </select>
                  </FormGroup>
                </div>
                <div className="form-row">
                  <FormGroup label="City" htmlFor="patient-city" error={errors.city?.message}>
                    <input
                      id="patient-city"
                      type="text"
                      placeholder="New York"
                      data-field="city"
                      aria-invalid={!!errors.city}
                      style={fieldStyle(!!errors.city)}
                      {...register('city')}
                    />
                  </FormGroup>
                  <FormGroup label="State" htmlFor="patient-state" error={errors.state?.message}>
                    <input
                      id="patient-state"
                      type="text"
                      placeholder="NY"
                      data-field="state"
                      aria-invalid={!!errors.state}
                      style={fieldStyle(!!errors.state)}
                      {...register('state')}
                    />
                  </FormGroup>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={closeModal}>Cancel</button>
                <button type="submit" id="save-patient-btn" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : editId ? 'Update Patient' : 'Add Patient'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
