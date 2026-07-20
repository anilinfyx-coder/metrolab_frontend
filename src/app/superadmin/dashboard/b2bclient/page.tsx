'use client';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  MdAccountBalanceWallet,
  MdAdd,
  MdAssignment,
  MdCheckCircle,
  MdClose,
  MdDelete,
  MdDescription,
  MdEdit,
  MdHourglassEmpty,
  MdPayment,
  MdRefresh,
  MdSave,
  MdSettings,
  MdVisibility,
} from 'react-icons/md';
import TopNav from '../../../components/TopNav';
import { useConfirm } from '../../../components/ConfirmModal';
import { formatDate, formatDateTime } from '../../../utils/dateFormat';
import ListingTable, { ActionIcons, ListingColumn, ListingHeaderActions } from '../../../components/ListingTable';
import { apiFetch, toastApiSuccess, API_BASE } from '../../../../lib/api';

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
interface B2BDocument { id: number; type_data_id: number; typeData: string; file_name: string; }

const emptyClient = {
  company_name: '', contact_person_name: '', mobile: '', email: '', address: '',
  public_email: '', public_phone_no: '', public_fax: '', pincode: '',
  support_email: '', support_mobile: '', support_person_name: '',
  website: '', medical_officer_name: '', medical_officer_position: '', mrocc: '', clia_number: '',
  smtp_server: '', smtp_port: '', smtp_email: '', smtp_password: '',
  tagline: '', primary_color_code: '', approval_note: '', password: '',
};

