'use client';
import { useState, useEffect } from 'react';
import TopNav from '../../../components/TopNav';
import { useConfirm } from '../../../components/ConfirmModal';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('superadmin_token') || '' : ''; }

// ─── Types ───────────────────────────────────────────────────────────────────
interface B2BClient {
  id: number; company_name: string; contact_person_name: string;
  mobile: string; email: string; address: string; status: boolean;
  public_email: string; public_phone_no: string; pincode: string;
  support_email: string; support_mobile: string; support_person_name: string;
  website: string; medical_officer_name: string; mrocc: string; clia_number: string;
  smtp_server: string; smtp_port: string; smtp_email: string; smtp_password: string;
  tagline: string; public_fax: string; primary_color_code: string; approval_note: string;
  password?: string;
}
interface Subscription { id: number; start_date: string; end_date: string; amount: number; b2b_client_id: number; }
interface LabTest { id: number; name: string; description: string; b2b_client_lab_test_access_id?: number; is_selected?: boolean; }

const emptyClient = {
  company_name: '', contact_person_name: '', mobile: '', email: '', address: '',
  public_email: '', public_phone_no: '', public_fax: '', pincode: '',
  support_email: '', support_mobile: '', support_person_name: '',
  website: '', medical_officer_name: '', medical_officer_position: '', mrocc: '', clia_number: '',
  smtp_server: '', smtp_port: '', smtp_email: '', smtp_password: '',
  tagline: '', primary_color_code: '', approval_note: '', password: '',
};

type View = 'list' | 'form' | 'subscription' | 'labtestaccess' | 'documents';

