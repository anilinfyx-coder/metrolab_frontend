'use client';
import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import { FormGroup, FieldError } from '../../../components/FormField';
import PasswordInput from '../../../components/PasswordInput';
import { formatDate, formatDateTime } from '../../../utils/dateFormat';
import ListingTable, { ActionIcons, ListingColumn, ListingHeaderActions } from '../../../components/ListingTable';
import { apiFetch, toastApiSuccess, API_BASE } from '../../../../lib/api';
import { createInvalidHandler, fieldStyle, formResolver } from '../../../../lib/formHelpers';
import {
  b2bClientFormSchema,
  b2bDocumentSchema,
  b2bSubscriptionSchema,
  walletRechargeSchema,
  type B2bClientFormValues,
  type B2bDocumentFormValues,
  type B2bSubscriptionFormValues,
  type WalletRechargeFormValues,
} from '../../../../lib/schemas';

// ─── Types ───────────────────────────────────────────────────────────────────
interface B2BClient {
  id: number; company_name: string; contact_person_name: string;
  mobile: string; email: string; address: string; status: boolean;
  public_email: string; public_phone_no: string; pincode: string;
  country_id?: number | string | null;
  state_id?: number | string | null;
  city_id?: number | string | null;
  support_email: string; support_mobile: string; support_person_name: string;
  website: string; medical_officer_name: string; mrocc: string; clia_number: string;
  smtp_server: string; smtp_port: string; smtp_email: string; smtp_password: string;
  tagline: string; public_fax: string; primary_color_code: string; approval_note: string;
  password?: string;
  is_fixed_price?: boolean;
  fixed_price_amount?: number | string;
  is_approval?: boolean;
  wallet_balance?: number;
}
interface GeoItem { id: number; name: string; country_id?: number; state_id?: number; }
interface Subscription { id: number; start_date: string; end_date: string; amount: number; b2b_client_id: number; }
interface LabTest { id: number; name: string; description: string; b2b_client_lab_test_access_id?: number; is_selected?: boolean; }
interface B2BDocument { id: number; type_data_id: number; typeData: string; file_name: string; }
interface WalletTransaction {
  id: number;
  creation_timestamp: string;
  transaction_type: string;
  amount: string | number;
  closing_balance: string | number;
  description?: string;
}

const emptyClient = {
  company_name: '', contact_person_name: '', mobile: '', email: '', address: '',
  country_id: '', state_id: '', city_id: '',
  public_email: '', public_phone_no: '', public_fax: '', pincode: '',
  support_email: '', support_mobile: '', support_person_name: '',
  website: '', medical_officer_name: '', medical_officer_position: '', mrocc: '', clia_number: '',
  smtp_server: '', smtp_port: '', smtp_email: '', smtp_password: '',
  tagline: '', primary_color_code: '', approval_note: '', password: '',
  fixed_price_amount: '',
};

type View = 'list' | 'form' | 'subscription' | 'labtestaccess' | 'documents' | 'wallet';

const B2B_CLIENTS_KEY = ['b2bClients'] as const;
const LAB_TESTS_ALL_KEY = ['labTests', 'all'] as const;
const LAB_TESTS_ACTIVE_KEY = ['labTests', 'active'] as const;
const B2B_DOC_TYPES_KEY = ['typeData', 'active'] as const;
const b2bSubscriptionsKey = (clientId: number) => ['b2bSubscriptions', clientId] as const;
const b2bCustomPricesKey = (clientId: number) => ['b2bCustomPrices', clientId] as const;
const b2bDocumentsKey = (clientId: number) => ['b2bDocuments', clientId] as const;
const b2bLabTestAccessKey = (clientId: number) => ['b2bLabTestAccess', clientId] as const;
const b2bWalletHistoryKey = (clientId: number) => ['b2bWalletHistory', clientId] as const;

