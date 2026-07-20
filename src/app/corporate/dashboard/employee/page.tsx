'use client';
import { useState, useEffect } from 'react';
import { MdAdd, MdEdit, MdRefresh, MdSave } from 'react-icons/md';
import TopNav from '../../../components/TopNav';
import { useConfirm } from '../../../components/ConfirmModal';
import ListingTable, { ActionIcons, ListingColumn } from '../../../components/ListingTable';
import { apiFetch, toastApiError } from '../../../../lib/api';

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

const emptyForm = {
  first_name: '', last_name: '', mobile: '', gender: '1', dob_month: '1', dob_day: '1', dob_year: '',
  driving_license_state: '', driving_license: '', street1: '', street2: '',
  city: '', state: '', zipcode: '', email: '', ssn: '', department: ''
};

export default function EmployeePage() {
  const confirmDialog = useConfirm();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Record<string, string | boolean>>({ ...emptyForm });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

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

  const openAdd = () => { setEditingId(null); setForm({ ...emptyForm }); setShowForm(true); };
  
  const openEdit = (e: Employee) => {
    setEditingId(e.id);
    const employeeValues = Object.fromEntries(
      Object.entries(e)
        .filter(([key]) => key !== 'id' && key !== 'status')
        .map(([key, value]) => [key, value == null ? '' : String(value)])
    );
    const dobParts = employeeValues.dob ? employeeValues.dob.split('T')[0].split('-') : ['', '1', '1'];
    setForm({
      ...emptyForm, ...employeeValues,
      dob_year: dobParts[0] || '', dob_month: String(parseInt(dobParts[1]) || 1), dob_day: String(parseInt(dobParts[2]) || 1),
      gender: employeeValues.gender || '1'
    });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.first_name || !form.last_name || !form.mobile) {
      toastApiError('First Name, Last Name, and Mobile are required.');
      return;
    }
    const mobileRegex = /^[0-9]{10}$/;
    if (!mobileRegex.test(form.mobile as string)) {
      toastApiError('Mobile number must be exactly 10 digits.');
      return;
    }

    setSaving(true);
    const dobString = form.dob_year
      ? `${form.dob_year}-${String(form.dob_month).padStart(2, '0')}-${String(form.dob_day).padStart(2, '0')}`
      : null;

    const user = getStoredUser();
    const payload = {
      first_name: form.first_name, last_name: form.last_name, mobile: form.mobile, gender: parseInt(form.gender as string),
      dob: dobString, driving_license_state: form.driving_license_state, driving_license: form.driving_license,
      street1: form.street1, street2: form.street2, city: form.city, state: form.state, zipcode: form.zipcode,
      email: form.email, ssn: form.ssn, department: form.department,
      corporate_client_id: user?.id
    };

    const method = editingId ? 'PUT' : 'POST';
    const path = `/api/Employees${editingId ? `/${editingId}` : ''}`;

    try {
      await apiFetch(path, {
        method,
        tokenKey: 'corporate_token',
        body: JSON.stringify(payload),
        errorFallback: 'Unable to save employee.',
      });
      setShowForm(false);
      loadEmployees();
    } catch {
      /* toast handled by apiFetch */
    } finally {
      setSaving(false);
    }
  };

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
        errorFallback: 'Unable to delete employee.',
      });
      loadEmployees();
    } catch {
      /* toast handled by apiFetch */
    }
  };

  const toggleStatus = async (e: Employee) => {
    try {
      await apiFetch(`/api/Employees/${e.id}`, {
        method: 'PUT',
        tokenKey: 'corporate_token',
        body: JSON.stringify({ status: !e.status }),
        errorFallback: 'Unable to update employee status.',
      });
      loadEmployees();
    } catch {
      /* toast handled by apiFetch */
    }
  };

  const inp = (key: string, ph: string, type = 'text', maxLength?: number) => (
    <input type={type} className="form-control" placeholder={ph} maxLength={maxLength}
      value={form[key] as string || ''} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} />
  );

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
            <div className="card-body">
              {/* Row 1 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group"><label>First Name <span style={{ color: '#ef4444' }}>*</span></label>{inp('first_name', 'First Name')}</div>
                <div className="form-group"><label>Last Name <span style={{ color: '#ef4444' }}>*</span></label>{inp('last_name', 'Last Name')}</div>
                <div className="form-group"><label>Mobile <span style={{ color: '#ef4444' }}>*</span></label>{inp('mobile', 'Mobile', 'text', 15)}</div>
              </div>

              {/* Row 2 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label>DOB (mm/dd/yyyy)</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <select value={form.dob_month as string} onChange={e => setForm(p => ({ ...p, dob_month: e.target.value }))} style={{ flex: 2, background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 6, padding: '0.5rem', color: 'var(--text)' }}>
                      {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                    </select>
                    <select value={form.dob_day as string} onChange={e => setForm(p => ({ ...p, dob_day: e.target.value }))} style={{ flex: 1, background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 6, padding: '0.5rem', color: 'var(--text)' }}>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <input type="number" placeholder="Year" value={form.dob_year as string} onChange={e => setForm(p => ({ ...p, dob_year: e.target.value }))} style={{ flex: 1.5, background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 6, padding: '0.5rem', color: 'var(--text)' }} />
                  </div>
                </div>
                <div className="form-group">
                  <label>State of Driving License / State ID</label>
                  <select value={form.driving_license_state as string} onChange={e => setForm(p => ({ ...p, driving_license_state: e.target.value }))} style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 6, padding: '0.5rem', color: 'var(--text)' }}>
                    <option value="">Select State</option>
                    {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Driving License Number / State ID</label>{inp('driving_license', 'Driving License')}</div>
              </div>

              {/* Row 3 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label>Gender <span style={{ color: '#ef4444' }}>*</span></label>
                  <div style={{ display: 'flex', gap: '1.5rem', paddingTop: '0.5rem' }}>
                    {[['1', 'Male'], ['2', 'Female'], ['3', 'Prefer not to declare']].map(([val, lbl]) => (
                      <label key={val} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                        <input type="radio" name="gender" value={val} checked={form.gender === val} onChange={() => setForm(p => ({ ...p, gender: val }))} /> {lbl}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="form-group"><label>Street 1</label>{inp('street1', 'Home Address')}</div>
                <div className="form-group"><label>Street 2</label>{inp('street2', 'Home Address')}</div>
              </div>

              {/* Row 4 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group"><label>City</label>{inp('city', 'City')}</div>
                <div className="form-group">
                  <label>State</label>
                  <select value={form.state as string} onChange={e => setForm(p => ({ ...p, state: e.target.value }))} style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 6, padding: '0.5rem', color: 'var(--text)' }}>
                    <option value="">Select State</option>
                    {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Zip Code</label>{inp('zipcode', 'ZIP Code', 'number')}</div>
              </div>

              {/* Row 5 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="form-group"><label>Email</label>{inp('email', 'Email', 'email')}</div>
                <div className="form-group"><label>Last 4 Digits of your SSN</label>{inp('ssn', 'SSN', 'text', 4)}</div>
                <div className="form-group"><label>Department</label>{inp('department', 'Department')}</div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button className="btn" onClick={save} disabled={saving} style={{ background: '#17a2b8', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1.5rem' }}>
                  <MdSave size={16} /> {saving ? 'Saving...' : 'Save'}
                </button>
                <button className="btn" onClick={() => { setForm({ ...emptyForm }); }} style={{ background: '#595959', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1.5rem' }}>
                  <MdRefresh size={16} /> Reset Data
                </button>
              </div>
            </div>
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