type View = 'list' | 'form' | 'subscription' | 'labtestaccess' | 'documents' | 'wallet';

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
  const [initViewHandled, setInitViewHandled] = useState(false);

  // Subscriptions
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [subForm, setSubForm] = useState({ start_date: '', end_date: '', amount: '' });
  const [editingSubId, setEditingSubId] = useState<number | null>(null);

  // Documents
  const [documents, setDocuments] = useState<B2BDocument[]>([]);
  const [docTypes, setDocTypes] = useState<{id: number, name: string}[]>([]);
  const [docForm, setDocForm] = useState<{ id: number | null; typeDataId: string; file: File | null; fileName: string }>({
    id: null,
    typeDataId: '',
    file: null,
    fileName: '',
  });

  // Lab Test Access
  const [labTests, setLabTests] = useState<LabTest[]>([]);

  // Wallet
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [walletHistory, setWalletHistory] = useState<any[]>([]);
  const [walletForm, setWalletForm] = useState({ amount: '', description: '' });
  const [walletSaving, setWalletSaving] = useState(false);

  // File uploads for B2B Client
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [reportHeaderFile, setReportHeaderFile] = useState<File | null>(null);
  const [reportFooterFile, setReportFooterFile] = useState<File | null>(null);
  const [medOfficerSigFile, setMedOfficerSigFile] = useState<File | null>(null);
  const [isApproval, setIsApproval] = useState(false);

  const loadClients = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<B2BClient[]>('/api/B2bClients', { tokenKey: 'superadmin_token' });
      setClients(data || []);
    } catch {
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadClients(); }, []);

  useEffect(() => {
    if (clients.length > 0 && !initViewHandled && typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const v = urlParams.get('view');
      const cid = urlParams.get('clientId');
      if (v === 'wallet' && cid) {
         const c = clients.find(x => x.id.toString() === cid);
         if (c) {
           setSelectedClient(c);
           setWalletBalance((c as any).wallet_balance || 0);
           setWalletForm({ amount: '', description: '' });
           fetch(`${API}/api/B2bClients/walletHistory/${c.id}`, { headers: { token: getToken() } })
             .then(r => r.json())
             .then(d => { if (d.response_code === '200') setWalletHistory(d.obj || []); });
           setView('wallet');
         }
      }
      setInitViewHandled(true);
    }
  }, [clients, initViewHandled]);

  // ── B2B Client CRUD ──────────────────────────────────────────────────────
  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$&*";
    let pass = "";
    for (let i = 0; i < 10; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length));
    return pass;
  };

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...emptyClient, password: generatePassword() });
    setView('form');
  };

  const openEdit = (c: B2BClient) => {
    setEditingId(c.id);
    setForm({ ...emptyClient, ...c as unknown as Record<string, string> });
    setIsApproval(!!(c as any).is_approval);
    setView('form');
  };

  const saveClient = async () => {
    if (!form.company_name || !form.email) {
      toast.error('Company Name and Login Email are required.');
      return;
    }
    setSaving(true);
    const method = editingId ? 'PUT' : 'POST';
    const path = `/api/B2bClients${editingId ? `/${editingId}` : ''}`;
    const hasFiles = logoFile || reportHeaderFile || reportFooterFile || medOfficerSigFile;
    try {
      if (hasFiles) {
        const fd = new FormData();
        Object.entries({ ...form, role_id: '2', status: 'true', is_approval: String(isApproval) }).forEach(([k, v]) => fd.append(k, v as string));
        if (logoFile) fd.append('logo_file', logoFile);
        if (reportHeaderFile) fd.append('report_header_file', reportHeaderFile);
        if (reportFooterFile) fd.append('report_footer_file', reportFooterFile);
        if (medOfficerSigFile) fd.append('medical_officer_signature_file', medOfficerSigFile);
        await apiFetch(path, {
          method,
          tokenKey: 'superadmin_token',
          body: fd,
          successMessage: `B2B Lab ${editingId ? 'updated' : 'added'} successfully.`,
          errorFallback: 'Unable to save B2B Lab.',
        });
      } else {
        await apiFetch(path, {
          method,
          tokenKey: 'superadmin_token',
          body: JSON.stringify({ ...form, role_id: 2, status: true, deleted: false, is_approval: isApproval }),
          successMessage: `B2B Lab ${editingId ? 'updated' : 'added'} successfully.`,
          errorFallback: 'Unable to save B2B Lab.',
        });
      }
      setLogoFile(null); setReportHeaderFile(null); setReportFooterFile(null); setMedOfficerSigFile(null);
      setIsApproval(false);
      setView('list');
      loadClients();
    } catch {
      /* error toasted by apiFetch */
    } finally {
      setSaving(false);
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
    try {
      await apiFetch(`/api/B2bClients/${id}`, { method: 'DELETE', tokenKey: 'superadmin_token' });
      loadClients();
    } catch {
      /* error toasted by apiFetch */
    }
  };

  const toggleStatus = async (c: B2BClient) => {
    try {
      await apiFetch(`/api/B2bClients/${c.id}`, {
        method: 'PUT',
        tokenKey: 'superadmin_token',
        body: JSON.stringify({ status: !c.status }),
      });
      loadClients();
    } catch {
      /* error toasted by apiFetch */
    }
  };

  // ── Subscriptions ─────────────────────────────────────────────────────────
  const loadSubscriptions = async (clientId: number) => {
    try {
      const data = await apiFetch<Subscription[]>(`/api/B2bClientSubscription?b2b_client_id=${clientId}`, { tokenKey: 'superadmin_token' });
      setSubscriptions(data || []);
    } catch {
      setSubscriptions([]);
    }
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
      toast.error('All fields are required.');
      return;
    }
    if (new Date(subForm.end_date) <= new Date(subForm.start_date)) {
      toast.error('End date must be after start date.');
      return;
    }
    if (isNaN(Number(subForm.amount)) || Number(subForm.amount) <= 0) {
      toast.error('Amount must be a positive number.');
      return;
    }
    const method = editingSubId ? 'PUT' : 'POST';
    const path = `/api/B2bClientSubscription${editingSubId ? `/${editingSubId}` : ''}`;
    try {
      await apiFetch(path, {
        method,
        tokenKey: 'superadmin_token',
        body: JSON.stringify({ ...subForm, b2b_client_id: selectedClient?.id }),
      });
      setSubForm({ start_date: '', end_date: '', amount: '' });
      setEditingSubId(null);
      if (selectedClient) loadSubscriptions(selectedClient.id);
    } catch {
      /* error toasted by apiFetch */
    }
  };

  const deleteSub = async (id: number) => {
    const ok = await confirmDialog({
      title: 'You are trying to delete Lab Subscription Details, Please confirm',
      message: 'This cannot be restored once deleted.',
      cancelText: 'NO, WAIT!',
      confirmText: 'CONFIRM DELETION',
    });
    if (!ok) return;
    try {
      await apiFetch(`/api/B2bClientSubscription/${id}`, { method: 'DELETE', tokenKey: 'superadmin_token' });
      if (selectedClient) loadSubscriptions(selectedClient.id);
    } catch {
      /* error toasted by apiFetch */
    }
  };

  // ── Documents ─────────────────────────────────────────────────────────────
  const loadDocTypes = async () => {
    try {
      const data = await apiFetch<{ id: number; name: string }[]>('/api/TypeData', { tokenKey: 'superadmin_token' });
      setDocTypes(data || []);
    } catch {
      setDocTypes([]);
    }
  };

  const loadDocuments = async (clientId: number) => {
    try {
      const data = await apiFetch<B2BDocument[]>('/api/B2bClientDocument/getB2bClientDocumentList', {
        method: 'POST',
        tokenKey: 'superadmin_token',
        body: JSON.stringify({ b2b_client_id: clientId }),
      });
      setDocuments(data || []);
    } catch {
      setDocuments([]);
    }
  };

  const openDocuments = (c: B2BClient) => {
    setSelectedClient(c);
    if (docTypes.length === 0) loadDocTypes();
    loadDocuments(c.id);
    setDocForm({ id: null, typeDataId: '', file: null, fileName: '' });
    setView('documents');
  };

  const saveDoc = async () => {
    if (!docForm.typeDataId || (!docForm.id && !docForm.file)) {
      toast.error('Document Type and File are required.');
      return;
    }
    const formData = new FormData();
    formData.append('b2bClientId', String(selectedClient?.id));
    formData.append('typeDataId', docForm.typeDataId);
    if (docForm.id) formData.append('id', String(docForm.id));
    if (docForm.fileName) formData.append('fileName', docForm.fileName);
    if (docForm.file) formData.append('UploadFile', docForm.file);

    try {
      await apiFetch('/api/B2bClientDocument/saveB2bClientDocument', {
        method: 'POST',
        tokenKey: 'superadmin_token',
        body: formData,
        successMessage: `Document ${docForm.id ? 'updated' : 'uploaded'} successfully.`,
        errorFallback: 'Unable to save document.',
      });
      setDocForm({ id: null, typeDataId: '', file: null, fileName: '' });
      if (selectedClient) loadDocuments(selectedClient.id);
    } catch {
      /* error toasted by apiFetch */
    }
  };

  const deleteDoc = async (id: number) => {
    const ok = await confirmDialog({
      title: 'You are trying to delete Document, Please confirm',
      message: 'This cannot be restored once deleted.',
      cancelText: 'NO, WAIT!',
      confirmText: 'CONFIRM DELETION',
    });
    if (!ok) return;
    try {
      await apiFetch('/api/B2bClientDocument/deleteB2bClientDocument', {
        method: 'POST',
        tokenKey: 'superadmin_token',
        body: JSON.stringify({ id }),
      });
      if (selectedClient) loadDocuments(selectedClient.id);
    } catch {
      /* error toasted by apiFetch */
    }
  };

  // ── Lab Test Access ───────────────────────────────────────────────────────
  const openLabTestAccess = async (c: B2BClient) => {
    setSelectedClient(c);
    try {
      const tests = await apiFetch<LabTest[]>('/api/LabTests', { tokenKey: 'superadmin_token' });
      try {
        const access = await apiFetch<{ lab_test_id: number }[]>(`/api/B2bClientLabTestAccess?b2b_client_id=${c.id}`, { tokenKey: 'superadmin_token' });
        const accessIds = new Set((access || []).map((a: { lab_test_id: number }) => a.lab_test_id));
        setLabTests((tests || []).map((t: LabTest) => ({ ...t, is_selected: accessIds.has(t.id) })));
      } catch {
        setLabTests(tests || []);
      }
    } catch {
      setLabTests([]);
    }
    setView('labtestaccess');
  };

  const saveLabTestAccess = async () => {
    const selected = labTests.filter(t => t.is_selected).map(t => t.id);
    try {
      await apiFetch('/api/B2bClientLabTestAccess/bulk', {
        method: 'POST',
        tokenKey: 'superadmin_token',
        body: JSON.stringify({ b2b_client_id: selectedClient?.id, lab_test_ids: selected }),
        successMessage: 'Lab Test Access saved successfully.',
        errorFallback: 'Unable to save lab test access.',
      });
      setView('list');
    } catch {
      /* error toasted by apiFetch */
    }
  };

  // ── Wallet ────────────────────────────────────────────────────────────────
  const openWallet = async (c: B2BClient) => {
    setSelectedClient(c);
    setWalletBalance((c as any).wallet_balance || 0);
    setWalletForm({ amount: '', description: '' });
    try {
      const history = await apiFetch<any[]>(`/api/B2bClients/walletHistory/${c.id}`, { tokenKey: 'superadmin_token' });
      setWalletHistory(history || []);
    } catch {
      setWalletHistory([]);
    }
    setView('wallet');
  };

  const rechargeWallet = async () => {
    if (!walletForm.amount || isNaN(Number(walletForm.amount)) || Number(walletForm.amount) <= 0) {
      toast.error('Please enter a valid positive amount.');
      return;
    }
    setWalletSaving(true);
    try {
      const result = await apiFetch<{ newBalance: number }>('/api/B2bClients/rechargeWallet', {
        method: 'POST',
        tokenKey: 'superadmin_token',
        body: JSON.stringify({
          b2b_client_id: selectedClient?.id,
          amount: Number(walletForm.amount),
          description: walletForm.description || 'Manual Recharge',
        }),
        errorFallback: 'Recharge failed.',
      });
      toastApiSuccess(`Wallet recharged successfully. New Balance: $${result.newBalance}`);
      setWalletBalance(result.newBalance);
      setWalletForm({ amount: '', description: '' });
      if (selectedClient) {
        try {
          const history = await apiFetch<any[]>(`/api/B2bClients/walletHistory/${selectedClient.id}`, { tokenKey: 'superadmin_token' });
          setWalletHistory(history || []);
        } catch {
          /* error toasted by apiFetch */
        }
      }
      loadClients();
    } catch {
      /* error toasted by apiFetch */
    } finally {
      setWalletSaving(false);
    }
  };

  const clientColumns: ListingColumn<B2BClient>[] = [
    { key: 'company_name', label: 'Company Name', width: '25%' },
    { key: 'mobile', label: 'Mobile', width: '20%' },
    { key: 'email', label: 'Email', width: '25%' },
    {
      key: 'configurations',
      label: 'Configurations',
      width: '18%',
      sortable: false,
      filterable: false,
      render: client => (
        <div className="listing-actions">
          <button type="button" className="action-btn action-btn-download" title="Documents" onClick={() => openDocuments(client)}>
            <MdDescription size={15} aria-hidden />
          </button>
          <button type="button" className="action-btn action-btn-status" title="Subscriptions" onClick={() => openSubscription(client)}>
            <span aria-hidden style={{ fontSize: '1rem', fontWeight: 700 }}>$</span>
          </button>
          <button type="button" className="action-btn b2b-config-settings" title="Lab Test Access" onClick={() => openLabTestAccess(client)}>
            <MdSettings size={15} aria-hidden />
          </button>
          <button type="button" className="action-btn action-btn-wallet" title="Wallet" onClick={() => openWallet(client)}>
            <MdAccountBalanceWallet size={15} aria-hidden />
          </button>
        </div>
      ),
    },
  ];

  const inp = (key: string, label: string, type = 'text', required = false, readOnly = false) => (
    <div className="form-group" key={key}>
      <label>{label}{required && <span style={{ color: '#ef4444' }}> *</span>}</label>
      <input type={type} value={form[key] || ''} onChange={e => !readOnly && setForm(p => ({ ...p, [key]: e.target.value }))} placeholder={`Enter ${label}`} readOnly={readOnly} style={readOnly ? { backgroundColor: 'var(--bg-card)', cursor: 'not-allowed' } : {}} />
    </div>
  );

  // ════════════════════════════════════════════════════════════════════════════
  // View: FORM (Add / Edit B2B Lab)
  // ════════════════════════════════════════════════════════════════════════════
  if (view === 'form') {
    return (
      <div className="page-content">
        <TopNav title="B2B Lab Details">
          <button className="btn btn-ghost" onClick={() => setView('list')}><MdClose size={16} style={{ verticalAlign: 'text-bottom', marginRight: '0.35rem' }} aria-hidden />Close</button>
        </TopNav>
        <div style={{ padding: '1.5rem' }}>
          <div className="card">
            <div className="card-header"><span className="card-title">{editingId ? <><MdEdit size={16} style={{ verticalAlign: 'text-bottom', marginRight: '0.35rem' }} aria-hidden />Edit B2B Lab</> : <><MdAdd size={16} style={{ verticalAlign: 'text-bottom', marginRight: '0.35rem' }} aria-hidden />Add B2B Lab</>}</span></div>
            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                {inp('company_name', 'B2B Company Name', 'text', true)}
                {inp('contact_person_name', 'Contact Person Name', 'text', true)}
                {inp('mobile', 'Mobile', 'text', true)}
                {inp('email', 'Login Email', 'email', true)}
                {inp('password', 'Login Password', 'password', true, true)}
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
                    <span style={{ fontSize: '0.875rem' }}>{isApproval ? <><MdCheckCircle size={16} style={{ verticalAlign: 'text-bottom', marginRight: '0.35rem' }} aria-hidden />Approval Required</> : 'No Approval Required'}</span>
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
                  {saving ? <><MdHourglassEmpty size={16} aria-hidden /> Saving...</> : <><MdSave size={16} aria-hidden /> Save</>}
                </button>
                <button className="btn btn-ghost" onClick={() => { setForm({ ...emptyClient }); }}><MdRefresh size={16} style={{ verticalAlign: 'text-bottom', marginRight: '0.35rem' }} aria-hidden />Reset</button>
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
          <button className="btn btn-ghost" onClick={() => { setView('list'); }}><MdClose size={16} style={{ verticalAlign: 'text-bottom', marginRight: '0.35rem' }} aria-hidden />Close</button>
        </TopNav>
        <div style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: '360px 1fr', gap: '1.5rem', alignItems: 'start' }}>
          {/* Form card */}
          <div className="card">
            <div className="card-header"><span className="card-title">Subscription Detail</span></div>
            <div className="card-body">
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
                <button className="btn btn-primary" onClick={saveSub}><MdSave size={16} style={{ verticalAlign: 'text-bottom', marginRight: '0.35rem' }} aria-hidden />Save</button>
                <button className="btn btn-ghost" onClick={() => { setSubForm({ start_date: '', end_date: '', amount: '' }); setEditingSubId(null); }}><MdRefresh size={16} style={{ verticalAlign: 'text-bottom', marginRight: '0.35rem' }} aria-hidden />Reset</button>
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
                      <td style={{ padding: '0.75rem 1rem' }}>{formatDate(s.start_date)}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>{formatDate(s.end_date)}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>USD {s.amount}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <button className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', marginRight: '0.5rem' }}
                          onClick={() => { setSubForm({ start_date: s.start_date?.slice(0, 10) || '', end_date: s.end_date?.slice(0, 10) || '', amount: String(s.amount) }); setEditingSubId(s.id); }}><MdEdit size={14} style={{ verticalAlign: 'text-bottom', marginRight: '0.25rem' }} aria-hidden />Edit</button>
                        <button className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', color: '#ef4444' }} onClick={() => deleteSub(s.id)}><MdDelete size={14} style={{ verticalAlign: 'text-bottom', marginRight: '0.25rem' }} aria-hidden />Delete</button>
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
    const documentColumns: ListingColumn<B2BDocument>[] = [
      {
        key: 'typeData',
        label: 'Document Type',
        width: '75%',
        getValue: document => document.typeData || '',
      },
    ];

    return (
      <div className="page-content">
        <TopNav title="Manage B2B Labs" />
        <div className="b2b-documents-split" style={{ padding: '1.5rem' }}>
          <div>
            <div className="card">
              <div className="card-header">
                <span className="card-title">{docForm.id ? 'Edit Document Detail' : 'Document Detail'}</span>
              </div>
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
                  {docForm.id && !docForm.file && (
                    <div style={{ marginTop: '0.35rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      Leave empty to keep the current file.
                    </div>
                  )}
                </div>
              </div>
              <div className="b2b-document-form-actions">
                <button className="btn btn-primary" onClick={saveDoc} disabled={!docForm.typeDataId || (!docForm.id && !docForm.file)}>
                  Save
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setDocForm({ id: null, typeDataId: '', file: null, fileName: '' })}
                >
                  Reset Data
                </button>
              </div>
            </div>
          </div>

          <ListingTable
            title={`List of Documents for B2B Labs ("${selectedClient?.company_name || ''}")`}
            columns={documentColumns}
            rows={documents}
            emptyText="No documents found."
            headerActions={(
              <button type="button" className="listing-header-link" onClick={() => { setView('list'); }}>
                Close
              </button>
            )}
            actionsLabel="Actions"
            actionsWidth={170}
            defaultPageSize={10}
            rowActions={document => (
              <div className="listing-actions">
                <button
                  type="button"
                  className="action-btn action-btn-view-eye"
                  title="View Document"
                  onClick={() => window.open(`${API_BASE}/api/B2bClientDocument/file/${document.file_name}`, '_blank', 'noopener,noreferrer')}
                >
                  <MdVisibility size={16} aria-hidden />
                </button>
                <button
                  type="button"
                  className="action-btn action-btn-edit"
                  title="Edit Document"
                  onClick={() => {
                    setDocForm({
                      id: document.id,
                      typeDataId: String(document.type_data_id),
                      file: null,
                      fileName: document.file_name,
                    });
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  <MdEdit size={15} aria-hidden />
                </button>
                <button type="button" className="action-btn action-btn-delete" title="Delete Document" onClick={() => deleteDoc(document.id)}>
                  <MdDelete size={14} aria-hidden />
                </button>
              </div>
            )}
          />
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
          <button className="btn btn-primary" onClick={saveLabTestAccess}><MdSave size={16} style={{ verticalAlign: 'text-bottom', marginRight: '0.35rem' }} aria-hidden />Save</button>
            <button className="btn btn-ghost" onClick={() => { if (selectedClient) openLabTestAccess(selectedClient); }}><MdRefresh size={16} style={{ verticalAlign: 'text-bottom', marginRight: '0.35rem' }} aria-hidden />Refresh</button>
            <button className="btn btn-ghost" onClick={() => { setView('list'); }}><MdClose size={16} style={{ verticalAlign: 'text-bottom', marginRight: '0.35rem' }} aria-hidden />Close</button>
        </TopNav>
        <div style={{ padding: '1.5rem' }}>
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
              <button className="btn btn-primary" onClick={saveLabTestAccess}><MdSave size={16} style={{ verticalAlign: 'text-bottom', marginRight: '0.35rem' }} aria-hidden />Save</button>
              <button className="btn btn-ghost" onClick={() => { setView('list'); }}><MdClose size={16} style={{ verticalAlign: 'text-bottom', marginRight: '0.35rem' }} aria-hidden />Close</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // View: WALLET
  // ════════════════════════════════════════════════════════════════════════════
  if (view === 'wallet') {
    return (
      <div className="page-content">
        <TopNav title={`Wallet — ${selectedClient?.company_name}`}>
          <button className="btn btn-ghost" onClick={() => { setView('list'); }}><MdClose size={16} style={{ verticalAlign: 'text-bottom', marginRight: '0.35rem' }} aria-hidden />Close</button>
        </TopNav>
        <div style={{ padding: '1.5rem' }}>

          {/* Balance Banner */}
          <div className="card" style={{ marginBottom: '1.5rem', background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', border: 'none' }}>
            <div className="card-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.75)', marginBottom: '0.25rem' }}>Current Wallet Balance</div>
                <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#fff' }}>${parseFloat(String(walletBalance || 0)).toFixed(2)}</div>
                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>{selectedClient?.company_name}</div>
              </div>
              <div style={{ fontSize: '3rem', opacity: 0.3 }}><MdAccountBalanceWallet size={48} aria-hidden /></div>
            </div>
          </div>

          {/* Recharge Form */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="card-header"><span className="card-title"><MdAdd size={18} style={{ verticalAlign: 'text-bottom', marginRight: '0.35rem' }} aria-hidden />Add Funds</span></div>
            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: '1rem', alignItems: 'flex-end' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Amount ($) <span style={{ color: '#ef4444' }}>*</span></label>
                  <input type="number" min="0" step="0.01" value={walletForm.amount}
                    onChange={e => setWalletForm(p => ({ ...p, amount: e.target.value }))}
                    placeholder="e.g. 500.00" />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Description / Note</label>
                  <input type="text" value={walletForm.description}
                    onChange={e => setWalletForm(p => ({ ...p, description: e.target.value }))}
                    placeholder="e.g. Payment received via bank transfer" />
                </div>
                <button className="btn btn-primary" onClick={rechargeWallet} disabled={walletSaving}
                  style={{ whiteSpace: 'nowrap' }}>
                  {walletSaving ? <><MdHourglassEmpty size={16} aria-hidden /> Adding...</> : <><MdPayment size={16} aria-hidden /> Add Funds</>}
                </button>
              </div>
            </div>
          </div>

          {/* Transaction History */}
          <div className="card">
            <div className="card-header"><span className="card-title"><MdAssignment size={18} style={{ verticalAlign: 'text-bottom', marginRight: '0.35rem' }} aria-hidden />Transaction History</span></div>
            <div className="card-body" style={{ padding: 0 }}>
              {walletHistory.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No transactions yet.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', background: '#f8f9fc' }}>
                      {['Date', 'Type', 'Amount', 'Balance After', 'Description'].map(h => (
                        <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {walletHistory.map((t: any) => (
                      <tr key={t.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                          {formatDateTime(t.creation_timestamp)}
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span style={{
                            padding: '0.2rem 0.6rem', borderRadius: 999, fontSize: '0.75rem', fontWeight: 600,
                            background: t.transaction_type === 'CREDIT' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                            color: t.transaction_type === 'CREDIT' ? '#10b981' : '#ef4444'
                          }}>
                            {t.transaction_type === 'CREDIT' ? '▲ CREDIT' : '▼ DEBIT'}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: t.transaction_type === 'CREDIT' ? '#10b981' : '#ef4444' }}>
                          {t.transaction_type === 'CREDIT' ? '+' : '-'}${parseFloat(t.amount).toFixed(2)}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>${parseFloat(t.closing_balance).toFixed(2)}</td>
                        <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>{t.description || '—'}</td>
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

  // ════════════════════════════════════════════════════════════════════════════
  // View: LIST (default)
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="page-content">
      <TopNav title="Manage B2B Labs" />
      <div style={{ padding: '1.5rem' }}>
        <ListingTable
          title="List of B2B Labs"
          columns={clientColumns}
          rows={clients}
          loading={loading}
          emptyText="No B2B Labs found."
          headerActions={<ListingHeaderActions onAdd={openAdd} onRefresh={loadClients} />}
          actionsLabel="Actions"
          actionsWidth={150}
          defaultPageSize={10}
          rowActions={client => (
            <ActionIcons
              onEdit={() => openEdit(client)}
              onToggleStatus={() => toggleStatus(client)}
              onDelete={() => deleteClient(client.id)}
              statusActive={!!client.status}
              editTitle="Edit B2B Lab"
              deleteTitle="Delete B2B Lab"
            />
          )}
        />
      </div>
    </div>
  );
}