type SaveClientPayload = {
  values: B2bClientFormValues;
  editingId: number | null;
  isApproval: boolean;
  isFixedPrice: boolean;
  logoFile: File | null;
  reportHeaderFile: File | null;
  reportFooterFile: File | null;
  medOfficerSigFile: File | null;
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function B2BClientsPage() {
  const confirmDialog = useConfirm();
  const queryClient = useQueryClient();
  const [view, setView] = useState<View>('list');
  const [selectedClient, setSelectedClient] = useState<B2BClient | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [initViewHandled, setInitViewHandled] = useState(false);
  const selectedClientId = selectedClient?.id;

  const clientSchema = useMemo(() => b2bClientFormSchema(!!editingId), [editingId]);

  const {
    register: registerClient,
    handleSubmit: handleClientSubmit,
    reset: resetClient,
    getValues: getClientValues,
    watch: watchClient,
    setValue: setClientValue,
    formState: { errors: clientErrors },
  } = useForm<B2bClientFormValues>({
    resolver: formResolver<B2bClientFormValues>(clientSchema),
    defaultValues: { ...emptyClient },
  });

  const {
    register: registerSub,
    handleSubmit: handleSubSubmit,
    reset: resetSub,
    formState: { errors: subErrors },
  } = useForm<B2bSubscriptionFormValues>({
    resolver: formResolver<B2bSubscriptionFormValues>(b2bSubscriptionSchema),
    defaultValues: { start_date: '', end_date: '', amount: '' },
  });

  const {
    register: registerWallet,
    handleSubmit: handleWalletSubmit,
    reset: resetWallet,
    formState: { errors: walletErrors },
  } = useForm<WalletRechargeFormValues>({
    resolver: formResolver<WalletRechargeFormValues>(walletRechargeSchema),
    defaultValues: { amount: '', description: '' },
  });

  const {
    register: registerDoc,
    handleSubmit: handleDocSubmit,
    reset: resetDocForm,
    formState: { errors: docErrors },
  } = useForm<B2bDocumentFormValues>({
    resolver: formResolver<B2bDocumentFormValues>(b2bDocumentSchema),
    defaultValues: { typeDataId: '' },
  });

  // Subscriptions & Custom Pricing
  const [pricingMode, setPricingMode] = useState<'subscription' | 'custom'>('subscription');
  const [editingSubId, setEditingSubId] = useState<number | null>(null);
  const [draftCustomPrices, setDraftCustomPrices] = useState<{ lab_test_id: number; custom_price: string }[] | null>(null);
  const [draftSelectedIds, setDraftSelectedIds] = useState<Set<number> | null>(null);

  // Documents
  const [docFormMeta, setDocFormMeta] = useState<{ id: number | null; file: File | null; fileName: string }>({
    id: null,
    file: null,
    fileName: '',
  });
  const [docFileError, setDocFileError] = useState('');

  // File uploads for B2B Client
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [reportHeaderFile, setReportHeaderFile] = useState<File | null>(null);
  const [reportFooterFile, setReportFooterFile] = useState<File | null>(null);
  const [medOfficerSigFile, setMedOfficerSigFile] = useState<File | null>(null);
  const [isApproval, setIsApproval] = useState(false);
  const [isFixedPrice, setIsFixedPrice] = useState(false);
  const [fixedPriceAmount, setFixedPriceAmount] = useState('');
  const [walletBalanceOverride, setWalletBalanceOverride] = useState<number | null>(null);
  const [countries, setCountries] = useState<GeoItem[]>([]);
  const [states, setStates] = useState<GeoItem[]>([]);
  const [cities, setCities] = useState<GeoItem[]>([]);

  const countryId = watchClient('country_id');
  const stateId = watchClient('state_id');

  const invalidateClients = () => queryClient.invalidateQueries({ queryKey: B2B_CLIENTS_KEY });

  const { data: clients = [], isLoading: loading } = useQuery({
    queryKey: B2B_CLIENTS_KEY,
    queryFn: async () => {
      try {
        return await apiFetch<B2BClient[]>('/api/B2bClients', { tokenKey: 'superadmin_token' }) || [];
      } catch {
        return [];
      }
    },
  });

  useEffect(() => {
    apiFetch<GeoItem[]>('/api/Country?status=true', {
      tokenKey: 'superadmin_token',
      silent: true,
    })
      .then(data => setCountries(data || []))
      .catch(() => setCountries([]));
  }, []);

  useEffect(() => {
    if (!countryId) {
      setStates([]);
      return;
    }
    apiFetch<GeoItem[]>(`/api/State?country_id=${countryId}&status=true`, {
      tokenKey: 'superadmin_token',
      silent: true,
    })
      .then(data => setStates(data || []))
      .catch(() => setStates([]));
  }, [countryId]);

  useEffect(() => {
    if (!stateId) {
      setCities([]);
      return;
    }
    apiFetch<GeoItem[]>(`/api/City?state_id=${stateId}&status=true`, {
      tokenKey: 'superadmin_token',
      silent: true,
    })
      .then(data => setCities(data || []))
      .catch(() => setCities([]));
  }, [stateId]);

  const filteredStates = useMemo(
    () => states.filter(s => !countryId || Number(s.country_id) === Number(countryId)),
    [states, countryId],
  );
  const filteredCities = useMemo(
    () => cities.filter(c => !stateId || Number(c.state_id) === Number(stateId)),
    [cities, stateId],
  );

  const { data: subscriptions = [] } = useQuery({
    queryKey: b2bSubscriptionsKey(selectedClientId ?? 0),
    enabled: view === 'subscription' && !!selectedClientId,
    queryFn: async () => {
      try {
        return await apiFetch<Subscription[]>(
          `/api/B2bClientSubscription?b2b_client_id=${selectedClientId}`,
          { tokenKey: 'superadmin_token' },
        ) || [];
      } catch {
        return [];
      }
    },
  });

  const { data: customPricesData = [] } = useQuery({
    queryKey: b2bCustomPricesKey(selectedClientId ?? 0),
    enabled: view === 'subscription' && !!selectedClientId,
    queryFn: async () => {
      try {
        return await apiFetch<{ lab_test_id: number; custom_price: string }[]>(
          `/api/B2bClientCustomPrices?b2b_client_id=${selectedClientId}`,
          { tokenKey: 'superadmin_token' },
        ) || [];
      } catch {
        return [];
      }
    },
  });

  const { data: globalLabTests = [] } = useQuery({
    queryKey: LAB_TESTS_ALL_KEY,
    enabled: view === 'subscription',
    queryFn: async () => {
      try {
        return await apiFetch<LabTest[]>('/api/LabTests', { tokenKey: 'superadmin_token' }) || [];
      } catch {
        return [];
      }
    },
  });

  const { data: accessLabTests = [] } = useQuery({
    queryKey: LAB_TESTS_ACTIVE_KEY,
    enabled: view === 'labtestaccess',
    queryFn: async () => {
      try {
        return await apiFetch<LabTest[]>('/api/LabTests?status=true', { tokenKey: 'superadmin_token' }) || [];
      } catch {
        return [];
      }
    },
  });

  const { data: docTypes = [] } = useQuery({
    queryKey: B2B_DOC_TYPES_KEY,
    enabled: view === 'documents',
    queryFn: async () => {
      try {
        return await apiFetch<{ id: number; name: string }[]>('/api/TypeData?status=true', {
          tokenKey: 'superadmin_token',
        }) || [];
      } catch {
        return [];
      }
    },
  });

  const { data: documents = [] } = useQuery({
    queryKey: b2bDocumentsKey(selectedClientId ?? 0),
    enabled: view === 'documents' && !!selectedClientId,
    queryFn: async () => {
      try {
        return await apiFetch<B2BDocument[]>('/api/B2bClientDocument/getB2bClientDocumentList', {
          method: 'POST',
          tokenKey: 'superadmin_token',
          body: JSON.stringify({ b2b_client_id: selectedClientId }),
        }) || [];
      } catch {
        return [];
      }
    },
  });

  const { data: accessList = [] } = useQuery({
    queryKey: b2bLabTestAccessKey(selectedClientId ?? 0),
    enabled: view === 'labtestaccess' && !!selectedClientId,
    queryFn: async () => {
      try {
        return await apiFetch<{ lab_test_id: number }[]>(
          `/api/B2bClientLabTestAccess?b2b_client_id=${selectedClientId}`,
          { tokenKey: 'superadmin_token' },
        ) || [];
      } catch {
        return [];
      }
    },
  });

  const { data: walletHistory = [] } = useQuery({
    queryKey: b2bWalletHistoryKey(selectedClientId ?? 0),
    enabled: view === 'wallet' && !!selectedClientId,
    queryFn: async () => {
      try {
        return await apiFetch<WalletTransaction[]>(
          `/api/B2bClients/walletHistory/${selectedClientId}`,
          { tokenKey: 'superadmin_token' },
        ) || [];
      } catch {
        return [];
      }
    },
  });

  const customPrices = draftCustomPrices ?? customPricesData;

  const selectedTestIds = useMemo(
    () => draftSelectedIds ?? new Set(accessList.map(a => a.lab_test_id)),
    [draftSelectedIds, accessList],
  );

  const labTests = useMemo(
    () => accessLabTests.map(t => ({ ...t, is_selected: selectedTestIds.has(t.id) })),
    [accessLabTests, selectedTestIds],
  );

  const walletBalance = useMemo(() => {
    if (walletBalanceOverride != null) return walletBalanceOverride;
    const fromList = clients.find(c => c.id === selectedClientId);
    if (fromList?.wallet_balance != null) return Number(fromList.wallet_balance);
    if (selectedClient?.wallet_balance != null) return Number(selectedClient.wallet_balance);
    if (walletHistory.length > 0) return Number(walletHistory[0].closing_balance) || 0;
    return 0;
  }, [walletBalanceOverride, clients, selectedClientId, selectedClient, walletHistory]);

  // Deep-link: ?view=wallet&clientId=… opens wallet once client list is loaded.
   
  useEffect(() => {
    if (clients.length === 0 || initViewHandled || typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const v = urlParams.get('view');
    const cid = urlParams.get('clientId');
    if (v === 'wallet' && cid) {
      const c = clients.find(x => x.id.toString() === cid);
      if (c) {
        setSelectedClient(c);
        setWalletBalanceOverride(
          c.wallet_balance != null ? Number(c.wallet_balance) : 0,
        );
        resetWallet({ amount: '', description: '' });
        setView('wallet');
      }
    }
    setInitViewHandled(true);
  }, [clients, initViewHandled, resetWallet]);

  const saveClientMutation = useMutation({
    mutationFn: async ({
      values,
      editingId: editId,
      isApproval: approval,
      isFixedPrice: fixedPrice,
      logoFile: logo,
      reportHeaderFile: header,
      reportFooterFile: footer,
      medOfficerSigFile: sig,
    }: SaveClientPayload) => {
      const method = editId ? 'PUT' : 'POST';
      const path = `/api/B2bClients${editId ? `/${editId}` : ''}`;
      const payload = {
        ...values,
        country_id: values.country_id ? Number(values.country_id) : null,
        state_id: values.state_id ? Number(values.state_id) : null,
        city_id: values.city_id ? Number(values.city_id) : null,
        role_id: 2,
        status: true,
        deleted: false,
        is_approval: approval,
        is_fixed_price: fixedPrice,
      };
      const hasFiles = logo || header || footer || sig;
      if (hasFiles) {
        const fd = new FormData();
        Object.entries(payload).forEach(([k, v]) => {
          if (v === null || v === undefined) {
            if (['country_id', 'state_id', 'city_id'].includes(k)) {
              fd.append(k, '');
            }
            return;
          }
          fd.append(k, String(v));
        });
        if (logo) fd.append('logo_file', logo);
        if (header) fd.append('report_header_file', header);
        if (footer) fd.append('report_footer_file', footer);
        if (sig) fd.append('medical_officer_signature_file', sig);
        return apiFetch(path, {
          method,
          tokenKey: 'superadmin_token',
          body: fd,
          successMessage: `B2B Lab ${editId ? 'updated' : 'added'} successfully.`,
          errorFallback: 'Unable to save B2B Lab.',
        });
      }
      return apiFetch(path, {
        method,
        tokenKey: 'superadmin_token',
        body: JSON.stringify(payload),
        successMessage: `B2B Lab ${editId ? 'updated' : 'added'} successfully.`,
        errorFallback: 'Unable to save B2B Lab.',
      });
    },
  });

  const deleteClientMutation = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/api/B2bClients/${id}`, {
        method: 'DELETE',
        tokenKey: 'superadmin_token',
        successMessage: 'B2B Lab deleted successfully.',
        errorFallback: 'Unable to delete B2B Lab.',
      }),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: boolean }) =>
      apiFetch(`/api/B2bClients/${id}`, {
        method: 'PUT',
        tokenKey: 'superadmin_token',
        body: JSON.stringify({ status }),
        successMessage: 'Status Updated Successfully',
        errorFallback: 'Failed to update status.',
      }),
  });

  const saveSubMutation = useMutation({
    mutationFn: ({
      values,
      subId,
      clientId,
    }: {
      values: B2bSubscriptionFormValues;
      subId: number | null;
      clientId: number;
    }) => {
      const method = subId ? 'PUT' : 'POST';
      const path = `/api/B2bClientSubscription${subId ? `/${subId}` : ''}`;
      return apiFetch(path, {
        method,
        tokenKey: 'superadmin_token',
        body: JSON.stringify({ ...values, b2b_client_id: clientId }),
        successMessage: `Subscription ${subId ? 'updated' : 'added'} successfully.`,
        errorFallback: 'Unable to save subscription.',
      });
    },
  });

  const deleteSubMutation = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/api/B2bClientSubscription/${id}`, {
        method: 'DELETE',
        tokenKey: 'superadmin_token',
        successMessage: 'Subscription deleted successfully.',
        errorFallback: 'Unable to delete subscription.',
      }),
  });

  const saveCustomPricingMutation = useMutation({
    mutationFn: async ({
      clientId,
      fixedPrice,
      fixedAmount,
      prices,
    }: {
      clientId: number;
      fixedPrice: boolean;
      fixedAmount: string;
      prices: { lab_test_id: number; custom_price: string }[];
    }) => {
      await apiFetch(`/api/B2bClients/${clientId}`, {
        method: 'PUT',
        tokenKey: 'superadmin_token',
        body: JSON.stringify({ is_fixed_price: fixedPrice, fixed_price_amount: fixedAmount }),
      });
      if (!fixedPrice) {
        await apiFetch('/api/B2bClientCustomPrices/bulk', {
          method: 'POST',
          tokenKey: 'superadmin_token',
          body: JSON.stringify({ b2b_client_id: clientId, custom_prices: prices }),
        });
      }
    },
  });

  const saveDocMutation = useMutation({
    mutationFn: ({ formData, isUpdate }: { formData: FormData; isUpdate: boolean }) =>
      apiFetch('/api/B2bClientDocument/saveB2bClientDocument', {
        method: 'POST',
        tokenKey: 'superadmin_token',
        body: formData,
        successMessage: `Document ${isUpdate ? 'updated' : 'saved'} successfully.`,
        errorFallback: 'Unable to save document.',
      }),
  });

  const deleteDocMutation = useMutation({
    mutationFn: (id: number) =>
      apiFetch('/api/B2bClientDocument/deleteB2bClientDocument', {
        method: 'POST',
        tokenKey: 'superadmin_token',
        body: JSON.stringify({ id }),
        successMessage: 'Document deleted successfully.',
        errorFallback: 'Unable to delete document.',
      }),
  });

  const saveLabTestAccessMutation = useMutation({
    mutationFn: ({ clientId, labTestIds }: { clientId: number; labTestIds: number[] }) =>
      apiFetch('/api/B2bClientLabTestAccess/bulk', {
        method: 'POST',
        tokenKey: 'superadmin_token',
        body: JSON.stringify({ b2b_client_id: clientId, lab_test_ids: labTestIds }),
        successMessage: 'Lab Test Access saved successfully.',
        errorFallback: 'Unable to save lab test access.',
      }),
  });

  const rechargeWalletMutation = useMutation({
    mutationFn: ({
      clientId,
      amount,
      description,
    }: {
      clientId: number;
      amount: number;
      description: string;
    }) =>
      apiFetch<{ newBalance: number }>('/api/B2bClients/rechargeWallet', {
        method: 'POST',
        tokenKey: 'superadmin_token',
        body: JSON.stringify({
          b2b_client_id: clientId,
          amount,
          description,
        }),
        errorFallback: 'Recharge failed.',
      }),
  });

  // ── B2B Client CRUD ──────────────────────────────────────────────────────
  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$&*";
    let pass = "";
    for (let i = 0; i < 10; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length));
    return pass;
  };

  const openAdd = () => {
    setEditingId(null);
    resetClient({ ...emptyClient, password: generatePassword() });
    setIsApproval(false);
    setIsFixedPrice(false);
    setView('form');
  };

  const openEdit = (c: B2BClient) => {
    setEditingId(c.id);
    resetClient({
      ...emptyClient,
      ...(c as unknown as Record<string, string>),
      country_id: c.country_id != null ? String(c.country_id) : '',
      state_id: c.state_id != null ? String(c.state_id) : '',
      city_id: c.city_id != null ? String(c.city_id) : '',
    });
    setIsApproval(!!c.is_approval);
    setIsFixedPrice(!!c.is_fixed_price);
    setView('form');
  };

  const saveClient = handleClientSubmit(async values => {
    try {
      await saveClientMutation.mutateAsync({
        values,
        editingId,
        isApproval,
        isFixedPrice,
        logoFile,
        reportHeaderFile,
        reportFooterFile,
        medOfficerSigFile,
      });
      setLogoFile(null);
      setReportHeaderFile(null);
      setReportFooterFile(null);
      setMedOfficerSigFile(null);
      setIsApproval(false);
      setIsFixedPrice(false);
      setView('list');
      await invalidateClients();
    } catch {
      /* error toasted by apiFetch */
    }
  }, createInvalidHandler<B2bClientFormValues>());

  const deleteClient = async (id: number) => {
    const ok = await confirmDialog({
      title: 'You are trying to delete B2B Lab, Please confirm',
      message: 'This cannot be restored once deleted.',
      cancelText: 'NO, WAIT!',
      confirmText: 'CONFIRM DELETION',
    });
    if (!ok) return;
    try {
      await deleteClientMutation.mutateAsync(id);
      await invalidateClients();
    } catch {
      /* error toasted by apiFetch */
    }
  };

  const toggleStatus = async (c: B2BClient) => {
    const enabling = !c.status;
    const ok = await confirmDialog({
      title: enabling ? 'Enable B2B Lab?' : 'Disable B2B Lab?',
      message: enabling
        ? `${c.company_name || 'This B2B Lab'} will become active.`
        : `${c.company_name || 'This B2B Lab'} will become inactive. You can enable it again later.`,
      cancelText: 'Cancel',
      confirmText: enabling ? 'Enable' : 'Disable',
    });
    if (!ok) return;
    try {
      await toggleStatusMutation.mutateAsync({ id: c.id, status: !c.status });
      await invalidateClients();
    } catch {
      /* error toasted by apiFetch */
    }
  };

  // ── Subscriptions ─────────────────────────────────────────────────────────
  const openSubscription = (c: B2BClient) => {
    setSelectedClient(c);
    setPricingMode('subscription');
    resetSub({ start_date: '', end_date: '', amount: '' });
    setEditingSubId(null);
    setDraftCustomPrices(null);
    setIsFixedPrice(!!c.is_fixed_price);
    setFixedPriceAmount(c.fixed_price_amount != null ? String(c.fixed_price_amount) : '');
    setView('subscription');
  };

  const saveSub = handleSubSubmit(async values => {
    if (!selectedClientId) return;
    try {
      await saveSubMutation.mutateAsync({
        values,
        subId: editingSubId,
        clientId: selectedClientId,
      });
      resetSub({ start_date: '', end_date: '', amount: '' });
      setEditingSubId(null);
      await queryClient.invalidateQueries({ queryKey: b2bSubscriptionsKey(selectedClientId) });
    } catch {
      /* error toasted by apiFetch */
    }
  }, createInvalidHandler<B2bSubscriptionFormValues>());

  const deleteSub = async (id: number) => {
    const ok = await confirmDialog({
      title: 'You are trying to delete Lab Subscription Details, Please confirm',
      message: 'This cannot be restored once deleted.',
      cancelText: 'NO, WAIT!',
      confirmText: 'CONFIRM DELETION',
    });
    if (!ok) return;
    try {
      await deleteSubMutation.mutateAsync(id);
      if (selectedClientId) {
        await queryClient.invalidateQueries({ queryKey: b2bSubscriptionsKey(selectedClientId) });
      }
    } catch {
      /* error toasted by apiFetch */
    }
  };

  const saveCustomPricing = async () => {
    if (!selectedClientId) return;
    try {
      await saveCustomPricingMutation.mutateAsync({
        clientId: selectedClientId,
        fixedPrice: isFixedPrice,
        fixedAmount: fixedPriceAmount,
        prices: customPrices,
      });
      toastApiSuccess('Custom Pricing saved successfully');
      await invalidateClients();
      await queryClient.invalidateQueries({ queryKey: b2bCustomPricesKey(selectedClientId) });
    } catch {
      /* error toasted by apiFetch */
    }
  };

  // ── Documents ─────────────────────────────────────────────────────────────
  const openDocuments = (c: B2BClient) => {
    setSelectedClient(c);
    resetDocForm({ typeDataId: '' });
    setDocFormMeta({ id: null, file: null, fileName: '' });
    setDocFileError('');
    setView('documents');
  };

  const saveDoc = handleDocSubmit(async values => {
    if (!docFormMeta.id && !docFormMeta.file) {
      setDocFileError('File is required.');
      return;
    }
    setDocFileError('');
    const formData = new FormData();
    formData.append('b2bClientId', String(selectedClient?.id));
    formData.append('typeDataId', values.typeDataId);
    if (docFormMeta.id) formData.append('id', String(docFormMeta.id));
    if (docFormMeta.fileName) formData.append('fileName', docFormMeta.fileName);
    if (docFormMeta.file) formData.append('UploadFile', docFormMeta.file);

    try {
      await saveDocMutation.mutateAsync({
        formData,
        isUpdate: !!docFormMeta.id,
      });
      resetDocForm({ typeDataId: '' });
      setDocFormMeta({ id: null, file: null, fileName: '' });
      if (selectedClientId) {
        await queryClient.invalidateQueries({ queryKey: b2bDocumentsKey(selectedClientId) });
      }
    } catch {
      /* error toasted by apiFetch */
    }
  }, createInvalidHandler<B2bDocumentFormValues>());

  const deleteDoc = async (id: number) => {
    const ok = await confirmDialog({
      title: 'You are trying to delete Document, Please confirm',
      message: 'This cannot be restored once deleted.',
      cancelText: 'NO, WAIT!',
      confirmText: 'CONFIRM DELETION',
    });
    if (!ok) return;
    try {
      await deleteDocMutation.mutateAsync(id);
      if (selectedClientId) {
        await queryClient.invalidateQueries({ queryKey: b2bDocumentsKey(selectedClientId) });
      }
    } catch {
      /* error toasted by apiFetch */
    }
  };

  // ── Lab Test Access ───────────────────────────────────────────────────────
  const openLabTestAccess = (c: B2BClient) => {
    setSelectedClient(c);
    setDraftSelectedIds(null);
    setView('labtestaccess');
  };

  const saveLabTestAccess = async () => {
    if (!selectedClientId) return;
    const selected = [...selectedTestIds];
    try {
      await saveLabTestAccessMutation.mutateAsync({
        clientId: selectedClientId,
        labTestIds: selected,
      });
      setView('list');
      await queryClient.invalidateQueries({ queryKey: b2bLabTestAccessKey(selectedClientId) });
    } catch {
      /* error toasted by apiFetch */
    }
  };

  // ── Wallet ────────────────────────────────────────────────────────────────
  const openWallet = (c: B2BClient) => {
    setSelectedClient(c);
    setWalletBalanceOverride(c.wallet_balance != null ? Number(c.wallet_balance) : 0);
    resetWallet({ amount: '', description: '' });
    setView('wallet');
  };

  const rechargeWallet = handleWalletSubmit(async values => {
    if (!selectedClientId) return;
    try {
      const result = await rechargeWalletMutation.mutateAsync({
        clientId: selectedClientId,
        amount: Number(values.amount),
        description: values.description || 'Manual Recharge',
      });
      toastApiSuccess(`Wallet recharged successfully. New Balance: $${result.newBalance}`);
      setWalletBalanceOverride(result.newBalance);
      resetWallet({ amount: '', description: '' });
      await invalidateClients();
      await queryClient.invalidateQueries({ queryKey: b2bWalletHistoryKey(selectedClientId) });
    } catch {
      /* error toasted by apiFetch */
    }
  }, createInvalidHandler<WalletRechargeFormValues>());

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

  const inp = (key: keyof B2bClientFormValues, label: string, type = 'text', required = false, readOnly = false) => (
    <FormGroup key={key} label={label} htmlFor={`b2b-${key}`} required={required} error={clientErrors[key]?.message}>
      {type === 'password' ? (
        <PasswordInput
          id={`b2b-${key}`}
          placeholder={`Enter ${label}`}
          readOnly={readOnly}
          data-field={key}
          aria-invalid={!!clientErrors[key]}
          style={fieldStyle(!!clientErrors[key], readOnly ? { backgroundColor: 'var(--bg-card)', cursor: 'not-allowed' } : {})}
          {...registerClient(key)}
        />
      ) : (
        <input
          id={`b2b-${key}`}
          type={type}
          placeholder={`Enter ${label}`}
          readOnly={readOnly}
          data-field={key}
          aria-invalid={!!clientErrors[key]}
          style={fieldStyle(!!clientErrors[key], readOnly ? { backgroundColor: 'var(--bg-card)', cursor: 'not-allowed' } : {})}
          {...registerClient(key)}
        />
      )}
    </FormGroup>
  );

  // ════════════════════════════════════════════════════════════════════════════
  // View: FORM (Add / Edit B2B Lab)
  // ════════════════════════════════════════════════════════════════════════════
  if (view === 'form') {
    return (
      <div className="page-content">
        <TopNav title="B2B Lab Details" />
        <div className="page-body">
          <div className="card">
            <div className="card-header">
              <span className="card-title" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                {editingId ? (
                  <>
                    <MdEdit size={16} aria-hidden />
                    Edit B2B Lab
                  </>
                ) : (
                  <>
                    <MdAdd size={16} aria-hidden />
                    Add B2B Lab
                  </>
                )}
              </span>
              <button type="button" className="btn btn-ghost" onClick={() => setView('list')}>
                <MdClose size={16} style={{ verticalAlign: 'text-bottom', marginRight: '0.35rem' }} aria-hidden />
                Close
              </button>
            </div>
            <form onSubmit={saveClient} noValidate>
            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                {inp('company_name', 'B2B Company Name', 'text', true)}
                {inp('contact_person_name', 'Contact Person Name', 'text', true)}
                {inp('mobile', 'Mobile', 'text', true)}
                {inp('email', 'Login Email', 'email', true)}
                {inp('password', 'Login Password', 'password', true, true)}
                {inp('address', 'Address', 'text', true)}
                <FormGroup label="Country" htmlFor="b2b-country" required error={clientErrors.country_id?.message}>
                  <select
                    id="b2b-country"
                    data-field="country_id"
                    aria-invalid={!!clientErrors.country_id}
                    style={fieldStyle(!!clientErrors.country_id)}
                    {...registerClient('country_id', {
                      onChange: e => {
                        setClientValue('country_id', e.target.value);
                        setClientValue('state_id', '');
                        setClientValue('city_id', '');
                      },
                    })}
                  >
                    <option value="">-- Select Country --</option>
                    {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </FormGroup>
                <FormGroup label="State" htmlFor="b2b-state" required error={clientErrors.state_id?.message}>
                  <select
                    id="b2b-state"
                    data-field="state_id"
                    disabled={!countryId}
                    aria-invalid={!!clientErrors.state_id}
                    style={fieldStyle(!!clientErrors.state_id)}
                    {...registerClient('state_id', {
                      onChange: e => {
                        setClientValue('state_id', e.target.value);
                        setClientValue('city_id', '');
                      },
                    })}
                  >
                    <option value="">-- Select State --</option>
                    {filteredStates.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </FormGroup>
                <FormGroup label="City" htmlFor="b2b-city" required error={clientErrors.city_id?.message}>
                  <select
                    id="b2b-city"
                    data-field="city_id"
                    disabled={!stateId}
                    aria-invalid={!!clientErrors.city_id}
                    style={fieldStyle(!!clientErrors.city_id)}
                    {...registerClient('city_id')}
                  >
                    <option value="">-- Select City --</option>
                    {filteredCities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </FormGroup>
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
                <button type="submit" className="btn btn-primary" disabled={saveClientMutation.isPending}>
                  {saveClientMutation.isPending ? <><MdHourglassEmpty size={16} aria-hidden /> Saving...</> : <><MdSave size={16} aria-hidden /> Save</>}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => resetClient({ ...emptyClient, password: getClientValues('password') })}><MdRefresh size={16} style={{ verticalAlign: 'text-bottom', marginRight: '0.35rem' }} aria-hidden />Reset</button>
              </div>
            </div>
            </form>
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
        <TopNav title={`Pricing & Subscription — ${selectedClient?.company_name || ''}`} />
        <div style={{ padding: '1.5rem' }}>
          {/* Mode Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem', marginBottom: '1.5rem', padding: '1rem', background: 'var(--bg-card)', borderRadius: 8, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600 }}>
                <input type="radio" checked={pricingMode === 'subscription'} onChange={() => setPricingMode('subscription')} style={{ width: 18, height: 18, accentColor: '#6366f1' }} />
                Subscription (Time-Based)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600 }}>
                <input type="radio" checked={pricingMode === 'custom'} onChange={() => setPricingMode('custom')} style={{ width: 18, height: 18, accentColor: '#6366f1' }} />
                Custom Pricing (Wallet Deduction)
              </label>
            </div>
            <button type="button" className="btn btn-ghost" onClick={() => { setView('list'); }}>
              <MdClose size={16} style={{ verticalAlign: 'text-bottom', marginRight: '0.35rem' }} aria-hidden />Close
            </button>
          </div>

          {pricingMode === 'subscription' && (
            <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '1.5rem', alignItems: 'start' }}>
              {/* Form card */}
              <div className="card">
                <div className="card-header"><span className="card-title">Subscription Detail</span></div>
                <form onSubmit={saveSub} noValidate>
                <div className="card-body">
                  <FormGroup label="Start Date" htmlFor="sub-start" required error={subErrors.start_date?.message}>
                    <input
                      id="sub-start"
                      type="date"
                      data-field="start_date"
                      aria-invalid={!!subErrors.start_date}
                      style={fieldStyle(!!subErrors.start_date)}
                      {...registerSub('start_date')}
                    />
                  </FormGroup>
                  <FormGroup label="End Date" htmlFor="sub-end" required error={subErrors.end_date?.message}>
                    <input
                      id="sub-end"
                      type="date"
                      data-field="end_date"
                      aria-invalid={!!subErrors.end_date}
                      style={fieldStyle(!!subErrors.end_date)}
                      {...registerSub('end_date')}
                    />
                  </FormGroup>
                  <FormGroup label="Amount" htmlFor="sub-amount" required error={subErrors.amount?.message}>
                    <input
                      id="sub-amount"
                      type="number"
                      data-field="amount"
                      placeholder="Enter Amount"
                      aria-invalid={!!subErrors.amount}
                      style={fieldStyle(!!subErrors.amount)}
                      {...registerSub('amount')}
                    />
                  </FormGroup>
                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                    <button type="submit" className="btn btn-primary"><MdSave size={16} style={{ verticalAlign: 'text-bottom', marginRight: '0.35rem' }} aria-hidden />Save</button>
                    <button type="button" className="btn btn-ghost" onClick={() => { resetSub({ start_date: '', end_date: '', amount: '' }); setEditingSubId(null); }}><MdRefresh size={16} style={{ verticalAlign: 'text-bottom', marginRight: '0.35rem' }} aria-hidden />Reset</button>
                  </div>
                </div>
                </form>
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
                              onClick={() => { resetSub({ start_date: s.start_date?.slice(0, 10) || '', end_date: s.end_date?.slice(0, 10) || '', amount: String(s.amount) }); setEditingSubId(s.id); }}><MdEdit size={14} style={{ verticalAlign: 'text-bottom', marginRight: '0.25rem' }} aria-hidden />Edit</button>
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
          )}

          {pricingMode === 'custom' && (
            <div className="card">
              <div className="card-header"><span className="card-title">Custom Wallet Deduction Pricing</span></div>
              <div className="card-body">
                <div className="form-group" style={{ marginBottom: '1.5rem', maxWidth: '400px' }}>
                  <label style={{ marginBottom: '0.5rem' }}>Fixed Price Per Report</label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', padding: '0.55rem 0.75rem', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg-input)' }}>
                    <input type="checkbox" checked={isFixedPrice} onChange={e => setIsFixedPrice(e.target.checked)} style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#6366f1' }} />
                    <span style={{ fontSize: '0.875rem' }}>{isFixedPrice ? <><MdCheckCircle size={16} style={{ verticalAlign: 'text-bottom', marginRight: '0.35rem' }} aria-hidden />Yes, Fixed Price</> : 'No, Use Test-Wise Pricing'}</span>
                  </label>
                </div>
                
                {isFixedPrice && (
                  <div className="form-group" style={{ maxWidth: '400px' }}>
                    <label>Fixed Price Amount ($)</label>
                    <input type="number" value={fixedPriceAmount} onChange={e => setFixedPriceAmount(e.target.value)} placeholder="Enter Fixed Amount" />
                  </div>
                )}

                {!isFixedPrice && (
                  <div style={{ marginTop: '1.5rem' }}>
                    <h4 style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>Test-Wise Custom Pricing</h4>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                          <th style={{ padding: '0.75rem', textAlign: 'left' }}>Lab Test</th>
                          <th style={{ padding: '0.75rem', textAlign: 'left', width: '250px' }}>Custom Price ($)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {globalLabTests.map(test => {
                           const cp = customPrices.find(c => c.lab_test_id === test.id);
                           const priceStr = cp ? cp.custom_price : '';
                           return (
                             <tr key={test.id} style={{ borderBottom: '1px solid var(--border)' }}>
                               <td style={{ padding: '0.75rem' }}>{test.name}</td>
                               <td style={{ padding: '0.75rem' }}>
                                 <input type="number" value={priceStr} placeholder="Free (0) if blank"
                                   onChange={e => {
                                     const val = e.target.value;
                                     setDraftCustomPrices(prev => {
                                       const base = prev ?? customPricesData;
                                       const filtered = base.filter(x => x.lab_test_id !== test.id);
                                       if (val === '') return filtered;
                                       return [...filtered, { lab_test_id: test.id, custom_price: val }];
                                     });
                                   }}
                                 />
                               </td>
                             </tr>
                           );
                        })}
                        {globalLabTests.length === 0 && (
                          <tr><td colSpan={2} style={{ padding: '1rem', textAlign: 'center' }}>No Lab Tests found.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
                
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '2rem' }}>
                  <button className="btn btn-primary" onClick={saveCustomPricing} disabled={saveCustomPricingMutation.isPending}>
                    {saveCustomPricingMutation.isPending ? <><MdHourglassEmpty size={16} aria-hidden /> Saving...</> : <><MdSave size={16} aria-hidden /> Save Pricing Details</>}
                  </button>
                </div>
              </div>
            </div>
          )}
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
        <div className="b2b-documents-split page-body">
          <div>
            <div className="card">
              <div className="card-header">
                <span className="card-title">{docFormMeta.id ? 'Edit Document Detail' : 'Document Detail'}</span>
                <button type="button" className="btn btn-ghost" onClick={() => { setView('list'); }}>
                  <MdClose size={16} style={{ verticalAlign: 'text-bottom', marginRight: '0.35rem' }} aria-hidden />Close
                </button>
              </div>
              <form onSubmit={saveDoc} noValidate>
              <div className="card-body">
                <FormGroup label="Document Type" htmlFor="doc-type" required error={docErrors.typeDataId?.message}>
                  <select id="doc-type" data-field="typeDataId" aria-invalid={!!docErrors.typeDataId} style={fieldStyle(!!docErrors.typeDataId)} {...registerDoc('typeDataId')}>
                    <option value="">-- Select Type --</option>
                    {docTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </FormGroup>
                <div className="form-group">
                  <label>File Upload<span style={{ color: '#ef4444' }}> *</span></label>
                  <input type="file" data-field="file" onChange={e => { setDocFormMeta(p => ({ ...p, file: e.target.files ? e.target.files[0] : null })); setDocFileError(''); }} />
                  {docFileError && <div role="alert" style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '0.35rem' }}>{docFileError}</div>}
                  {docFormMeta.id && !docFormMeta.file && (
                    <div style={{ marginTop: '0.35rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      Leave empty to keep the current file.
                    </div>
                  )}
                </div>
              </div>
              <div className="b2b-document-form-actions">
                <button type="submit" className="btn btn-primary">
                  Save
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => { resetDocForm({ typeDataId: '' }); setDocFormMeta({ id: null, file: null, fileName: '' }); setDocFileError(''); }}
                >
                  Reset Data
                </button>
              </div>
              </form>
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
                    resetDocForm({ typeDataId: String(document.type_data_id) });
                    setDocFormMeta({
                      id: document.id,
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
        <TopNav title={`Lab Test Access — ${selectedClient?.company_name || ''}`} />
        <div className="page-body">
          <div className="card">
            <div className="card-header">
              <span className="card-title">List of Lab Test Access for &quot;{selectedClient?.company_name}&quot;</span>
              <button type="button" className="btn btn-ghost" onClick={() => { setView('list'); }}>
                <MdClose size={16} style={{ verticalAlign: 'text-bottom', marginRight: '0.35rem' }} aria-hidden />Close
              </button>
            </div>
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
                          onChange={() => setDraftSelectedIds(prev => {
                            const current = prev ?? new Set(accessList.map(a => a.lab_test_id));
                            const next = new Set(current);
                            if (next.has(t.id)) next.delete(t.id);
                            else next.add(t.id);
                            return next;
                          })} />
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
        <TopNav title={`Wallet — ${selectedClient?.company_name}`} />
        <div className="page-body">

          {/* Balance Banner */}
          <div className="card" style={{ marginBottom: '1.5rem', background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', border: 'none' }}>
            <div className="card-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.75)', marginBottom: '0.25rem' }}>Current Wallet Balance</div>
                <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#fff' }}>${parseFloat(String(walletBalance || 0)).toFixed(2)}</div>
                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>{selectedClient?.company_name}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button
                  type="button"
                  className="btn wallet-banner-close"
                  onClick={() => { setView('list'); }}
                >
                  <MdClose size={16} aria-hidden />Close
                </button>
                <div style={{ fontSize: '3rem', opacity: 0.3 }}><MdAccountBalanceWallet size={48} aria-hidden /></div>
              </div>
            </div>
          </div>

          {/* Recharge Form */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="card-header"><span className="card-title" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}><MdAdd size={18} aria-hidden />Add Funds</span></div>
            <form onSubmit={rechargeWallet} noValidate>
            <div className="card-body">
              <div className="wallet-funds-row">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="wallet-amount">
                    Amount ($)<span className="required-star">*</span>
                  </label>
                  <input
                    id="wallet-amount"
                    type="number"
                    min="0"
                    step="0.01"
                    data-field="amount"
                    placeholder="e.g. 500.00"
                    aria-invalid={!!walletErrors.amount}
                    style={fieldStyle(!!walletErrors.amount)}
                    {...registerWallet('amount')}
                  />
                  <FieldError message={walletErrors.amount?.message} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="wallet-desc">Description / Note</label>
                  <input
                    id="wallet-desc"
                    type="text"
                    data-field="description"
                    placeholder="e.g. Payment received via bank transfer"
                    style={fieldStyle(!!walletErrors.description)}
                    {...registerWallet('description')}
                  />
                  <FieldError message={walletErrors.description?.message} />
                </div>
                <div className="form-group wallet-funds-action" style={{ marginBottom: 0 }}>
                  <label className="wallet-funds-action-label" aria-hidden="true">&nbsp;</label>
                  <button
                    type="submit"
                    className="btn btn-primary wallet-funds-submit"
                    disabled={rechargeWalletMutation.isPending}
                  >
                    {rechargeWalletMutation.isPending
                      ? <><MdHourglassEmpty size={16} aria-hidden /> Adding...</>
                      : <><MdPayment size={16} aria-hidden /> Add Funds</>}
                  </button>
                </div>
              </div>
            </div>
            </form>
          </div>

          {/* Transaction History */}
          <div className="card">
            <div className="card-header">
              <span className="card-title" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                <MdAssignment size={18} aria-hidden />
                Transaction History
              </span>
            </div>
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
                    {walletHistory.map((t: WalletTransaction) => (
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
                          {t.transaction_type === 'CREDIT' ? '+' : '-'}${parseFloat(String(t.amount)).toFixed(2)}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>${parseFloat(String(t.closing_balance)).toFixed(2)}</td>
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
      <div className="page-body">
        <ListingTable
          title="List of B2B Labs"
          columns={clientColumns}
          rows={clients}
          loading={loading}
          emptyText="No B2B Labs found."
          headerActions={<ListingHeaderActions onAdd={openAdd} />}
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
