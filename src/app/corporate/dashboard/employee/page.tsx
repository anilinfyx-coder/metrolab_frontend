'use client';
import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { MdAdd, MdEdit, MdRefresh, MdSave } from 'react-icons/md';
import TopNav from '../../../components/TopNav';
import { useConfirm } from '../../../components/ConfirmModal';
import ListingTable, { ActionIcons, ListingColumn } from '../../../components/ListingTable';
import { FormGroup } from '../../../components/FormField';
import { apiFetch } from '../../../../lib/api';
import { patchListItem } from '../../../../lib/listState';
import { createInvalidHandler, fieldStyle, formResolver, registerMobile } from '../../../../lib/formHelpers';
import {
  corporateEmployeeSchema,
  type CorporateEmployeeFormValues,
} from '../../../../lib/schemas';

function getStoredUser() {
  if (typeof window === 'undefined') return null;
  try { return JSON.parse(localStorage.getItem('corporate_user') || '{}'); } catch { return {}; }
}



interface Employee {
  id: number; first_name: string; last_name: string; mobile: string; department: string; status: boolean; email?: string;
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const confirmDialog = useConfirm();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [statesList, setStatesList] = useState<{id: number, name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState<any[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);

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
    apiFetch<any[]>('/api/State', { tokenKey: 'corporate_token' })
      .then(data => { if (data) setStatesList(data); })
      .catch(() => {});
  }, []);

  const downloadFormat = () => {
    const headers = "first_name,last_name,mobile,gender,dob,driving_license_state,driving_license,street1,street2,city,state,zipcode,email,ssn,department\n";
    const sample = "John,Doe,1234567890,Male,1990-01-01,NY,DL1234,123 Main St,Apt 1,New York,NY,10001,john@example.com,1234,Sales\n";
    const blob = new Blob([headers + sample], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'employee_import_format.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCSVSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) {
        setImportErrors(['File is empty or missing data rows.']);
        setImportData([]);
        if (e.target) e.target.value = '';
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const data = lines.slice(1).map(line => {
        const values = line.split(',');
        const obj: any = {};
        headers.forEach((h, i) => {
          obj[h] = (values[i] || '').trim();
        });
        return obj;
      });

      const errors: string[] = [];
      const parsedEmployees: any[] = [];
      const seenKeys = new Set<string>();

      data.forEach((emp, index) => {
        const rowNum = index + 2;
        if (!emp.first_name || !emp.last_name || !emp.mobile) {
          errors.push(`Row ${rowNum}: First Name, Last Name, and Mobile are required.`);
        } else if (emp.mobile.length < 9 || emp.mobile.length > 10) {
          errors.push(`Row ${rowNum}: Mobile must be 9-10 digits.`);
        }

        if (emp.email) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(emp.email)) {
            errors.push(`Row ${rowNum}: Invalid email format (${emp.email}).`);
          }
        }

        const currentEmail = emp.email ? emp.email.toLowerCase() : '';
        const compositeKey = `${emp.mobile}_${currentEmail}`;
        
        if (employees.some(e => e.mobile === emp.mobile && (e.email || '').toLowerCase() === currentEmail)) {
          errors.push(`Row ${rowNum}: The combination of Mobile (${emp.mobile}) and Email (${emp.email || 'N/A'}) already exists in the system.`);
        } else if (seenKeys.has(compositeKey)) {
          errors.push(`Row ${rowNum}: The combination of Mobile and Email is duplicated within the CSV.`);
        }
        seenKeys.add(compositeKey);
        
        let gender = 1;
        const genderStr = (emp.gender || '').toLowerCase();
        if (genderStr === 'female' || genderStr === '2') gender = 2;
        else if (genderStr.includes('prefer') || genderStr === '3') gender = 3;

        parsedEmployees.push({
          ...emp,
          genderId: gender
        });
      });

      setImportErrors(errors);
      setImportData(parsedEmployees);
      if (e.target) e.target.value = '';
    };
    reader.readAsText(file);
  };

  const submitImport = async () => {
    if (importErrors.length > 0 || importData.length === 0) return;
    setIsImporting(true);
    const user = getStoredUser();
    let successCount = 0;
    let errorCount = 0;

    try {
      const dbStatesResponse = await apiFetch<any[]>('/api/State', { tokenKey: 'corporate_token', errorFallback: 'Failed to load states.' });
      const dbStates = dbStatesResponse || [];
      
      const stateMap = new Map<string, string>();
      dbStates.forEach(s => {
        if (s.name) stateMap.set(s.name.toLowerCase().trim(), String(s.id));
      });

      const resolveStateId = async (stateName: string) => {
        if (!stateName) return '';
        const nameLower = stateName.toLowerCase().trim();
        if (stateMap.has(nameLower)) return stateMap.get(nameLower) as string;

        try {
          const res = await apiFetch<any>('/api/State', {
            method: 'POST',
            tokenKey: 'corporate_token',
            body: JSON.stringify({ name: stateName.trim(), status: true }),
            successMessage: '',
            errorFallback: ''
          });
          if (res && res.id) {
            stateMap.set(nameLower, String(res.id));
            return String(res.id);
          }
        } catch {
          // ignore
        }
        return stateName; // fallback to name
      };

      for (const emp of importData) {
        const stateId = await resolveStateId(emp.state);
        const dlStateId = await resolveStateId(emp.driving_license_state);

        const payload = {
          first_name: emp.first_name,
          last_name: emp.last_name,
          mobile: emp.mobile,
          gender: emp.genderId,
          dob: emp.dob || null,
          driving_license_state: dlStateId || emp.driving_license_state || '',
          driving_license: emp.driving_license || '',
          street1: emp.street1 || '',
          street2: emp.street2 || '',
          city: emp.city || '',
          state: stateId || emp.state || '',
          zipcode: emp.zipcode || '',
          email: emp.email || '',
          ssn: emp.ssn || '',
          department: emp.department || '',
          corporate_client_id: user?.id,
        };

        try {
          await apiFetch('/api/Employees', {
            method: 'POST',
            tokenKey: 'corporate_token',
            body: JSON.stringify(payload),
            successMessage: '',
            errorFallback: ''
          });
          successCount++;
        } catch {
          errorCount++;
        }
      }
    } catch (err) {
      console.error("Import process failed:", err);
    }

    alert(`Import complete: ${successCount} added, ${errorCount} failed/skipped.`);
    setShowImportModal(false);
    setImportData([]);
    setImportErrors([]);
    setIsImporting(false);
    loadEmployees();
  };

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

    const normalizeState = (val: string) => {
      if (!val) return '';
      if (!isNaN(Number(val))) return val;
      const found = statesList.find(s => s.name?.toLowerCase() === val.toLowerCase());
      return found ? String(found.id) : val;
    };
    employeeValues.state = normalizeState(employeeValues.state as string);
    employeeValues.driving_license_state = normalizeState(employeeValues.driving_license_state as string);

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
                      data-field="mobile"
                      aria-invalid={!!errors.mobile}
                      style={fieldStyle(!!errors.mobile)}
                      {...registerMobile(register, 'mobile')}
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
                      {statesList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
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
                      {statesList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
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
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                type="button" 
                onClick={() => {
                  setImportData([]);
                  setImportErrors([]);
                  setShowImportModal(true);
                }}
                style={{ background: '#f8f9fa', color: '#333', border: '1px solid #ccc', padding: '0.4rem 1rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem' }}
              >
                Import CSV
              </button>
              <button type="button" className="employee-add-button" onClick={openAdd}>
                Add Employee
              </button>
            </div>
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

      {showImportModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ width: '600px', maxWidth: '90%', maxHeight: '90vh', overflowY: 'auto', background: '#fff', borderRadius: '8px', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '1rem', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#333' }}>Import Employees via CSV</h3>
              <button onClick={() => setShowImportModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '1.5rem' }}>
              <button type="button" onClick={downloadFormat} style={{ background: '#f8f9fa', color: '#333', border: '1px solid #ccc', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer' }}>
                Download CSV Format
              </button>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Upload CSV File</label>
              <input type="file" accept=".csv" onChange={handleCSVSelect} style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }} />
            </div>

            {importErrors.length > 0 && (
              <div style={{ background: '#ffebee', color: '#c62828', padding: '1rem', borderRadius: '4px', marginBottom: '1.5rem', maxHeight: '200px', overflowY: 'auto' }}>
                <strong>Validation Errors ({importErrors.length}):</strong>
                <ul style={{ margin: 0, paddingLeft: '1.5rem', marginTop: '0.5rem', fontSize: '0.9rem' }}>
                  {importErrors.map((err, i) => <li key={i}>{err}</li>)}
                </ul>
              </div>
            )}

            {importData.length > 0 && importErrors.length === 0 && (
              <div style={{ background: '#e8f5e9', color: '#2e7d32', padding: '1rem', borderRadius: '4px', marginBottom: '1.5rem' }}>
                <strong>Validation Passed!</strong> {importData.length} valid rows found. Ready to import.
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button type="button" onClick={() => setShowImportModal(false)} style={{ background: '#f8f9fa', color: '#333', border: '1px solid #ccc', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
              <button 
                type="button" 
                onClick={submitImport} 
                disabled={isImporting || importErrors.length > 0 || importData.length === 0}
                style={{ background: '#17a2b8', color: '#fff', border: 'none', padding: '0.5rem 1.5rem', borderRadius: '4px', cursor: (isImporting || importErrors.length > 0 || importData.length === 0) ? 'not-allowed' : 'pointer', opacity: (isImporting || importErrors.length > 0 || importData.length === 0) ? 0.6 : 1 }}
              >
                {isImporting ? 'Importing...' : 'Submit Import'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
