'use client';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { MdAdd, MdEdit, MdRefresh, MdSave } from 'react-icons/md';
import TopNav from '../../../components/TopNav';
import { useConfirm } from '../../../components/ConfirmModal';
import ListingTable, { ActionIcons, ListingColumn } from '../../../components/ListingTable';
import { FormGroup } from '../../../components/FormField';
import { apiFetch } from '../../../../lib/api';
import { patchListItem } from '../../../../lib/listState';
import { createInvalidHandler, fieldStyle, formResolver } from '../../../../lib/formHelpers';
import {
  corporateEmployeeSchema,
  type CorporateEmployeeFormValues,
} from '../../../../lib/schemas';

function getStoredUser() {
  if (typeof window === 'undefined') return null;
  try { return JSON.parse(localStorage.getItem('corporate_user') || '{}'); } catch { return {}; }
}

// US States for dropdown
const US_STATES = [
  'Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware',
  'Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky',
  'Louisiana','Maine','Maryland','Massachusetts','Michigan','Minnesota','Mississippi',
  'Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey','New Mexico',
  'New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania',
  'Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont',
  'Virginia','Washington','West Virginia','Wisconsin','Wyoming'
];

interface Employee {
  id: number; first_name: string; last_name: string; mobile: string; department: string; status: boolean;
}

const employeeColumns: ListingColumn<Employee>[] = [
  { key: 'first_name', label: 'First Name', sortable: true, width: '20%' },
  { key: 'last_name', label: 'Last Name', sortable: true, width: '20%' },
  { key: 'department', label: 'Department', sortable: true, width: '22%' },
  { key: 'mobile', label: 'Mobile', sortable: true, width: '20%' },
];

const emptyForm: CorporateEmployeeFormValues = {
  first_name: '', last_name: '', mobile: '', gender: '1', dob_month: '1', dob_day: '1', dob_year: '',
  driving_license_state: '', driving_license: '', street1: '', street2: '',
  city: '', state: '', zipcode: '', email: '', ssn: '', department: '',
};