// ─── Message Banner ───────────────────────────────────────────────────────────
function MsgBanner({ msg }: { msg: { type: 'success' | 'error'; text: string } | null }) {
  if (!msg) return null;
  return (
    <div style={{
      background: msg.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
      border: `1px solid ${msg.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
      borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1rem',
      fontSize: '0.875rem', color: msg.type === 'success' ? '#10b981' : '#ef4444'
    }}>{msg.text}</div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function B2BClientsPage() {
  const confirmDialog = useConfirm();
  const [clients, setClients] = useState<B2BClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('list');
  const [selectedClient, setSelectedClient] = useState<B2BClient | null>(null);
  const [form, setForm] = useState<Record<string, string>>({ ...emptyClient });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [search, setSearch] = useState('');

  // Subscriptions
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [subForm, setSubForm] = useState({ start_date: '', end_date: '', amount: '' });
  const [editingSubId, setEditingSubId] = useState<number | null>(null);

  // Documents
  const [documents, setDocuments] = useState<any[]>([]);
  const [docTypes, setDocTypes] = useState<{id: number, name: string}[]>([]);
  const [docForm, setDocForm] = useState<{typeDataId: string, file: File | null}>({ typeDataId: '', file: null });

  // Lab Test Access
  const [labTests, setLabTests] = useState<LabTest[]>([]);

  // File uploads for B2B Client
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [reportHeaderFile, setReportHeaderFile] = useState<File | null>(null);
  const [reportFooterFile, setReportFooterFile] = useState<File | null>(null);
  const [medOfficerSigFile, setMedOfficerSigFile] = useState<File | null>(null);
  const [isApproval, setIsApproval] = useState(false);

  const loadClients = () => {
    setLoading(true);
    fetch(`${API}/api/B2bClients`, { headers: { token: getToken() } })
      .then(r => r.json())
      .then(d => { if (d.response_code === '200') setClients(d.obj || []); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadClients(); }, []);

  // ── B2B Client CRUD ──────────────────────────────────────────────────────
  const openAdd = () => {
    setEditingId(null);
    setForm({ ...emptyClient });
    setMsg(null);
    setView('form');
  };

  const openEdit = (c: B2BClient) => {
    setEditingId(c.id);
    setForm({ ...emptyClient, ...c as unknown as Record<string, string> });
    setIsApproval(!!(c as any).is_approval);
    setMsg(null);
    setView('form');
  };

  const saveClient = async () => {
    if (!form.company_name || !form.email) {
      setMsg({ type: 'error', text: 'Company Name and Login Email are required.' }); return;
    }
    setSaving(true); setMsg(null);
    const method = editingId ? 'PUT' : 'POST';
    const url = `${API}/api/B2bClients${editingId ? `/${editingId}` : ''}`;

    // Use FormData if any file is attached, otherwise JSON
    const hasFiles = logoFile || reportHeaderFile || reportFooterFile || medOfficerSigFile;
    let res: Response;
    if (hasFiles) {
      const fd = new FormData();
      Object.entries({ ...form, role_id: '2', status: 'true', is_approval: String(isApproval) }).forEach(([k, v]) => fd.append(k, v as string));
      if (logoFile) fd.append('logo_file', logoFile);
      if (reportHeaderFile) fd.append('report_header_file', reportHeaderFile);
      if (reportFooterFile) fd.append('report_footer_file', reportFooterFile);
      if (medOfficerSigFile) fd.append('medical_officer_signature_file', medOfficerSigFile);
      res = await fetch(url, { method, headers: { token: getToken() }, body: fd });
    } else {
      res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json', token: getToken() },
        body: JSON.stringify({ ...form, role_id: 2, status: true, deleted: false, is_approval: isApproval })
      });
    }

    const d = await res.json();
    setSaving(false);
    if (d.response_code === '200') {
      setMsg({ type: 'success', text: `B2B Lab ${editingId ? 'updated' : 'added'} successfully.` });
      setLogoFile(null); setReportHeaderFile(null); setReportFooterFile(null); setMedOfficerSigFile(null);
      setIsApproval(false);
      setView('list');
      loadClients();
    } else {
      setMsg({ type: 'error', text: typeof d.obj === 'string' ? d.obj : JSON.stringify(d.obj) });
    }
  };

  const deleteClient = async (id: number) => {
    const ok = await confirmDialog({
      title: 'You are trying to delete B2B Lab, Please confirm',
      message: 'This cannot be restored once deleted.',
      cancelText: 'NO, WAIT!',
      confirmText: 'CONFIRM DELETION',
    });
    if (!ok) return;
    await fetch(`${API}/api/B2bClients/${id}`, { method: 'DELETE', headers: { token: getToken() } });
    loadClients();
  };

  const toggleStatus = async (c: B2BClient) => {
    await fetch(`${API}/api/B2bClients/${c.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', token: getToken() },
      body: JSON.stringify({ status: !c.status })
    });
    loadClients();
  };

  // ── Subscriptions ─────────────────────────────────────────────────────────
  const loadSubscriptions = (clientId: number) => {
    fetch(`${API}/api/B2bClientSubscription?b2b_client_id=${clientId}`, { headers: { token: getToken() } })
      .then(r => r.json())
      .then(d => { if (d.response_code === '200') setSubscriptions(d.obj || []); });
  };

  const openSubscription = (c: B2BClient) => {
    setSelectedClient(c);
    setSubForm({ start_date: '', end_date: '', amount: '' });
    setEditingSubId(null);
    loadSubscriptions(c.id);
    setView('subscription');
  };

  const saveSub = async () => {
    if (!subForm.start_date || !subForm.end_date || !subForm.amount) {
      setMsg({ type: 'error', text: 'All fields are required.' }); return;
    }
    if (new Date(subForm.end_date) <= new Date(subForm.start_date)) {
      setMsg({ type: 'error', text: 'End date must be after start date.' }); return;
    }
    if (isNaN(Number(subForm.amount)) || Number(subForm.amount) <= 0) {
      setMsg({ type: 'error', text: 'Amount must be a positive number.' }); return;
    }
    const method = editingSubId ? 'PUT' : 'POST';
    const url = `${API}/api/B2bClientSubscription${editingSubId ? `/${editingSubId}` : ''}`;
    await fetch(url, {
      method, headers: { 'Content-Type': 'application/json', token: getToken() },
      body: JSON.stringify({ ...subForm, b2b_client_id: selectedClient?.id })
    });
    setSubForm({ start_date: '', end_date: '', amount: '' });
    setEditingSubId(null);
    if (selectedClient) loadSubscriptions(selectedClient.id);
  };

  const deleteSub = async (id: number) => {
    const ok = await confirmDialog({
      title: 'You are trying to delete Lab Subscription Details, Please confirm',
      message: 'This cannot be restored once deleted.',
      cancelText: 'NO, WAIT!',
      confirmText: 'CONFIRM DELETION',
    });
    if (!ok) return;
    await fetch(`${API}/api/B2bClientSubscription/${id}`, { method: 'DELETE', headers: { token: getToken() } });
    if (selectedClient) loadSubscriptions(selectedClient.id);
  };

  // ── Documents ─────────────────────────────────────────────────────────────
  const loadDocTypes = () => {
    fetch(`${API}/api/TypeData`, { headers: { token: getToken() } })
      .then(r => r.json())
      .then(d => { if (d.response_code === '200') setDocTypes(d.obj || []); });
  };

  const loadDocuments = (clientId: number) => {
    fetch(`${API}/api/B2bClientDocument/getB2bClientDocumentList`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', token: getToken() },
      body: JSON.stringify({ b2b_client_id: clientId })
    })
      .then(r => r.json())
      .then(d => { if (d.response_code === '200') setDocuments(d.obj || []); });
  };

  const openDocuments = (c: B2BClient) => {
    setSelectedClient(c);
    if (docTypes.length === 0) loadDocTypes();
    loadDocuments(c.id);
    setDocForm({ typeDataId: '', file: null });
    setView('documents');
  };

  const saveDoc = async () => {
    if (!docForm.typeDataId || !docForm.file) {
      setMsg({ type: 'error', text: 'Document Type and File are required.' }); return;
    }
    const formData = new FormData();
    formData.append('b2bClientId', String(selectedClient?.id));
    formData.append('typeDataId', docForm.typeDataId);
    formData.append('UploadFile', docForm.file);

    await fetch(`${API}/api/B2bClientDocument/saveB2bClientDocument`, {
      method: 'POST', headers: { token: getToken() },
      body: formData
    });
    setDocForm({ typeDataId: '', file: null });
    setMsg({ type: 'success', text: 'Document uploaded successfully.' });
    if (selectedClient) loadDocuments(selectedClient.id);
  };

  const deleteDoc = async (id: number) => {
    const ok = await confirmDialog({
      title: 'You are trying to delete Document, Please confirm',
      message: 'This cannot be restored once deleted.',
      cancelText: 'NO, WAIT!',
      confirmText: 'CONFIRM DELETION',
    });
    if (!ok) return;
    await fetch(`${API}/api/B2bClientDocument/deleteB2bClientDocument`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', token: getToken() },
      body: JSON.stringify({ id })
    });
    if (selectedClient) loadDocuments(selectedClient.id);
  };

  // ── Lab Test Access ───────────────────────────────────────────────────────
  const openLabTestAccess = (c: B2BClient) => {
    setSelectedClient(c);
    fetch(`${API}/api/LabTests`, { headers: { token: getToken() } })
      .then(r => r.json())
      .then(d => {
        if (d.response_code === '200') {
          // Check which tests the B2B client already has access to
          fetch(`${API}/api/B2bClientLabTestAccess?b2b_client_id=${c.id}`, { headers: { token: getToken() } })
            .then(r2 => r2.json())
            .then(d2 => {
              const accessIds = new Set((d2.obj || []).map((a: { lab_test_id: number }) => a.lab_test_id));
              setLabTests(d.obj.map((t: LabTest) => ({ ...t, is_selected: accessIds.has(t.id) })));
            })
            .catch(() => setLabTests(d.obj));
        }
      });
    setView('labtestaccess');
  };

  const saveLabTestAccess = async () => {
    const selected = labTests.filter(t => t.is_selected).map(t => t.id);
    await fetch(`${API}/api/B2bClientLabTestAccess/bulk`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', token: getToken() },
      body: JSON.stringify({ b2b_client_id: selectedClient?.id, lab_test_ids: selected })
    });
    setMsg({ type: 'success', text: 'Lab Test Access saved successfully.' });
    setView('list');
  };

  const filtered = clients.filter(c =>
    !search ||
    c.company_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.mobile?.includes(search)
  );

  const inp = (key: string, label: string, type = 'text', required = false) => (
    <div className="form-group" key={key}>
      <label>{label}{required && <span style={{ color: '#ef4444' }}> *</span>}</label>
      <input type={type} value={form[key] || ''} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} placeholder={`Enter ${label}`} />
    </div>
  );

  // ════════════════════════════════════════════════════════════════════════════
  // View: FORM (Add / Edit B2B Lab)
  // ════════════════════════════════════════════════════════════════════════════
  if (view === 'form') {
    return (
      <div className="page-content">
        <TopNav title="B2B Lab Details">
          <button className="btn btn-ghost" onClick={() => setView('list')}>✕ Close</button>
        </TopNav>
        <div style={{ padding: '1.5rem' }}>
          <MsgBanner msg={msg} />
          <div className="card">
            <div className="card-header"><span className="card-title">{editingId ? '✏️ Edit B2B Lab' : '➕ Add B2B Lab'}</span></div>
            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                {inp('company_name', 'B2B Company Name', 'text', true)}
                {inp('contact_person_name', 'Contact Person Name', 'text', true)}
                {inp('mobile', 'Mobile', 'text', true)}
                {inp('email', 'Login Email', 'email', true)}
                {inp('password', 'Login Password', 'text', true)}
                {inp('address', 'Address', 'text', true)}
                {inp('pincode', 'Pincode', 'text', true)}
                {inp('public_email', 'Public Email', 'email', true)}
                {inp('public_phone_no', 'Public Phone Number', 'text', true)}
                {inp('public_fax', 'Public Fax')}
                {inp('support_email', 'Support Email')}
                {inp('support_mobile', 'Support Mobile')}
                {inp('support_person_name', 'Support Person Name')}
                {inp('website', 'Website')}
                {inp('tagline', 'Tagline')}
                {inp('primary_color_code', 'Primary Colour Code')}
                {inp('medical_officer_name', 'Medical Officer Name', 'text', true)}
                {inp('medical_officer_position', 'Medical Officer Position')}
                {inp('mrocc', 'MROCC', 'text', true)}
                {inp('clia_number', 'CLIA Number', 'text', true)}
                {inp('smtp_server', 'SMTP Server', 'text', true)}
                {inp('smtp_port', 'SMTP Port', 'text', true)}
                {inp('smtp_email', 'SMTP Email', 'email', true)}
                {inp('smtp_password', 'SMTP Password', 'password', true)}

                {/* Is Approval Toggle */}
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                  <label style={{ marginBottom: '0.5rem' }}>Approval Required</label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', padding: '0.55rem 0.75rem', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg-input)' }}>
                    <input type="checkbox" checked={isApproval} onChange={e => setIsApproval(e.target.checked)}
                      style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#6366f1' }} />
                    <span style={{ fontSize: '0.875rem' }}>{isApproval ? '✅ Approval Required' : 'No Approval Required'}</span>
                  </label>
                </div>

                {inp('approval_note', 'Approval Note')}

                {/* File Upload Fields */}
                <div className="form-group">
                  <label>Logo File <span style={{ color: '#ef4444' }}>*</span></label>
                  <input type="file" accept="image/*" onChange={e => setLogoFile(e.target.files?.[0] || null)}
                    style={{ display: 'block', width: '100%', padding: '0.4rem', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg-input)', color: 'var(--text)' }} />
                  {logoFile && <small style={{ color: 'var(--text-muted)' }}>Selected: {logoFile.name}</small>}
                </div>
                <div className="form-group">
                  <label>Report Header File</label>
                  <input type="file" accept="image/*" onChange={e => setReportHeaderFile(e.target.files?.[0] || null)}
                    style={{ display: 'block', width: '100%', padding: '0.4rem', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg-input)', color: 'var(--text)' }} />
                  {reportHeaderFile && <small style={{ color: 'var(--text-muted)' }}>Selected: {reportHeaderFile.name}</small>}
                </div>
                <div className="form-group">
                  <label>Report Footer File</label>
                  <input type="file" accept="image/*" onChange={e => setReportFooterFile(e.target.files?.[0] || null)}
                    style={{ display: 'block', width: '100%', padding: '0.4rem', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg-input)', color: 'var(--text)' }} />
                  {reportFooterFile && <small style={{ color: 'var(--text-muted)' }}>Selected: {reportFooterFile.name}</small>}
                </div>
                <div className="form-group">
                  <label>Medical Officer Signature <span style={{ color: '#ef4444' }}>*</span></label>
                  <input type="file" accept="image/*" onChange={e => setMedOfficerSigFile(e.target.files?.[0] || null)}
                    style={{ display: 'block', width: '100%', padding: '0.4rem', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg-input)', color: 'var(--text)' }} />
                  {medOfficerSigFile && <small style={{ color: 'var(--text-muted)' }}>Selected: {medOfficerSigFile.name}</small>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button className="btn btn-primary" onClick={saveClient} disabled={saving}>
                  {saving ? '⏳ Saving...' : '💾 Save'}
                </button>
                <button className="btn btn-ghost" onClick={() => { setForm({ ...emptyClient }); setMsg(null); }}>🔄 Reset</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // View: SUBSCRIPTIONS
  // ════════════════════════════════════════════════════════════════════════════
  if (view === 'subscription') {
    return (
      <div className="page-content">
        <TopNav title={`Subscriptions — ${selectedClient?.company_name || ''}`}>
          <button className="btn btn-ghost" onClick={() => { setView('list'); setMsg(null); }}>✕ Close</button>
        </TopNav>
        <div style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: '360px 1fr', gap: '1.5rem', alignItems: 'start' }}>
          {/* Form card */}
          <div className="card">
            <div className="card-header"><span className="card-title">Subscription Detail</span></div>
            <div className="card-body">
              <MsgBanner msg={msg} />
              <div className="form-group">
                <label>Start Date <span style={{ color: '#ef4444' }}>*</span></label>
                <input type="date" value={subForm.start_date} onChange={e => setSubForm(p => ({ ...p, start_date: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>End Date <span style={{ color: '#ef4444' }}>*</span></label>
                <input type="date" value={subForm.end_date} onChange={e => setSubForm(p => ({ ...p, end_date: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Amount <span style={{ color: '#ef4444' }}>*</span></label>
                <input type="number" value={subForm.amount} onChange={e => setSubForm(p => ({ ...p, amount: e.target.value }))} placeholder="Enter Amount" />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                <button className="btn btn-primary" onClick={saveSub}>💾 Save</button>
                <button className="btn btn-ghost" onClick={() => { setSubForm({ start_date: '', end_date: '', amount: '' }); setEditingSubId(null); }}>🔄 Reset</button>
              </div>
            </div>
          </div>

          {/* List card */}
          <div className="card">
            <div className="card-header"><span className="card-title">List of Subscriptions for &quot;{selectedClient?.company_name}&quot;</span></div>
            <div className="card-body" style={{ padding: 0 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Start Date', 'End Date', 'Amount', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.map(s => (
                    <tr key={s.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.75rem 1rem' }}>{s.start_date?.slice(0, 10) || '—'}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>{s.end_date?.slice(0, 10) || '—'}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>USD {s.amount}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <button className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', marginRight: '0.5rem' }}
                          onClick={() => { setSubForm({ start_date: s.start_date?.slice(0, 10) || '', end_date: s.end_date?.slice(0, 10) || '', amount: String(s.amount) }); setEditingSubId(s.id); }}>✏️ Edit</button>
                        <button className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', color: '#ef4444' }} onClick={() => deleteSub(s.id)}>🗑 Delete</button>
                      </td>
                    </tr>
                  ))}
                  {subscriptions.length === 0 && (
                    <tr><td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No subscriptions found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // View: DOCUMENTS
  // ════════════════════════════════════════════════════════════════════════════
  if (view === 'documents') {
    return (
      <div className="page-content">
        <TopNav title={`Documents — ${selectedClient?.company_name || ''}`}>
          <button className="btn btn-ghost" onClick={() => { if (selectedClient) loadDocuments(selectedClient.id); }}>🔄 Refresh</button>
          <button className="btn btn-ghost" onClick={() => { setView('list'); setMsg(null); }}>✕ Close</button>
        </TopNav>
        <div style={{ padding: '1.5rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          {/* Upload Form */}
          <div style={{ flex: '1 1 350px' }}>
            <MsgBanner msg={msg} />
            <div className="card">
              <div className="card-header"><span className="card-title">Upload Document</span></div>
              <div className="card-body">
                <div className="form-group">
                  <label>Document Type<span style={{ color: '#ef4444' }}> *</span></label>
                  <select value={docForm.typeDataId} onChange={e => setDocForm(p => ({ ...p, typeDataId: e.target.value }))}>
                    <option value="">-- Select Type --</option>
                    {docTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>File Upload<span style={{ color: '#ef4444' }}> *</span></label>
                  <input type="file" onChange={e => setDocForm(p => ({ ...p, file: e.target.files ? e.target.files[0] : null }))} />
                </div>
              </div>
              <div className="card-footer" style={{ display: 'flex', gap: '0.75rem' }}>
                <button className="btn btn-primary" onClick={saveDoc} disabled={!docForm.typeDataId || !docForm.file}>💾 Upload</button>
                <button className="btn btn-ghost" onClick={() => setDocForm({ typeDataId: '', file: null })}>Reset</button>
              </div>
            </div>
          </div>
          
          {/* List */}
          <div style={{ flex: '2 1 500px' }}>
            <div className="card">
              <div className="card-header"><span className="card-title">Uploaded Documents</span></div>
              <div className="card-body" style={{ padding: 0 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--text-muted)' }}>Document Type</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'center', color: 'var(--text-muted)', width: 150 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documents.map(d => (
                      <tr key={d.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>{d.typeData}</td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                            <a href={`${API}/api/B2bClientDocument/file/${d.file_name}`} target="_blank" rel="noreferrer" title="View" className="btn btn-ghost" style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem', background: 'rgba(47,81,131,0.1)', color: '#2f5183' }}>👁 View</a>
                            <button title="Delete" className="btn btn-ghost" style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem', color: '#ef4444' }} onClick={() => deleteDoc(d.id)}>🗑</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {documents.length === 0 && (
                      <tr><td colSpan={2} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No documents found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // View: LAB TEST ACCESS
  // ════════════════════════════════════════════════════════════════════════════
  if (view === 'labtestaccess') {
    return (
      <div className="page-content">
        <TopNav title={`Lab Test Access — ${selectedClient?.company_name || ''}`}>
          <button className="btn btn-primary" onClick={saveLabTestAccess}>💾 Save</button>
            <button className="btn btn-ghost" onClick={() => { if (selectedClient) openLabTestAccess(selectedClient); }}>🔄 Refresh</button>
            <button className="btn btn-ghost" onClick={() => { setView('list'); setMsg(null); }}>✕ Close</button>
        </TopNav>
        <div style={{ padding: '1.5rem' }}>
          <MsgBanner msg={msg} />
          <div className="card">
            <div className="card-header"><span className="card-title">List of Lab Test Access for &quot;{selectedClient?.company_name}&quot;</span></div>
            <div className="card-body" style={{ padding: 0 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--text-muted)', width: 60 }}>Select</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--text-muted)' }}>Name</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--text-muted)' }}>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {labTests.map(t => (
                    <tr key={t.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <input type="checkbox" checked={!!t.is_selected}
                          onChange={() => setLabTests(prev => prev.map(lt => lt.id === t.id ? { ...lt, is_selected: !lt.is_selected } : lt))} />
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>{t.name}</td>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>{t.description || '—'}</td>
                    </tr>
                  ))}
                  {labTests.length === 0 && (
                    <tr><td colSpan={3} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No lab tests found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="card-footer" style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-primary" onClick={saveLabTestAccess}>💾 Save</button>
              <button className="btn btn-ghost" onClick={() => { setView('list'); setMsg(null); }}>✕ Close</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // View: LIST (default)
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="page-content">
      <TopNav title="B2B Labs">
          <input type="text" placeholder="Search B2B labs..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.5rem 0.75rem', color: 'var(--text)', fontSize: '0.875rem', width: 240 }} />
          <button className="btn btn-ghost" onClick={loadClients}>🔄 Refresh</button>
          <button id="add-b2b-btn" className="btn btn-primary" onClick={openAdd}>➕ Add B2B Lab</button>
        </TopNav>
      <div style={{ padding: '1.5rem' }}>
        <div className="card">
          <div className="card-body" style={{ padding: 0 }}>
            {loading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No B2B Labs found.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Company Name', 'Mobile', 'Email', 'Configurations', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c => (
                    <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
                      onMouseLeave={e => (e.currentTarget.style.background = '')}>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>{c.company_name}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>{c.mobile || '—'}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>{c.email}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <button title="Documents" className="btn btn-ghost"
                            style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem', background: 'rgba(34,138,202,0.1)', color: '#228aca', border: '1px solid rgba(34,138,202,0.3)' }}
                            onClick={() => openDocuments(c)}>📄 Docs</button>
                          <button title="Subscription" className="btn btn-ghost"
                            style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem', background: 'rgba(13,138,111,0.1)', color: '#0d8a6f', border: '1px solid rgba(13,138,111,0.3)' }}
                            onClick={() => openSubscription(c)}>💵 Sub</button>
                          <button title="Lab Test Access" className="btn btn-ghost"
                            style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}
                            onClick={() => openLabTestAccess(c)}>⚙️ Tests</button>
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <button title="Edit" className="btn btn-ghost" style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }} onClick={() => openEdit(c)}>✏️</button>
                          <button title={c.status ? 'Disable' : 'Enable'} className="btn btn-ghost"
                            style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem', color: c.status ? '#10b981' : '#9ca3af' }}
                            onClick={() => toggleStatus(c)}>{c.status ? '🟢' : '🔴'}</button>
                          <button title="Delete" className="btn btn-ghost"
                            style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem', color: '#ef4444' }}
                            onClick={() => deleteClient(c.id)}>🗑</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