export default function EmployeePage() {
  const confirmDialog = useConfirm();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CorporateEmployeeFormValues>({
    resolver: formResolver<CorporateEmployeeFormValues>(corporateEmployeeSchema),
    defaultValues: emptyForm,
  });

  const loadEmployees = async () => {
    setLoading(true);
    const user = getStoredUser();
    const query = user?.id ? `?corporate_client_id=${user.id}` : '';
    try {
      const data = await apiFetch<Employee[]>(`/api/Employees${query}`, {
        tokenKey: 'corporate_token',
        errorFallback: 'Unable to load employees.',
      });
      setEmployees(data || []);
    } catch {
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(loadEmployees);
  }, []);

  const openAdd = () => {
    setEditingId(null);
    reset(emptyForm);
    setShowForm(true);
  };

  const openEdit = (e: Employee) => {
    setEditingId(e.id);
    const employeeValues = Object.fromEntries(
      Object.entries(e)
        .filter(([key]) => key !== 'id' && key !== 'status')
        .map(([key, value]) => [key, value == null ? '' : String(value)])
    );
    const dobParts = employeeValues.dob ? employeeValues.dob.split('T')[0].split('-') : ['', '1', '1'];
    reset({
      ...emptyForm,
      ...employeeValues,
      dob_year: dobParts[0] || '',
      dob_month: String(parseInt(dobParts[1]) || 1),
      dob_day: String(parseInt(dobParts[2]) || 1),
      gender: employeeValues.gender || '1',
    });
    setShowForm(true);
  };

  const save = handleSubmit(async values => {
    setSaving(true);
    const dobString = values.dob_year
      ? `${values.dob_year}-${String(values.dob_month).padStart(2, '0')}-${String(values.dob_day).padStart(2, '0')}`
      : null;

    const user = getStoredUser();
    const payload = {
      first_name: values.first_name,
      last_name: values.last_name,
      mobile: values.mobile,
      gender: parseInt(values.gender as string),
      dob: dobString,
      driving_license_state: values.driving_license_state,
      driving_license: values.driving_license,
      street1: values.street1,
      street2: values.street2,
      city: values.city,
      state: values.state,
      zipcode: values.zipcode,
      email: values.email,
      ssn: values.ssn,
      department: values.department,
      corporate_client_id: user?.id,
    };

    const method = editingId ? 'PUT' : 'POST';
    const path = `/api/Employees${editingId ? `/${editingId}` : ''}`;

    try {
      await apiFetch(path, {
        method,
        tokenKey: 'corporate_token',
        body: JSON.stringify(payload),
        successMessage: `Employee ${editingId ? 'updated' : 'added'} successfully.`,
        errorFallback: 'Unable to save employee.',
      });
      setShowForm(false);
      loadEmployees();
    } catch {
      /* toast handled by apiFetch */
    } finally {
      setSaving(false);
    }
  }, createInvalidHandler<CorporateEmployeeFormValues>());

  const remove = async (id: number) => {
    const ok = await confirmDialog({
      title: 'You are trying to delete Employee, Please confirm',
      message: 'This cannot be restored once deleted.',
      cancelText: 'NO, WAIT!',
      confirmText: 'CONFIRM DELETION',
    });
    if (!ok) return;
    try {
      await apiFetch(`/api/Employees/${id}`, {
        method: 'DELETE',
        tokenKey: 'corporate_token',
        successMessage: 'Employee deleted successfully.',
        errorFallback: 'Unable to delete employee.',
      });
      loadEmployees();
    } catch {
      /* toast handled by apiFetch */
    }
  };

  const toggleStatus = async (e: Employee) => {
    const enabling = !e.status;
    const ok = await confirmDialog({
      title: enabling ? 'Enable Employee?' : 'Disable Employee?',
      message: enabling
        ? `${[e.first_name, e.last_name].filter(Boolean).join(' ') || 'This employee'} will become active.`
        : `${[e.first_name, e.last_name].filter(Boolean).join(' ') || 'This employee'} will become inactive. You can enable them again later.`,
      cancelText: 'Cancel',
      confirmText: enabling ? 'Enable' : 'Disable',
    });
    if (!ok) return;
    try {
      await apiFetch(`/api/Employees/${e.id}`, {
        method: 'PUT',
        tokenKey: 'corporate_token',
        body: JSON.stringify({ status: !e.status }),
        successMessage: 'Status Updated Successfully',
        errorFallback: 'Unable to update employee status.',
      });
      setEmployees(prev => patchListItem(prev, e.id, { status: !e.status }));
    } catch {
      /* toast handled by apiFetch */
    }
  };

  if (showForm) {
    return (
      <div className="page-content">
        <TopNav title="Employee Details" />
        <div style={{ padding: '1.5rem' }}>
          <div className="card">
            <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
              <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {editingId ? <><MdEdit size={18}/> Edit Employee</> : <><MdAdd size={18}/> Add Employee</>}
              </span>
              <button type="button" className="listing-header-link" onClick={() => setShowForm(false)}>
                Close
              </button>
            </div>
            <form onSubmit={save} noValidate>
              <div className="card-body">
                {/* Row 1 */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                  <FormGroup label="First Name" htmlFor="emp-first-name" required error={errors.first_name?.message}>
                    <input
                      id="emp-first-name"
                      type="text"
                      className="form-control"
                      placeholder="First Name"
                      data-field="first_name"
                      aria-invalid={!!errors.first_name}
                      style={fieldStyle(!!errors.first_name)}
                      {...register('first_name')}
                    />
                  </FormGroup>
                  <FormGroup label="Last Name" htmlFor="emp-last-name" required error={errors.last_name?.message}>
                    <input
                      id="emp-last-name"
                      type="text"
                      className="form-control"
                      placeholder="Last Name"
                      data-field="last_name"
                      aria-invalid={!!errors.last_name}
                      style={fieldStyle(!!errors.last_name)}
                      {...register('last_name')}
                    />
                  </FormGroup>
                  <FormGroup label="Mobile" htmlFor="emp-mobile" required error={errors.mobile?.message}>
                    <input
                      id="emp-mobile"
                      type="text"
                      className="form-control"
                      placeholder="Mobile (9-10 digits)"
                      maxLength={15}
                      inputMode="numeric"
                      data-field="mobile"
                      aria-invalid={!!errors.mobile}
                      style={fieldStyle(!!errors.mobile)}
                      {...register('mobile')}
                    />
                  </FormGroup>
                </div>

                {/* Row 2 */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <FormGroup label="DOB (mm/dd/yyyy)" htmlFor="emp-dob-month">
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <select
                        id="emp-dob-month"
                        data-field="dob_month"
                        style={fieldStyle(false, { flex: 2 })}
                        {...register('dob_month')}
                      >
                        {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => (
                          <option key={i} value={i + 1}>{m}</option>
                        ))}
                      </select>
                      <select
                        data-field="dob_day"
                        style={fieldStyle(false, { flex: 1 })}
                        {...register('dob_day')}
                      >
                        {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        placeholder="Year"
                        data-field="dob_year"
                        style={fieldStyle(false, { flex: 1.5 })}
                        {...register('dob_year')}
                      />
                    </div>
                  </FormGroup>
                  <FormGroup label="State of Driving License / State ID" htmlFor="emp-dl-state">
                    <select
                      id="emp-dl-state"
                      data-field="driving_license_state"
                      style={fieldStyle(false)}
                      {...register('driving_license_state')}
                    >
                      <option value="">Select State</option>
                      {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </FormGroup>
                  <FormGroup label="Driving License Number / State ID" htmlFor="emp-dl">
                    <input
                      id="emp-dl"
                      type="text"
                      className="form-control"
                      placeholder="Driving License"
                      data-field="driving_license"
                      style={fieldStyle(false)}
                      {...register('driving_license')}
                    />
                  </FormGroup>
                </div>

                {/* Row 3 */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <FormGroup label="Gender" htmlFor="emp-gender" required>
                    <div style={{ display: 'flex', gap: '1.5rem', paddingTop: '0.5rem' }}>
                      {[['1', 'Male'], ['2', 'Female'], ['3', 'Prefer not to declare']].map(([val, lbl]) => (
                        <label key={val} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                          <input type="radio" value={val} {...register('gender')} /> {lbl}
                        </label>
                      ))}
                    </div>
                  </FormGroup>
                  <FormGroup label="Street 1" htmlFor="emp-street1">
                    <input
                      id="emp-street1"
                      type="text"
                      className="form-control"
                      placeholder="Home Address"
                      data-field="street1"
                      style={fieldStyle(false)}
                      {...register('street1')}
                    />
                  </FormGroup>
                  <FormGroup label="Street 2" htmlFor="emp-street2">
                    <input
                      id="emp-street2"
                      type="text"
                      className="form-control"
                      placeholder="Home Address"
                      data-field="street2"
                      style={fieldStyle(false)}
                      {...register('street2')}
                    />
                  </FormGroup>
                </div>

                {/* Row 4 */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                  <FormGroup label="City" htmlFor="emp-city">
                    <input
                      id="emp-city"
                      type="text"
                      className="form-control"
                      placeholder="City"
                      data-field="city"
                      style={fieldStyle(false)}
                      {...register('city')}
                    />
                  </FormGroup>
                  <FormGroup label="State" htmlFor="emp-state">
                    <select
                      id="emp-state"
                      data-field="state"
                      style={fieldStyle(false)}
                      {...register('state')}
                    >
                      <option value="">Select State</option>
                      {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </FormGroup>
                  <FormGroup label="Zip Code" htmlFor="emp-zip">
                    <input
                      id="emp-zip"
                      type="number"
                      className="form-control"
                      placeholder="ZIP Code"
                      data-field="zipcode"
                      style={fieldStyle(false)}
                      {...register('zipcode')}
                    />
                  </FormGroup>
                </div>

                {/* Row 5 */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                  <FormGroup label="Email" htmlFor="emp-email" error={errors.email?.message}>
                    <input
                      id="emp-email"
                      type="email"
                      className="form-control"
                      placeholder="Email"
                      data-field="email"
                      aria-invalid={!!errors.email}
                      style={fieldStyle(!!errors.email)}
                      {...register('email')}
                    />
                  </FormGroup>
                  <FormGroup label="Last 4 Digits of your SSN" htmlFor="emp-ssn">
                    <input
                      id="emp-ssn"
                      type="text"
                      className="form-control"
                      placeholder="SSN"
                      maxLength={4}
                      data-field="ssn"
                      style={fieldStyle(false)}
                      {...register('ssn')}
                    />
                  </FormGroup>
                  <FormGroup label="Department" htmlFor="emp-dept">
                    <input
                      id="emp-dept"
                      type="text"
                      className="form-control"
                      placeholder="Department"
                      data-field="department"
                      style={fieldStyle(false)}
                      {...register('department')}
                    />
                  </FormGroup>
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  <button type="submit" className="btn" disabled={saving} style={{ background: '#17a2b8', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1.5rem' }}>
                    <MdSave size={16} /> {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button type="button" className="btn" onClick={() => reset(emptyForm)} style={{ background: '#595959', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1.5rem' }}>
                    <MdRefresh size={16} /> Reset Data
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <TopNav title="Manage Employee" />
      <div style={{ padding: '1.5rem' }}>
        <ListingTable
          title="List of Employees"
          className="employee-listing"
          columns={employeeColumns}
          rows={employees}
          loading={loading}
          emptyText="No employees found."
          headerActions={(
            <button type="button" className="employee-add-button" onClick={openAdd}>
              Add Employee
            </button>
          )}
          actionsLabel="Actions"
          actionsWidth={130}
          defaultPageSize={10}
          rowActions={employee => (
            <ActionIcons
              onEdit={() => openEdit(employee)}
              onToggleStatus={() => toggleStatus(employee)}
              onDelete={() => remove(employee.id)}
              statusActive={!!employee.status}
              editTitle="Edit Employee"
              deleteTitle="Delete Employee"
            />
          )}
        />
      </div>
    </div>
  );
}
