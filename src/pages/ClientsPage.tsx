import { useCallback, useEffect, useMemo, useState } from 'react';
import { jsPDF } from 'jspdf';
import { Bot, Loader2, Plus, Save, Search, Send, Trash2, X } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

type Stage =
  | 'conhecendo_cliente'
  | 'analisando_orcamento'
  | 'assinatura_contrato'
  | 'cliente_fechado'
  | 'cliente_perdido';

type CRMClient = {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  stage: Stage;
  event_type?: string | null;
  event_date_expected?: string | null;
  budget_expected?: number | null;
  notes?: string | null;
};

type Checklist = {
  id: string;
  client_id: string;
  title: string;
  completed: boolean;
  position: number;
};

type DocType = 'budget' | 'contract';
type ClientDoc = {
  id: string;
  client_id: string;
  doc_type: DocType;
  title: string;
  content: string;
  status: 'draft' | 'pending_signature' | 'signed';
};

type SignReq = {
  id: string;
  client_id: string;
  token: string;
  status: 'pending' | 'signed' | 'expired' | 'cancelled';
  created_at: string;
};

type LeadInteraction = {
  id: string;
  user_id: string;
  client_id: string;
  channel: 'whatsapp' | 'email' | 'ligacao' | 'instagram' | 'reuniao' | 'outro';
  direction: 'outbound' | 'inbound';
  summary: string;
  happened_at: string;
  next_followup_at: string | null;
};

type FollowupTask = {
  id: string;
  user_id: string;
  client_id: string;
  title: string;
  reason: string | null;
  due_date: string;
  status: 'open' | 'done' | 'dismissed';
  source_kind?: 'manual' | 'rule' | 'stage_playbook';
  source_ref?: string | null;
  created_at: string;
};

type FunnelMetric = {
  stage: string;
  leads: number;
  avg_days_in_stage: number;
  conversion_rate: number;
};

type OperationalMetric = {
  metric: string;
  value: number;
  priority: 'alta' | 'media' | 'baixa';
};

type ContractData = {
  id: string;
  user_id: string;
  client_id: string;
  total_value: number | null;
  currency: string;
  service_scope: string | null;
  payment_terms: string | null;
  cancellation_terms: string | null;
  foro_city: string | null;
  notes: string | null;
};

type ClientPerson = {
  id: string;
  user_id: string;
  client_id: string;
  role_label: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  cpf: string | null;
  rg: string | null;
  birth_date: string | null;
  nationality: string | null;
  civil_status: string | null;
  profession: string | null;
};

type ConsentRecord = {
  id: string;
  user_id: string;
  client_id: string;
  lawful_basis: 'consentimento' | 'execucao_contrato' | 'legitimo_interesse' | 'anonimizacao_solicitada';
  consent_text_version: string;
  consent_note: string | null;
  source: 'manual' | 'formulario' | 'whatsapp' | 'email' | 'sistema';
  consented_at: string;
};

type StageHistoryItem = {
  id: string;
  user_id: string;
  client_id: string;
  from_stage: Stage | null;
  to_stage: Stage;
  reason: string | null;
  changed_at: string;
};

type PipelineForecast = {
  stage: string;
  leads: number;
  total_budget: number;
  weighted_budget: number;
  win_rate: number;
};

type PriorityQueueItem = {
  client_id: string;
  client_name: string;
  stage: string;
  priority_score: number;
  priority_reason: string;
  next_action: string;
  due_date: string | null;
};

type ExecutionMetric = {
  metric: string;
  value: number;
};

type PriorityWeight = {
  weight_key: string;
  label: string;
  weight_value: number;
  default_value: number;
};

const STAGES: { value: Stage; label: string }[] = [
  { value: 'conhecendo_cliente', label: 'Conhecendo cliente' },
  { value: 'analisando_orcamento', label: 'Analisando orcamento' },
  { value: 'assinatura_contrato', label: 'Assinatura de contrato' },
  { value: 'cliente_fechado', label: 'Cliente fechado' },
  { value: 'cliente_perdido', label: 'Cliente perdido' },
];

const STAGE_STYLE: Record<Stage, string> = {
  conhecendo_cliente: 'bg-sky-50 text-sky-700 border-sky-200',
  analisando_orcamento: 'bg-violet-50 text-violet-700 border-violet-200',
  assinatura_contrato: 'bg-amber-50 text-amber-700 border-amber-200',
  cliente_fechado: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cliente_perdido: 'bg-rose-50 text-rose-700 border-rose-200',
};

const OPERATIONAL_METRIC_LABELS: Record<string, string> = {
  followups_em_atraso: 'Follow-ups em atraso',
  leads_sem_interacao_7d: 'Leads sem interacao em 7 dias',
  assinaturas_pendentes_3d: 'Assinaturas pendentes ha 3+ dias',
  orcamentos_sem_consentimento: 'Orcamentos sem consentimento',
};

const STAGE_LABEL_BY_VALUE: Record<Stage, string> = {
  conhecendo_cliente: 'Conhecendo cliente',
  analisando_orcamento: 'Analisando orcamento',
  assinatura_contrato: 'Assinatura de contrato',
  cliente_fechado: 'Cliente fechado',
  cliente_perdido: 'Cliente perdido',
};

const EXECUTION_METRIC_LABELS: Record<string, string> = {
  tarefas_playbook_abertas: 'Tarefas playbook abertas',
  tarefas_playbook_atrasadas: 'Tarefas playbook atrasadas',
  clientes_ativos_sem_playbook: 'Clientes ativos sem playbook',
};

const EVENT_TYPE_OPTIONS = [
  {
    value: 'casamento',
    label: 'Casamento',
    description: 'Noivo(a) 1 + Noivo(a) 2',
    image:
      'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=900&q=80',
  },
  {
    value: 'aniversario',
    label: 'Aniversario',
    description: 'Evento social',
    image:
      'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=900&q=80',
  },
  {
    value: 'debutante',
    label: 'Debutante',
    description: 'Festa de 15 anos',
    image:
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80',
  },
  {
    value: 'corporativo',
    label: 'Corporativo',
    description: 'Evento empresarial',
    image:
      'https://images.unsplash.com/photo-1515169067868-5387ec356754?auto=format&fit=crop&w=900&q=80',
  },
] as const;

const INITIAL_CHECKLIST = [
  'Entender objetivo do evento',
  'Mapear volume de convidados',
  'Alinhar faixa de investimento',
  'Definir prazo alvo',
];

function n(v: string | null | undefined) {
  return (v ?? '')
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function toWord(title: string, content: string) {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><h1>${title}</h1><pre>${content}</pre></body></html>`;
  const blob = new Blob(['\ufeff', html], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title}.doc`;
  a.click();
  URL.revokeObjectURL(url);
}

function toPdf(title: string, content: string) {
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
  pdf.setFontSize(14);
  pdf.text(title, 40, 50);
  pdf.setFontSize(11);
  const lines = pdf.splitTextToSize(content || '', 510);
  pdf.text(lines, 40, 80);
  pdf.save(`${title}.pdf`);
}

export function ClientsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState<CRMClient[]>([]);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [checklistByClient, setChecklistByClient] = useState<Record<string, Checklist[]>>({});
  const [docsByClient, setDocsByClient] = useState<Record<string, ClientDoc[]>>({});
  const [reqByClient, setReqByClient] = useState<Record<string, SignReq[]>>({});
  const [interactionsByClient, setInteractionsByClient] = useState<
    Record<string, LeadInteraction[]>
  >({});
  const [followupTasks, setFollowupTasks] = useState<FollowupTask[]>([]);
  const [funnelMetrics, setFunnelMetrics] = useState<FunnelMetric[]>([]);
  const [operationalMetrics, setOperationalMetrics] = useState<OperationalMetric[]>([]);
  const [pipelineForecast, setPipelineForecast] = useState<PipelineForecast[]>([]);
  const [priorityQueue, setPriorityQueue] = useState<PriorityQueueItem[]>([]);
  const [executionMetrics, setExecutionMetrics] = useState<ExecutionMetric[]>([]);
  const [generatingPlaybook, setGeneratingPlaybook] = useState(false);
  const [priorityWeights, setPriorityWeights] = useState<PriorityWeight[]>([]);
  const [savingPriorityWeights, setSavingPriorityWeights] = useState(false);
  const [contractDataByClient, setContractDataByClient] = useState<
    Record<string, ContractData>
  >({});
  const [peopleByClient, setPeopleByClient] = useState<Record<string, ClientPerson[]>>(
    {}
  );
  const [consentByClient, setConsentByClient] = useState<Record<string, ConsentRecord[]>>(
    {}
  );
  const [stageHistoryByClient, setStageHistoryByClient] = useState<
    Record<string, StageHistoryItem[]>
  >({});
  const [contractForm, setContractForm] = useState({
    total_value: '',
    service_scope: '',
    payment_terms: '',
    cancellation_terms: '',
    foro_city: '',
    notes: '',
    principal_name: '',
    principal_email: '',
    principal_phone: '',
    principal_cpf: '',
  });
  const [consentForm, setConsentForm] = useState({
    lawful_basis: 'consentimento' as ConsentRecord['lawful_basis'],
    consent_text_version: 'v1',
    source: 'manual' as ConsentRecord['source'],
    consent_note: '',
  });
  const [interactionForm, setInteractionForm] = useState({
    channel: 'whatsapp' as LeadInteraction['channel'],
    direction: 'outbound' as LeadInteraction['direction'],
    summary: '',
    next_followup_at: '',
  });
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  const [newClientStep, setNewClientStep] = useState<'type' | 'form'>('type');
  const [isProspectModalOpen, setIsProspectModalOpen] = useState(false);
  const [editingProspectId, setEditingProspectId] = useState<string | null>(null);
  const [newClient, setNewClient] = useState({
    name: '',
    email: '',
    phone: '',
    event_type: '',
    event_date_expected: '',
    budget_expected: '',
    notes: '',
    partner1_name: '',
    partner1_email: '',
    partner1_phone: '',
    partner1_cpf: '',
    partner1_rg: '',
    partner1_birth_date: '',
    partner1_nationality: '',
    partner1_civil_status: '',
    partner1_profession: '',
    partner1_address_street: '',
    partner1_address_number: '',
    partner1_address_complement: '',
    partner1_address_neighborhood: '',
    partner1_address_city: '',
    partner1_address_state: '',
    partner1_address_zip: '',
    partner2_name: '',
    partner2_email: '',
    partner2_phone: '',
    partner2_cpf: '',
    partner2_rg: '',
    partner2_birth_date: '',
    partner2_nationality: '',
    partner2_civil_status: '',
    partner2_profession: '',
    partner2_address_street: '',
    partner2_address_number: '',
    partner2_address_complement: '',
    partner2_address_neighborhood: '',
    partner2_address_city: '',
    partner2_address_state: '',
    partner2_address_zip: '',
  });
  const [prospectDraft, setProspectDraft] = useState({
    name: '',
    email: '',
    phone: '',
    event_type: '',
    event_date_expected: '',
    budget_expected: '',
    notes: '',
  });
  const [newChecklist, setNewChecklist] = useState('');
  const [budgetText, setBudgetText] = useState('');
  const [contractText, setContractText] = useState('');
  const [busyDoc, setBusyDoc] = useState<DocType | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingClient, setDeletingClient] = useState(false);
  const [isPortfolioModalOpen, setIsPortfolioModalOpen] = useState(false);
  const [portfolioPdfFile, setPortfolioPdfFile] = useState<File | null>(null);
  const [portfolioPdfPreviewUrl, setPortfolioPdfPreviewUrl] = useState<string>('');
  const [portfolioLead, setPortfolioLead] = useState({
    name: '',
    email: '',
    whatsapp: '',
  });
  const [portfolioSender, setPortfolioSender] = useState({
    name: '',
    email: '',
    whatsapp: '',
    instagram: '',
  });
  const [portfolioMessage, setPortfolioMessage] = useState('');
  const [sendingPortfolio, setSendingPortfolio] = useState(false);

  const reload = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data: cData } = await supabase
      .from('crm_clients')
      .select('id,user_id,name,email,phone,stage,event_type,event_date_expected,budget_expected,notes')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });
    let allClients = (cData ?? []) as CRMClient[];
    const { data: pwData } = await supabase.rpc('get_crm_priority_weights');
    setPriorityWeights((pwData ?? []) as PriorityWeight[]);

    const { data: eventsData } = await supabase
      .from('events')
      .select('name,couple,event_date')
      .eq('user_id', user.id)
      .or('status.is.null,status.neq.deleted');

    if (Array.isArray(eventsData) && eventsData.length > 0) {
      const existingNames = new Set(allClients.map((c) => n(c.name)));
      const importPayload = eventsData
        .map((e: any) => ({
          name: (e.couple || e.name || '').trim(),
          event_date_expected: e.event_date || null,
        }))
        .filter((e: any) => e.name && !existingNames.has(n(e.name)))
        .map((e: any) => ({
          user_id: user.id,
          name: e.name,
          stage: 'cliente_fechado',
          event_date_expected: e.event_date_expected,
          notes: 'Importado automaticamente de evento existente.',
        }));

      if (importPayload.length > 0) {
        await supabase.from('crm_clients').insert(importPayload);
        const { data: cDataRefetch } = await supabase
          .from('crm_clients')
          .select('id,user_id,name,email,phone,stage,event_type,event_date_expected,budget_expected,notes')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false });
        allClients = (cDataRefetch ?? []) as CRMClient[];
      }
    }
    const ids = allClients.map((c) => c.id);
    if (!ids.length) {
      setClients([]);
      setSelectedId(null);
      setChecklistByClient({});
      setDocsByClient({});
      setReqByClient({});
      setInteractionsByClient({});
      setFollowupTasks([]);
      setFunnelMetrics([]);
      setOperationalMetrics([]);
      setPipelineForecast([]);
      setPriorityQueue([]);
      setExecutionMetrics([]);
      setPriorityWeights((pwData ?? []) as PriorityWeight[]);
      setContractDataByClient({});
      setPeopleByClient({});
      setConsentByClient({});
      setStageHistoryByClient({});
      setLoading(false);
      return;
    }
    await supabase.rpc('generate_crm_followups_for_user', { p_user_id: user.id });

    const [kRes, dRes, rRes, iRes, fRes, mRes, omRes, pfRes, pqRes, exRes, cRes, pRes, crRes, shRes] = await Promise.all([
      supabase
        .from('crm_client_checklist_items')
        .select('id,client_id,title,completed,position')
        .in('client_id', ids)
        .order('position', { ascending: true }),
      supabase
        .from('crm_client_documents')
        .select('id,client_id,doc_type,title,content,status')
        .in('client_id', ids),
      supabase
        .from('crm_signature_requests')
        .select('id,client_id,token,status,created_at')
        .in('client_id', ids)
        .order('created_at', { ascending: false }),
      supabase
        .from('crm_lead_interactions')
        .select('id,user_id,client_id,channel,direction,summary,happened_at,next_followup_at')
        .in('client_id', ids)
        .order('happened_at', { ascending: false }),
      supabase
        .from('crm_followup_tasks')
        .select('id,user_id,client_id,title,reason,due_date,status,source_kind,source_ref,created_at')
        .eq('user_id', user.id)
        .eq('status', 'open')
        .order('due_date', { ascending: true })
        .order('created_at', { ascending: false }),
      supabase.rpc('get_crm_funnel_metrics'),
      supabase.rpc('get_crm_operational_metrics'),
      supabase.rpc('get_crm_pipeline_forecast'),
      supabase.rpc('get_crm_priority_queue', { p_limit: 8 }),
      supabase.rpc('get_crm_execution_metrics'),
      supabase
        .from('crm_contract_data')
        .select('id,user_id,client_id,total_value,currency,service_scope,payment_terms,cancellation_terms,foro_city,notes')
        .in('client_id', ids),
      supabase
        .from('crm_client_people')
        .select('id,user_id,client_id,role_label,full_name,email,phone,cpf,rg,birth_date,nationality,civil_status,profession')
        .in('client_id', ids)
        .order('created_at', { ascending: true }),
      supabase
        .from('crm_consent_records')
        .select('id,user_id,client_id,lawful_basis,consent_text_version,consent_note,source,consented_at')
        .in('client_id', ids)
        .order('consented_at', { ascending: false }),
      supabase
        .from('crm_client_stage_history')
        .select('id,user_id,client_id,from_stage,to_stage,reason,changed_at')
        .in('client_id', ids)
        .order('changed_at', { ascending: false }),
    ]);
    const gK: Record<string, Checklist[]> = {};
    ((kRes.data ?? []) as Checklist[]).forEach((i) => {
      gK[i.client_id] = [...(gK[i.client_id] ?? []), i];
    });
    const gD: Record<string, ClientDoc[]> = {};
    ((dRes.data ?? []) as ClientDoc[]).forEach((i) => {
      gD[i.client_id] = [...(gD[i.client_id] ?? []), i];
    });
    const gR: Record<string, SignReq[]> = {};
    ((rRes.data ?? []) as SignReq[]).forEach((i) => {
      gR[i.client_id] = [...(gR[i.client_id] ?? []), i];
    });
    const gI: Record<string, LeadInteraction[]> = {};
    ((iRes.data ?? []) as LeadInteraction[]).forEach((i) => {
      gI[i.client_id] = [...(gI[i.client_id] ?? []), i];
    });
    const gC: Record<string, ContractData> = {};
    ((cRes.data ?? []) as ContractData[]).forEach((item) => {
      gC[item.client_id] = item;
    });
    const gP: Record<string, ClientPerson[]> = {};
    ((pRes.data ?? []) as ClientPerson[]).forEach((item) => {
      gP[item.client_id] = [...(gP[item.client_id] ?? []), item];
    });
    const gCR: Record<string, ConsentRecord[]> = {};
    ((crRes.data ?? []) as ConsentRecord[]).forEach((item) => {
      gCR[item.client_id] = [...(gCR[item.client_id] ?? []), item];
    });
    const gSH: Record<string, StageHistoryItem[]> = {};
    ((shRes.data ?? []) as StageHistoryItem[]).forEach((item) => {
      gSH[item.client_id] = [...(gSH[item.client_id] ?? []), item];
    });
    setClients(allClients);
    setChecklistByClient(gK);
    setDocsByClient(gD);
    setReqByClient(gR);
    setInteractionsByClient(gI);
    setFollowupTasks((fRes.data ?? []) as FollowupTask[]);
    setFunnelMetrics((mRes.data ?? []) as FunnelMetric[]);
    setOperationalMetrics((omRes.data ?? []) as OperationalMetric[]);
    setPipelineForecast((pfRes.data ?? []) as PipelineForecast[]);
    setPriorityQueue((pqRes.data ?? []) as PriorityQueueItem[]);
    setExecutionMetrics((exRes.data ?? []) as ExecutionMetric[]);
    setContractDataByClient(gC);
    setPeopleByClient(gP);
    setConsentByClient(gCR);
    setStageHistoryByClient(gSH);
    setSelectedId((prev) => (prev && allClients.some((c) => c.id === prev) ? prev : allClients[0]?.id ?? null));
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const list = useMemo(() => {
    const t = n(search);
    return !t
      ? clients
      : clients.filter((c) => n(c.name).includes(t) || n(c.email).includes(t) || n(c.phone).includes(t));
  }, [clients, search]);

  const stageCount = useMemo(
    () =>
      STAGES.reduce(
        (acc, stage) => ({
          ...acc,
          [stage.value]: list.filter((c) => c.stage === stage.value).length,
        }),
        {} as Record<Stage, number>
      ),
    [list]
  );

  const selected = useMemo(
    () => clients.find((c) => c.id === selectedId) ?? null,
    [clients, selectedId]
  );
  const selectedChecklist = useMemo(
    () => (selected ? checklistByClient[selected.id] ?? [] : []),
    [checklistByClient, selected]
  );
  const selectedDocs = useMemo(
    () => (selected ? docsByClient[selected.id] ?? [] : []),
    [docsByClient, selected]
  );
  const budgetDoc = selectedDocs.find((d) => d.doc_type === 'budget');
  const contractDoc = selectedDocs.find((d) => d.doc_type === 'contract');
  const pendingReq = useMemo(
    () =>
      selected ? (reqByClient[selected.id] ?? []).filter((r) => r.status === 'pending') : [],
    [reqByClient, selected]
  );
  const selectedInteractions = useMemo(
    () => (selected ? interactionsByClient[selected.id] ?? [] : []),
    [interactionsByClient, selected]
  );
  const selectedFollowups = useMemo(
    () => (selected ? followupTasks.filter((task) => task.client_id === selected.id) : []),
    [followupTasks, selected]
  );
  const selectedContractData = useMemo(
    () => (selected ? contractDataByClient[selected.id] ?? null : null),
    [contractDataByClient, selected]
  );
  const selectedPeople = useMemo(
    () => (selected ? peopleByClient[selected.id] ?? [] : []),
    [peopleByClient, selected]
  );
  const selectedConsents = useMemo(
    () => (selected ? consentByClient[selected.id] ?? [] : []),
    [consentByClient, selected]
  );
  const selectedStageHistory = useMemo(
    () => (selected ? stageHistoryByClient[selected.id] ?? [] : []),
    [stageHistoryByClient, selected]
  );

  const partnerOneName = newClient.partner1_name.trim() || 'Noiva';
  const partnerTwoName = newClient.partner2_name.trim() || 'Noivo';

  function resetNewClientForm() {
    setNewClient({
      name: '',
      email: '',
      phone: '',
      event_type: '',
      event_date_expected: '',
      budget_expected: '',
      notes: '',
      partner1_name: '',
      partner1_email: '',
      partner1_phone: '',
      partner1_cpf: '',
      partner1_rg: '',
      partner1_birth_date: '',
      partner1_nationality: '',
      partner1_civil_status: '',
      partner1_profession: '',
      partner1_address_street: '',
      partner1_address_number: '',
      partner1_address_complement: '',
      partner1_address_neighborhood: '',
      partner1_address_city: '',
      partner1_address_state: '',
      partner1_address_zip: '',
      partner2_name: '',
      partner2_email: '',
      partner2_phone: '',
      partner2_cpf: '',
      partner2_rg: '',
      partner2_birth_date: '',
      partner2_nationality: '',
      partner2_civil_status: '',
      partner2_profession: '',
      partner2_address_street: '',
      partner2_address_number: '',
      partner2_address_complement: '',
      partner2_address_neighborhood: '',
      partner2_address_city: '',
      partner2_address_state: '',
      partner2_address_zip: '',
    });
    setNewClientStep('type');
  }

  function openNewClientWizard() {
    resetNewClientForm();
    setIsNewClientModalOpen(true);
  }

  function closeNewClientWizard() {
    setIsNewClientModalOpen(false);
    setNewClientStep('type');
  }

  useEffect(() => {
    if (!portfolioPdfFile) {
      setPortfolioPdfPreviewUrl('');
      return;
    }

    const nextUrl = URL.createObjectURL(portfolioPdfFile);
    setPortfolioPdfPreviewUrl(nextUrl);

    return () => {
      URL.revokeObjectURL(nextUrl);
    };
  }, [portfolioPdfFile]);

  useEffect(() => {
    const leadName = portfolioLead.name.trim() || 'cliente';
    const senderName = portfolioSender.name.trim() || 'Assessoria';
    const senderWhatsapp = portfolioSender.whatsapp.trim() || '[Seu WhatsApp]';
    const senderEmail = portfolioSender.email.trim() || '[Seu E-mail]';
    const senderInstagram = portfolioSender.instagram.trim() || '[Seu Instagram]';

    setPortfolioMessage(
      `Ola ${leadName}, tudo bem?\n\n` +
        `Segue meu portfolio para voce conhecer melhor meu trabalho.\n\n` +
        `No final da mensagem vou incluir o link publico do portfolio.\n\n` +
        `Qualquer duvida, fico a disposicao.\n\n` +
        `Contatos:\n` +
        `Nome: ${senderName}\n` +
        `WhatsApp: ${senderWhatsapp}\n` +
        `E-mail: ${senderEmail}\n` +
        `Instagram: ${senderInstagram}`
    );
  }, [
    portfolioLead.name,
    portfolioSender.name,
    portfolioSender.whatsapp,
    portfolioSender.email,
    portfolioSender.instagram,
  ]);

  useEffect(() => setBudgetText(budgetDoc?.content ?? ''), [budgetDoc?.id, budgetDoc?.content]);
  useEffect(() => setContractText(contractDoc?.content ?? ''), [contractDoc?.id, contractDoc?.content]);
  useEffect(() => {
    const principal =
      selectedPeople.find((person) => person.role_label === 'contato_principal') ??
      selectedPeople[0];
    setContractForm({
      total_value:
        typeof selectedContractData?.total_value === 'number'
          ? String(selectedContractData.total_value)
          : '',
      service_scope: selectedContractData?.service_scope ?? '',
      payment_terms: selectedContractData?.payment_terms ?? '',
      cancellation_terms: selectedContractData?.cancellation_terms ?? '',
      foro_city: selectedContractData?.foro_city ?? '',
      notes: selectedContractData?.notes ?? '',
      principal_name: principal?.full_name ?? '',
      principal_email: principal?.email ?? '',
      principal_phone: principal?.phone ?? '',
      principal_cpf: principal?.cpf ?? '',
    });
  }, [selectedContractData, selectedPeople, selected?.id]);

  async function createClient() {
    if (!user?.id) return;
    setSaving(true);
    const isWedding = n(newClient.event_type) === 'casamento';
    const weddingNames = [newClient.partner1_name.trim(), newClient.partner2_name.trim()]
      .filter(Boolean)
      .join(' & ');
    const finalName = newClient.name.trim() || (isWedding ? weddingNames : '') || 'Cliente em prospeccao';
    const finalEmail =
      newClient.email.trim() ||
      newClient.partner1_email.trim() ||
      newClient.partner2_email.trim() ||
      null;
    const finalPhone =
      newClient.phone.trim() ||
      newClient.partner1_phone.trim() ||
      newClient.partner2_phone.trim() ||
      null;

    const notesBlock = [
      newClient.notes.trim(),
      isWedding
        ? [
            '--- Dados do Casal ---',
            `Noiva: ${newClient.partner1_name.trim() || '-'}`,
            `Email ${newClient.partner1_name.trim() || 'Noiva'}: ${newClient.partner1_email.trim() || '-'}`,
            `Telefone ${newClient.partner1_name.trim() || 'Noiva'}: ${newClient.partner1_phone.trim() || '-'}`,
            `CPF ${newClient.partner1_name.trim() || 'Noiva'}: ${newClient.partner1_cpf.trim() || '-'}`,
            `RG ${newClient.partner1_name.trim() || 'Noiva'}: ${newClient.partner1_rg.trim() || '-'}`,
            `Nascimento ${newClient.partner1_name.trim() || 'Noiva'}: ${newClient.partner1_birth_date.trim() || '-'}`,
            `Nacionalidade ${newClient.partner1_name.trim() || 'Noiva'}: ${newClient.partner1_nationality.trim() || '-'}`,
            `Estado civil ${newClient.partner1_name.trim() || 'Noiva'}: ${newClient.partner1_civil_status.trim() || '-'}`,
            `Profissao ${newClient.partner1_name.trim() || 'Noiva'}: ${newClient.partner1_profession.trim() || '-'}`,
            `Endereco ${newClient.partner1_name.trim() || 'Noiva'}: ${newClient.partner1_address_street.trim() || '-'}, ${newClient.partner1_address_number.trim() || '-'} ${newClient.partner1_address_complement.trim() || ''} - ${newClient.partner1_address_neighborhood.trim() || '-'}, ${newClient.partner1_address_city.trim() || '-'} / ${newClient.partner1_address_state.trim() || '-'} CEP ${newClient.partner1_address_zip.trim() || '-'}`,
            '',
            `Noivo: ${newClient.partner2_name.trim() || '-'}`,
            `Email ${newClient.partner2_name.trim() || 'Noivo'}: ${newClient.partner2_email.trim() || '-'}`,
            `Telefone ${newClient.partner2_name.trim() || 'Noivo'}: ${newClient.partner2_phone.trim() || '-'}`,
            `CPF ${newClient.partner2_name.trim() || 'Noivo'}: ${newClient.partner2_cpf.trim() || '-'}`,
            `RG ${newClient.partner2_name.trim() || 'Noivo'}: ${newClient.partner2_rg.trim() || '-'}`,
            `Nascimento ${newClient.partner2_name.trim() || 'Noivo'}: ${newClient.partner2_birth_date.trim() || '-'}`,
            `Nacionalidade ${newClient.partner2_name.trim() || 'Noivo'}: ${newClient.partner2_nationality.trim() || '-'}`,
            `Estado civil ${newClient.partner2_name.trim() || 'Noivo'}: ${newClient.partner2_civil_status.trim() || '-'}`,
            `Profissao ${newClient.partner2_name.trim() || 'Noivo'}: ${newClient.partner2_profession.trim() || '-'}`,
            `Endereco ${newClient.partner2_name.trim() || 'Noivo'}: ${newClient.partner2_address_street.trim() || '-'}, ${newClient.partner2_address_number.trim() || '-'} ${newClient.partner2_address_complement.trim() || ''} - ${newClient.partner2_address_neighborhood.trim() || '-'}, ${newClient.partner2_address_city.trim() || '-'} / ${newClient.partner2_address_state.trim() || '-'} CEP ${newClient.partner2_address_zip.trim() || '-'}`,
          ].join('\n')
        : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    const { data } = await supabase
      .from('crm_clients')
      .insert({
        user_id: user.id,
        name: finalName,
        email: finalEmail,
        phone: finalPhone,
        stage: 'conhecendo_cliente',
        event_type: newClient.event_type.trim() || null,
        event_date_expected: newClient.event_date_expected || null,
        budget_expected: newClient.budget_expected
          ? Number(newClient.budget_expected.replace(',', '.'))
          : null,
        notes: notesBlock || null,
      })
      .select('id')
      .maybeSingle();
    if (data?.id) {
      await supabase.from('crm_contract_data').upsert(
        {
          user_id: user.id,
          client_id: data.id,
          total_value: newClient.budget_expected
            ? Number(newClient.budget_expected.replace(',', '.'))
            : null,
          notes: newClient.notes.trim() || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'client_id' }
      );

      if (isWedding) {
        const { data: insertedPeople } = await supabase
          .from('crm_client_people')
          .insert([
            {
              user_id: user.id,
              client_id: data.id,
              role_label: 'noiva',
              full_name: newClient.partner1_name.trim() || null,
              email: newClient.partner1_email.trim() || null,
              phone: newClient.partner1_phone.trim() || null,
              cpf: newClient.partner1_cpf.trim() || null,
              rg: newClient.partner1_rg.trim() || null,
              birth_date: newClient.partner1_birth_date || null,
              nationality: newClient.partner1_nationality.trim() || null,
              civil_status: newClient.partner1_civil_status.trim() || null,
              profession: newClient.partner1_profession.trim() || null,
            },
            {
              user_id: user.id,
              client_id: data.id,
              role_label: 'noivo',
              full_name: newClient.partner2_name.trim() || null,
              email: newClient.partner2_email.trim() || null,
              phone: newClient.partner2_phone.trim() || null,
              cpf: newClient.partner2_cpf.trim() || null,
              rg: newClient.partner2_rg.trim() || null,
              birth_date: newClient.partner2_birth_date || null,
              nationality: newClient.partner2_nationality.trim() || null,
              civil_status: newClient.partner2_civil_status.trim() || null,
              profession: newClient.partner2_profession.trim() || null,
            },
          ])
          .select('id, role_label');

        if (insertedPeople && insertedPeople.length > 0) {
          const noivaId = insertedPeople.find((person) => person.role_label === 'noiva')?.id;
          const noivoId = insertedPeople.find((person) => person.role_label === 'noivo')?.id;
          await supabase.from('crm_client_addresses').insert([
            {
              user_id: user.id,
              client_id: data.id,
              person_id: noivaId ?? null,
              label: 'residencia_noiva',
              street: newClient.partner1_address_street.trim() || null,
              number: newClient.partner1_address_number.trim() || null,
              complement: newClient.partner1_address_complement.trim() || null,
              neighborhood: newClient.partner1_address_neighborhood.trim() || null,
              city: newClient.partner1_address_city.trim() || null,
              state: newClient.partner1_address_state.trim() || null,
              zip: newClient.partner1_address_zip.trim() || null,
            },
            {
              user_id: user.id,
              client_id: data.id,
              person_id: noivoId ?? null,
              label: 'residencia_noivo',
              street: newClient.partner2_address_street.trim() || null,
              number: newClient.partner2_address_number.trim() || null,
              complement: newClient.partner2_address_complement.trim() || null,
              neighborhood: newClient.partner2_address_neighborhood.trim() || null,
              city: newClient.partner2_address_city.trim() || null,
              state: newClient.partner2_address_state.trim() || null,
              zip: newClient.partner2_address_zip.trim() || null,
            },
          ]);
        }
      } else {
        await supabase.from('crm_client_people').insert({
          user_id: user.id,
          client_id: data.id,
          role_label: 'contato_principal',
          full_name: finalName,
          email: finalEmail,
          phone: finalPhone,
        });
      }

      await supabase.from('crm_client_checklist_items').insert(
        INITIAL_CHECKLIST.map((title, idx) => ({
          user_id: user.id,
          client_id: data.id,
          title,
          position: idx + 1,
        }))
      );
    }
    resetNewClientForm();
    closeNewClientWizard();
    setSaving(false);
    await reload();
    if (data?.id) setSelectedId(data.id);
  }

  async function saveStructuredContractData() {
    if (!selected || !user?.id) return;

    await supabase.from('crm_contract_data').upsert(
      {
        user_id: user.id,
        client_id: selected.id,
        total_value: contractForm.total_value
          ? Number(contractForm.total_value.replace(',', '.'))
          : null,
        service_scope: contractForm.service_scope.trim() || null,
        payment_terms: contractForm.payment_terms.trim() || null,
        cancellation_terms: contractForm.cancellation_terms.trim() || null,
        foro_city: contractForm.foro_city.trim() || null,
        notes: contractForm.notes.trim() || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'client_id' }
    );

    const principal =
      selectedPeople.find((person) => person.role_label === 'contato_principal') ??
      selectedPeople[0] ??
      null;

    if (principal) {
      await supabase
        .from('crm_client_people')
        .update({
          full_name: contractForm.principal_name.trim() || null,
          email: contractForm.principal_email.trim() || null,
          phone: contractForm.principal_phone.trim() || null,
          cpf: contractForm.principal_cpf.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', principal.id)
        .eq('user_id', user.id);
    } else {
      await supabase.from('crm_client_people').insert({
        user_id: user.id,
        client_id: selected.id,
        role_label: 'contato_principal',
        full_name: contractForm.principal_name.trim() || selected.name,
        email: contractForm.principal_email.trim() || null,
        phone: contractForm.principal_phone.trim() || null,
        cpf: contractForm.principal_cpf.trim() || null,
      });
    }

    await reload();
  }

  async function registerConsentRecord() {
    if (!selected || !user?.id) return;
    const version = consentForm.consent_text_version.trim() || 'v1';
    const note = consentForm.consent_note.trim() || null;
    const { data, error } = await supabase
      .from('crm_consent_records')
      .insert({
        user_id: user.id,
        client_id: selected.id,
        lawful_basis: consentForm.lawful_basis,
        consent_text_version: version,
        consent_note: note,
        source: consentForm.source,
      })
      .select('id,user_id,client_id,lawful_basis,consent_text_version,consent_note,source,consented_at')
      .maybeSingle();

    if (error || !data) {
      alert('Nao foi possivel registrar o consentimento agora.');
      return;
    }

    setConsentByClient((prev) => ({
      ...prev,
      [selected.id]: [data as ConsentRecord, ...(prev[selected.id] ?? [])],
    }));
    setConsentForm((prev) => ({ ...prev, consent_note: '' }));
  }

  async function exportClientData() {
    if (!selected) return;
    const { data, error } = await supabase.rpc('export_crm_client_data', {
      p_client_id: selected.id,
    });
    if (error || !data) {
      alert('Nao foi possivel exportar os dados deste cliente.');
      return;
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lgpd-export-${selected.name.replace(/\s+/g, '_').toLowerCase()}-${selected.id.slice(
      0,
      8
    )}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function anonymizeClientData() {
    if (!selected) return;
    const confirmDelete = window.confirm(
      `Anonimizar os dados pessoais de ${selected.name}? Esta acao nao tem desfazer.`
    );
    if (!confirmDelete) return;

    const note = consentForm.consent_note.trim() || null;
    const { data, error } = await supabase.rpc('anonymize_crm_client_data', {
      p_client_id: selected.id,
      p_reason: note,
    });
    if (error || !data) {
      alert('Nao foi possivel anonimizar os dados deste cliente.');
      return;
    }

    await reload();
  }

  async function setStage(stage: Stage) {
    if (!selected) return;
    let lostReason: string | null = null;
    if (stage === 'cliente_perdido') {
      const asked = window.prompt(
        'Motivo da perda deste cliente (opcional, recomendado para analise futura):',
        selected.notes ?? ''
      );
      if (asked === null) return;
      lostReason = asked.trim() || null;
    }
    await supabase
      .from('crm_clients')
      .update({
        stage,
        lost_reason: stage === 'cliente_perdido' ? lostReason : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', selected.id)
      .eq('user_id', selected.user_id);
    await reload();
  }

  function openProspectModal(client: CRMClient) {
    setEditingProspectId(client.id);
    setProspectDraft({
      name: client.name || '',
      email: client.email || '',
      phone: client.phone || '',
      event_type: client.event_type || '',
      event_date_expected: client.event_date_expected || '',
      budget_expected:
        typeof client.budget_expected === 'number' ? String(client.budget_expected) : '',
      notes: client.notes || '',
    });
    setIsProspectModalOpen(true);
  }

  async function saveProspect(nextStage?: Stage) {
    if (!editingProspectId || !user?.id) return;
    const stage =
      nextStage ??
      (clients.find((c) => c.id === editingProspectId)?.stage || 'conhecendo_cliente');
    await supabase
      .from('crm_clients')
      .update({
        name: prospectDraft.name.trim() || 'Cliente em prospeccao',
        email: prospectDraft.email.trim() || null,
        phone: prospectDraft.phone.trim() || null,
        event_type: prospectDraft.event_type.trim() || null,
        event_date_expected: prospectDraft.event_date_expected || null,
        budget_expected: prospectDraft.budget_expected
          ? Number(prospectDraft.budget_expected.replace(',', '.'))
          : null,
        notes: prospectDraft.notes.trim() || null,
        stage,
        updated_at: new Date().toISOString(),
      })
      .eq('id', editingProspectId)
      .eq('user_id', user.id);

    await supabase.from('crm_contract_data').upsert(
      {
        user_id: user.id,
        client_id: editingProspectId,
        total_value: prospectDraft.budget_expected
          ? Number(prospectDraft.budget_expected.replace(',', '.'))
          : null,
        notes: prospectDraft.notes.trim() || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'client_id' }
    );

    setIsProspectModalOpen(false);
    await reload();
    setSelectedId(editingProspectId);
  }

  async function addChecklist() {
    if (!selected || !user?.id || !newChecklist.trim()) return;
    const { data } = await supabase
      .from('crm_client_checklist_items')
      .insert({
        user_id: user.id,
        client_id: selected.id,
        title: newChecklist.trim(),
        position: selectedChecklist.length + 1,
      })
      .select('id,client_id,title,completed,position')
      .maybeSingle();
    if (data) {
      setChecklistByClient((prev) => ({ ...prev, [selected.id]: [...(prev[selected.id] ?? []), data as Checklist] }));
      setNewChecklist('');
    }
  }

  async function addInteraction() {
    if (!selected || !user?.id) return;
    if (!interactionForm.summary.trim()) return;

    const { data, error } = await supabase
      .from('crm_lead_interactions')
      .insert({
        user_id: user.id,
        client_id: selected.id,
        channel: interactionForm.channel,
        direction: interactionForm.direction,
        summary: interactionForm.summary.trim(),
        happened_at: new Date().toISOString(),
        next_followup_at: interactionForm.next_followup_at || null,
      })
      .select('id,user_id,client_id,channel,direction,summary,happened_at,next_followup_at')
      .maybeSingle();

    if (error || !data) return;

    setInteractionsByClient((prev) => ({
      ...prev,
      [selected.id]: [data as LeadInteraction, ...(prev[selected.id] ?? [])],
    }));
    setInteractionForm((prev) => ({ ...prev, summary: '', next_followup_at: '' }));

    await supabase.rpc('generate_crm_followups_for_user', { p_user_id: user.id });
    const { data: refreshedFollowups } = await supabase
      .from('crm_followup_tasks')
      .select('id,user_id,client_id,title,reason,due_date,status,source_kind,source_ref,created_at')
      .eq('user_id', user.id)
      .eq('status', 'open')
      .order('due_date', { ascending: true })
      .order('created_at', { ascending: false });
    setFollowupTasks((refreshedFollowups ?? []) as FollowupTask[]);
  }

  async function markFollowupDone(taskId: string) {
    if (!user?.id) return;
    const { error } = await supabase
      .from('crm_followup_tasks')
      .update({ status: 'done', completed_at: new Date().toISOString() })
      .eq('id', taskId)
      .eq('user_id', user.id);
    if (error) return;
    setFollowupTasks((prev) => prev.filter((task) => task.id !== taskId));
  }

  async function generatePlaybookTasks() {
    if (!user?.id) return;
    setGeneratingPlaybook(true);
    const { error } = await supabase.rpc('generate_crm_stage_playbook_tasks', {
      p_user_id: user.id,
    });
    if (error) {
      setGeneratingPlaybook(false);
      alert('Nao foi possivel gerar tarefas do playbook agora.');
      return;
    }
    setGeneratingPlaybook(false);
    await reload();
  }

  function updatePriorityWeight(weightKey: string, nextValue: string) {
    const parsed = Number(nextValue);
    setPriorityWeights((prev) =>
      prev.map((item) =>
        item.weight_key === weightKey
          ? { ...item, weight_value: Number.isFinite(parsed) ? Math.round(parsed) : 0 }
          : item
      )
    );
  }

  async function savePriorityWeights() {
    if (!user?.id || priorityWeights.length === 0) return;
    setSavingPriorityWeights(true);
    const payload = priorityWeights.map((item) => ({
      user_id: user.id,
      weight_key: item.weight_key,
      weight_value: Math.round(Number(item.weight_value || 0)),
      updated_at: new Date().toISOString(),
    }));
    const { error } = await supabase
      .from('crm_priority_weights')
      .upsert(payload, { onConflict: 'user_id,weight_key' });
    setSavingPriorityWeights(false);
    if (error) {
      alert('Nao foi possivel salvar os pesos agora.');
      return;
    }
    await reload();
  }

  function resetPriorityWeightsToDefault() {
    setPriorityWeights((prev) =>
      prev.map((item) => ({ ...item, weight_value: item.default_value }))
    );
  }

  async function toggleChecklist(item: Checklist) {
    if (!selected) return;
    await supabase
      .from('crm_client_checklist_items')
      .update({ completed: !item.completed, updated_at: new Date().toISOString() })
      .eq('id', item.id);
    setChecklistByClient((prev) => ({
      ...prev,
      [selected.id]: (prev[selected.id] ?? []).map((r) => (r.id === item.id ? { ...r, completed: !r.completed } : r)),
    }));
  }

  async function upsertDoc(type: DocType, content: string, status: 'draft' | 'pending_signature' = 'draft') {
    if (!selected || !user?.id) return null;
    const existing = (docsByClient[selected.id] ?? []).find((d) => d.doc_type === type);
    if (!existing) {
      const { data } = await supabase
        .from('crm_client_documents')
        .insert({
          user_id: user.id,
          client_id: selected.id,
          doc_type: type,
          title: `${type === 'budget' ? 'Orcamento' : 'Contrato'} - ${selected.name}`,
          content,
          status,
        })
        .select('id,client_id,doc_type,title,content,status')
        .maybeSingle();
      if (data) {
        setDocsByClient((prev) => ({ ...prev, [selected.id]: [...(prev[selected.id] ?? []), data as ClientDoc] }));
        return data as ClientDoc;
      }
      return null;
    }
    const { data } = await supabase
      .from('crm_client_documents')
      .update({ content, status, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select('id,client_id,doc_type,title,content,status')
      .maybeSingle();
    if (data) {
      setDocsByClient((prev) => ({
        ...prev,
        [selected.id]: (prev[selected.id] ?? []).map((d) => (d.id === existing.id ? (data as ClientDoc) : d)),
      }));
      return data as ClientDoc;
    }
    return null;
  }

  function buildStructuredContextForAI() {
    if (!selected) return '';

    const people = selectedPeople
      .map((person) => {
        const pieces = [
          `Papel: ${person.role_label}`,
          `Nome: ${person.full_name || '-'}`,
          `Email: ${person.email || '-'}`,
          `Telefone: ${person.phone || '-'}`,
          `CPF: ${person.cpf || '-'}`,
          `RG: ${person.rg || '-'}`,
          `Nascimento: ${person.birth_date || '-'}`,
          `Nacionalidade: ${person.nationality || '-'}`,
          `Estado civil: ${person.civil_status || '-'}`,
          `Profissao: ${person.profession || '-'}`,
        ];
        return pieces.join(' | ');
      })
      .join('\n');

    const contractInfo = [
      `Valor total: ${contractForm.total_value || '-'}`,
      `Escopo: ${contractForm.service_scope || '-'}`,
      `Pagamento: ${contractForm.payment_terms || '-'}`,
      `Cancelamento: ${contractForm.cancellation_terms || '-'}`,
      `Foro: ${contractForm.foro_city || '-'}`,
      `Notas contratuais: ${contractForm.notes || '-'}`,
      `Contato principal: ${contractForm.principal_name || '-'}`,
      `Email contato principal: ${contractForm.principal_email || '-'}`,
      `Telefone contato principal: ${contractForm.principal_phone || '-'}`,
      `CPF contato principal: ${contractForm.principal_cpf || '-'}`,
    ].join('\n');

    const base = [
      `Cliente: ${selected.name}`,
      `Tipo de evento: ${selected.event_type || '-'}`,
      `Data prevista: ${selected.event_date_expected || '-'}`,
      `Orcamento previsto: ${selected.budget_expected ?? '-'}`,
      '',
      'Pessoas estruturadas:',
      people || '-',
      '',
      'Dados contratuais estruturados:',
      contractInfo,
    ];

    return base.join('\n');
  }

  async function aiFill(type: DocType) {
    if (!selected) return;
    setBusyDoc(type);
    const fallback =
      type === 'budget'
        ? `Proposta comercial para ${selected.name}\n\nEscopo:\n- Planejamento\n- Fornecedores\n- Operacao`
        : `Contrato de prestacao de servicos\n\nContratante: ${selected.name}\n\nClausulas:\n1. Objeto\n2. Pagamento\n3. Cancelamento`;

    const structuredContext = buildStructuredContextForAI();
    const userPrompt =
      type === 'budget'
        ? `Com base nos dados estruturados abaixo, gere um ORCAMENTO comercial completo em portugues (pt-BR), com escopo, cronograma macro, investimento, condicoes e proximos passos.\n\n${structuredContext}`
        : `Com base nos dados estruturados abaixo, gere um CONTRATO de prestacao de servicos em portugues (pt-BR), com clausulas de objeto, vigencia, pagamento, responsabilidades, cancelamento e foro.\n\n${structuredContext}`;

    try {
      const { data, error } = await supabase.functions.invoke('plan-assistant-chat', {
        body: {
          message: userPrompt,
          current_path: '/dashboard/clientes',
          user_name: user?.email?.split('@')[0] ?? 'assessoria',
        },
      });
      if (error) throw error;
      const answer = typeof data?.answer === 'string' ? data.answer.trim() : '';
      if (type === 'budget') setBudgetText(answer || fallback);
      else setContractText(answer || fallback);
    } catch {
      if (type === 'budget') setBudgetText(fallback);
      else setContractText(fallback);
    } finally {
      setBusyDoc(null);
    }
  }

  async function sendForSignature() {
    if (!selected || !user?.id) return;
    setBusyDoc('contract');
    const doc = await upsertDoc('contract', contractText, 'pending_signature');
    if (!doc) {
      setBusyDoc(null);
      return;
    }
    const expires = new Date();
    expires.setDate(expires.getDate() + 15);
    const { data } = await supabase
      .from('crm_signature_requests')
      .insert({
        user_id: user.id,
        client_id: selected.id,
        document_id: doc.id,
        client_name: selected.name,
        client_email: selected.email,
        status: 'pending',
        expires_at: expires.toISOString(),
      })
      .select('id,client_id,token,status,created_at')
      .maybeSingle();
    if (data) {
      const link = `${window.location.origin}/assinatura/${data.token}`;
      void navigator.clipboard.writeText(link);
      setReqByClient((prev) => ({ ...prev, [selected.id]: [data as SignReq, ...(prev[selected.id] ?? [])] }));
      if (selected.email) {
        const subject = encodeURIComponent(`Assinatura de contrato - ${selected.name}`);
        const body = encodeURIComponent(`OlÃ¡ ${selected.name},\n\nAssine neste link:\n${link}`);
        window.open(`mailto:${selected.email}?subject=${subject}&body=${body}`, '_blank');
      }
    }
    setBusyDoc(null);
  }

  async function deleteClientPermanently() {
    if (!selected || !user?.id) return;
    setDeletingClient(true);
    await supabase
      .from('crm_clients')
      .delete()
      .eq('id', selected.id)
      .eq('user_id', user.id);
    setDeletingClient(false);
    setIsDeleteModalOpen(false);
    await reload();
  }

  function openPortfolioModal() {
    setPortfolioLead({ name: '', email: '', whatsapp: '' });
    setPortfolioSender({ name: '', email: '', whatsapp: '', instagram: '' });
    setPortfolioPdfFile(null);
    setIsPortfolioModalOpen(true);
  }

  function closePortfolioModal() {
    setIsPortfolioModalOpen(false);
  }

  async function uploadPortfolioAndGetLink() {
    if (!portfolioPdfFile || !user?.id) return null;
    const safeName = portfolioPdfFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${user.id}/${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from('crm-portfolios')
      .upload(path, portfolioPdfFile, {
        contentType: 'application/pdf',
        upsert: false,
      });
    if (uploadError) {
      console.error('Erro no upload do portfolio', uploadError);
      return null;
    }

    const { data } = supabase.storage.from('crm-portfolios').getPublicUrl(path);
    return data?.publicUrl ?? null;
  }

  async function createPortfolioShareLink(pdfUrl: string) {
    if (!user?.id) return null;
    const { data, error } = await supabase
      .from('crm_portfolio_shares')
      .insert({
        user_id: user.id,
        title: `Portfolio - ${portfolioSender.name.trim() || 'Assessoria'}`,
        pdf_url: pdfUrl,
        sender_name: portfolioSender.name.trim() || null,
        sender_email: portfolioSender.email.trim() || null,
        sender_whatsapp: portfolioSender.whatsapp.trim() || null,
        sender_instagram: portfolioSender.instagram.trim() || null,
      })
      .select('token')
      .maybeSingle();

    if (error || !data?.token) {
      console.error('Erro ao criar share de portfolio', error);
      return null;
    }

    return `${window.location.origin}/portfolio/${data.token}`;
  }

  async function sendPortfolio() {
    const message = portfolioMessage.trim();
    const hasPdf = Boolean(portfolioPdfFile);

    if (!hasPdf) {
      alert('Selecione um PDF de portfolio antes de gerar o texto.');
      return;
    }

    setSendingPortfolio(true);
    const portfolioLink = await uploadPortfolioAndGetLink();
    if (!portfolioLink) {
      setSendingPortfolio(false);
      alert('Nao foi possivel subir o PDF agora. Tente novamente.');
      return;
    }

    const publicShareLink = await createPortfolioShareLink(portfolioLink);
    setSendingPortfolio(false);
    if (!publicShareLink) {
      alert('Nao foi possivel gerar o link publico do portfolio.');
      return;
    }

    const finalMessage = `${message}\n\nLink do portfolio: ${publicShareLink}`;
    await navigator.clipboard.writeText(finalMessage);
    alert('Texto copiado com sucesso. Cole no WhatsApp, Instagram ou onde preferir.');
  }
  if (loading) {
    return (
      <div className="p-10 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-gold-500" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-2 md:items-center md:justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Meus Clientes</h1>
          <div className="flex gap-2">
            <label className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar cliente"
                className="h-10 w-64 rounded-xl border border-gray-200 pl-9 pr-3 text-sm"
              />
            </label>
            <div className="flex flex-col gap-2">
              <button
                onClick={openNewClientWizard}
                className="h-10 px-4 rounded-xl bg-gold-500 hover:bg-gold-600 text-white text-sm font-semibold inline-flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Novo cliente
              </button>
              <button
                onClick={openPortfolioModal}
                className="h-10 px-4 rounded-xl border border-violet-200 text-violet-700 bg-violet-50 hover:bg-violet-100 text-sm font-semibold inline-flex items-center gap-1"
              >
                <Send className="w-4 h-4" />
                Portfolio
              </button>
            </div>
          </div>
        </div>
        <p className="text-sm text-gray-500">
          Um CRM completo para voce prospectar e administrar seus clientes.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Metricas do funil</h2>
          <span className="text-xs text-gray-500">Conversao geral</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2">
          {funnelMetrics.map((metric) => (
            <div key={metric.stage} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
              <p className="text-[11px] text-gray-500">
                {STAGES.find((s) => s.value === metric.stage)?.label ?? metric.stage}
              </p>
              <p className="text-xl font-bold text-gray-900 mt-1">{metric.leads}</p>
              <p className="text-[11px] text-gray-500">
                {Math.round(Number(metric.avg_days_in_stage || 0))}d medio
              </p>
              <p className="text-[11px] text-violet-700 font-semibold">
                {Number(metric.conversion_rate || 0).toFixed(1)}%
              </p>
            </div>
          ))}
          {funnelMetrics.length === 0 && (
            <p className="text-sm text-gray-500">Sem dados suficientes ainda.</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Follow-ups pendentes</h2>
          <span className="text-xs text-gray-500">{followupTasks.length} pendente(s)</span>
        </div>
        <div className="space-y-2">
          {followupTasks.slice(0, 8).map((task) => {
            const clientName = clients.find((item) => item.id === task.client_id)?.name ?? 'Cliente';
            return (
              <div
                key={task.id}
                className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 flex flex-col md:flex-row md:items-center md:justify-between gap-2"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-900">{task.title}</p>
                  <p className="text-xs text-gray-500">
                    {clientName} • Vencimento {new Date(task.due_date).toLocaleDateString('pt-BR')}
                  </p>
                  {task.source_kind === 'stage_playbook' && (
                    <p className="text-[11px] text-violet-700 font-semibold">Playbook automatico</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedId(task.client_id)}
                    className="h-8 px-2 rounded border border-gray-200 text-xs"
                  >
                    Abrir cliente
                  </button>
                  <button
                    onClick={() => void markFollowupDone(task.id)}
                    className="h-8 px-2 rounded bg-emerald-600 text-white text-xs"
                  >
                    Concluir
                  </button>
                </div>
              </div>
            );
          })}
          {followupTasks.length === 0 && (
            <p className="text-sm text-gray-500">Nenhum follow-up pendente agora.</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Saude operacional (Fase 4)</h2>
          <span className="text-xs text-gray-500">Risco do funil em tempo real</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
          {operationalMetrics.map((metric) => (
            <div
              key={metric.metric}
              className={`rounded-xl border p-3 ${
                metric.priority === 'alta'
                  ? 'border-rose-200 bg-rose-50'
                  : metric.priority === 'media'
                    ? 'border-amber-200 bg-amber-50'
                    : 'border-emerald-200 bg-emerald-50'
              }`}
            >
              <p className="text-xs text-gray-600">
                {OPERATIONAL_METRIC_LABELS[metric.metric] ?? metric.metric}
              </p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{metric.value}</p>
              <p className="text-[11px] uppercase tracking-wide text-gray-500 mt-1">
                prioridade {metric.priority}
              </p>
            </div>
          ))}
          {operationalMetrics.length === 0 && (
            <p className="text-sm text-gray-500">Sem indicadores operacionais ainda.</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Forecast do pipeline (Fase 5)</h2>
          <span className="text-xs text-gray-500">Receita esperada ponderada</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-2">
          {pipelineForecast.map((row) => (
            <div key={row.stage} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
              <p className="text-xs text-gray-600">
                {STAGE_LABEL_BY_VALUE[row.stage as Stage] ?? row.stage}
              </p>
              <p className="text-lg font-bold text-gray-900 mt-1">{row.leads}</p>
              <p className="text-[11px] text-gray-500">
                Total: R$ {Number(row.total_budget || 0).toLocaleString('pt-BR')}
              </p>
              <p className="text-[11px] text-violet-700 font-semibold">
                Ponderado: R$ {Number(row.weighted_budget || 0).toLocaleString('pt-BR')}
              </p>
            </div>
          ))}
          {pipelineForecast.length === 0 && (
            <p className="text-sm text-gray-500">Sem dados de forecast ainda.</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Fila de prioridade (Fase 5)</h2>
          <span className="text-xs text-gray-500">Proximas melhores acoes</span>
        </div>
        <div className="space-y-2">
          {priorityQueue.map((item) => (
            <div
              key={item.client_id}
              className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 flex flex-col md:flex-row md:items-center md:justify-between gap-2"
            >
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {item.client_name} • Score {item.priority_score}
                </p>
                <p className="text-xs text-gray-500">
                  {STAGE_LABEL_BY_VALUE[item.stage as Stage] ?? item.stage} • {item.priority_reason}
                </p>
                <p className="text-xs text-violet-700 mt-0.5">
                  Proxima acao: {item.next_action}
                  {item.due_date ? ` • Prazo ${new Date(item.due_date).toLocaleDateString('pt-BR')}` : ''}
                </p>
              </div>
              <button
                onClick={() => setSelectedId(item.client_id)}
                className="h-8 px-2 rounded border border-gray-200 text-xs"
              >
                Abrir cliente
              </button>
            </div>
          ))}
          {priorityQueue.length === 0 && (
            <p className="text-sm text-gray-500">Nenhum cliente ativo para priorizacao.</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Pesos de priorizacao</h2>
            <p className="text-xs text-gray-500">Ajuste fino do score da fila de prioridade</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={resetPriorityWeightsToDefault}
              className="h-9 px-3 rounded-lg border border-gray-200 text-xs"
            >
              Restaurar padrao
            </button>
            <button
              onClick={() => void savePriorityWeights()}
              disabled={savingPriorityWeights}
              className="h-9 px-3 rounded-lg bg-violet-600 text-white text-xs font-semibold disabled:opacity-60"
            >
              {savingPriorityWeights ? 'Salvando...' : 'Salvar pesos'}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
          {priorityWeights.map((item) => (
            <label
              key={item.weight_key}
              className="rounded-xl border border-gray-100 bg-gray-50 p-3 space-y-1"
            >
              <span className="text-xs text-gray-600">{item.label}</span>
              <input
                type="number"
                value={item.weight_value}
                onChange={(e) => updatePriorityWeight(item.weight_key, e.target.value)}
                className="h-9 w-full rounded-lg border border-gray-200 px-2 text-sm bg-white"
              />
              <span className="text-[11px] text-gray-500">
                Padrao: {item.default_value}
              </span>
            </label>
          ))}
          {priorityWeights.length === 0 && (
            <p className="text-sm text-gray-500">Pesos nao carregados ainda.</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Execucao automatica (Fase 6)</h2>
            <p className="text-xs text-gray-500">Playbook por estagio e cadencia inteligente</p>
          </div>
          <button
            onClick={() => void generatePlaybookTasks()}
            disabled={generatingPlaybook}
            className="h-9 px-3 rounded-lg bg-indigo-600 text-white text-xs font-semibold disabled:opacity-60"
          >
            {generatingPlaybook ? 'Gerando...' : 'Gerar tarefas do playbook'}
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {executionMetrics.map((item) => (
            <div key={item.metric} className="rounded-xl border border-indigo-100 bg-indigo-50 p-3">
              <p className="text-xs text-gray-600">
                {EXECUTION_METRIC_LABELS[item.metric] ?? item.metric}
              </p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{item.value}</p>
            </div>
          ))}
          {executionMetrics.length === 0 && (
            <p className="text-sm text-gray-500">Sem dados de execucao ainda.</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Pipeline de Clientes</h2>
          <p className="text-xs text-gray-500">{list.length} cliente(s)</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
          {STAGES.map((stage) => (
            <div key={stage.value} className="rounded-xl border border-gray-100 bg-gray-50 p-2.5">
              <div className="flex items-center justify-between">
                <span className={`text-[11px] px-2 py-1 rounded-full border ${STAGE_STYLE[stage.value]}`}>
                  {stage.label}
                </span>
                <span className="text-xs text-gray-500">{stageCount[stage.value] ?? 0}</span>
              </div>
              <div className="space-y-1.5 mt-2">
                {list
                  .filter((c) => c.stage === stage.value)
                  .slice(0, 4)
                  .map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedId(c.id)}
                      className={`w-full text-left rounded-lg border px-2 py-2 ${
                        selectedId === c.id
                          ? 'border-violet-300 bg-violet-50'
                          : 'border-gray-100 bg-white hover:bg-gray-50'
                      }`}
                    >
                      <p className="text-xs font-semibold text-gray-900 truncate">{c.name}</p>
                      <p className="text-[11px] text-gray-500 truncate">{c.email || c.phone || 'sem contato'}</p>
                    </button>
                  ))}
                {list.filter((c) => c.stage === stage.value).length === 0 && (
                  <p className="text-[11px] text-gray-500">Sem clientes neste estÃ¡gio.</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Carteira de Clientes</h2>
          <p className="text-xs text-gray-500">Resumo por cards</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {list.map((c) => {
            const done = (checklistByClient[c.id] ?? []).filter((x) => x.completed).length;
            const total = (checklistByClient[c.id] ?? []).length;
            return (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={`text-left rounded-xl border p-3 bg-white transition-all hover:shadow-md hover:-translate-y-0.5 ${
                  selectedId === c.id ? 'border-violet-300 ring-1 ring-violet-200' : 'border-gray-100'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-900 truncate">{c.name}</p>
                  <span className={`text-[10px] px-2 py-1 rounded-full border ${STAGE_STYLE[c.stage]}`}>
                    {STAGES.find((s) => s.value === c.stage)?.label ?? c.stage}
                  </span>
                </div>
                <p className="text-xs text-gray-500 truncate mt-1">{c.email || c.phone || 'sem contato'}</p>
                <p className="text-xs text-gray-600 mt-2">Checklist: {done}/{total}</p>
              </button>
            );
          })}
          {list.length === 0 && <p className="text-sm text-gray-500">Nenhum cliente encontrado.</p>}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-3">
        <p className="text-xs text-gray-600">
          Backlog: editor rico (estilo Word com toolbar) para orÃ§amento e contrato.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Conhecendo cliente (prospeccao)</h2>
          <p className="text-xs text-gray-500">
            {list.filter((c) => c.stage === 'conhecendo_cliente').length} em prospeccao
          </p>
        </div>
        <div className="space-y-2">
          {list
            .filter((c) => c.stage === 'conhecendo_cliente')
            .map((c) => (
              <button
                key={c.id}
                onClick={() => openProspectModal(c)}
                className="w-full text-left rounded-xl border border-gray-100 bg-white hover:bg-gray-50 px-3 py-2"
              >
                <p className="text-sm font-semibold text-gray-900">{c.name}</p>
                <p className="text-xs text-gray-500">{c.email || c.phone || 'sem contato'}</p>
              </button>
            ))}
          {list.filter((c) => c.stage === 'conhecendo_cliente').length === 0 && (
            <p className="text-sm text-gray-500">Sem clientes em prospecÃ§Ã£o no momento.</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-3 space-y-3">
          {STAGES.map((s) => (
            <div key={s.value} className="rounded-xl border border-gray-100 p-2">
              <p className="text-xs font-semibold text-gray-500">{s.label}</p>
              <div className="mt-2 space-y-1.5">
                {list.filter((c) => c.stage === s.value).map((c) => (
                  <button key={c.id} onClick={() => setSelectedId(c.id)} className={`w-full text-left px-2 py-2 rounded-lg border ${selectedId === c.id ? 'border-violet-300 bg-violet-50' : 'border-gray-100 hover:bg-gray-50'}`}>
                    <p className="text-sm font-semibold text-gray-900 truncate">{c.name}</p>
                    <p className="text-xs text-gray-500 truncate">{c.email || c.phone || 'sem contato'}</p>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-4">
          {!selected && <p className="text-sm text-gray-500">Selecione um cliente.</p>}
          {selected && (
            <>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selected.name}</h2>
                  <p className="text-sm text-gray-500">{selected.email || selected.phone || 'sem contato'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <select value={selected.stage} onChange={(e) => void setStage(e.target.value as Stage)} className="h-10 rounded-xl border border-gray-200 px-3 text-sm">
                    {STAGES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => setIsDeleteModalOpen(true)}
                    className="h-10 w-10 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 inline-flex items-center justify-center"
                    title="Excluir cliente definitivamente"
                    aria-label="Excluir cliente definitivamente"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 space-y-2">
                <p className="text-sm font-semibold text-gray-900">Historico de estagios (Fase 4)</p>
                <div className="space-y-1.5">
                  {selectedStageHistory.slice(0, 6).map((item) => (
                    <div
                      key={item.id}
                      className="rounded-lg border border-gray-200 bg-white px-2 py-2"
                    >
                      <p className="text-xs font-semibold text-gray-800">
                        {(item.from_stage
                          ? STAGES.find((s) => s.value === item.from_stage)?.label
                          : 'Inicio') || 'Inicio'}{' '}
                        {' -> '}
                        {STAGES.find((s) => s.value === item.to_stage)?.label ?? item.to_stage}
                      </p>
                      <p className="text-[11px] text-gray-500">
                        {new Date(item.changed_at).toLocaleString('pt-BR')}
                      </p>
                      {item.reason && (
                        <p className="text-xs text-gray-700 mt-1">{item.reason}</p>
                      )}
                    </div>
                  ))}
                  {selectedStageHistory.length === 0 && (
                    <p className="text-xs text-gray-500">Sem historico de mudancas ainda.</p>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-3 space-y-2">
                <p className="text-sm font-semibold text-gray-900">Checklist de descoberta</p>
                {selectedChecklist.map((k) => (
                  <label key={k.id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={k.completed} onChange={() => void toggleChecklist(k)} />
                    <span className={k.completed ? 'line-through text-gray-400' : 'text-gray-800'}>{k.title}</span>
                  </label>
                ))}
                <div className="flex gap-2">
                  <input value={newChecklist} onChange={(e) => setNewChecklist(e.target.value)} placeholder="Nova atividade" className="flex-1 h-9 rounded-lg border border-sky-200 px-3 text-sm" />
                  <button onClick={() => void addChecklist()} className="h-9 px-3 rounded-lg bg-sky-600 text-white text-xs font-semibold">Adicionar</button>
                </div>
              </div>

              <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3 space-y-3">
                <p className="text-sm font-semibold text-gray-900">Linha de contato do lead</p>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                  <select
                    value={interactionForm.channel}
                    onChange={(e) =>
                      setInteractionForm((prev) => ({
                        ...prev,
                        channel: e.target.value as LeadInteraction['channel'],
                      }))
                    }
                    className="h-9 rounded-lg border border-indigo-200 px-2 text-xs bg-white"
                  >
                    <option value="whatsapp">WhatsApp</option>
                    <option value="email">E-mail</option>
                    <option value="ligacao">Ligacao</option>
                    <option value="instagram">Instagram</option>
                    <option value="reuniao">Reuniao</option>
                    <option value="outro">Outro</option>
                  </select>
                  <select
                    value={interactionForm.direction}
                    onChange={(e) =>
                      setInteractionForm((prev) => ({
                        ...prev,
                        direction: e.target.value as LeadInteraction['direction'],
                      }))
                    }
                    className="h-9 rounded-lg border border-indigo-200 px-2 text-xs bg-white"
                  >
                    <option value="outbound">Outbound</option>
                    <option value="inbound">Inbound</option>
                  </select>
                  <input
                    type="datetime-local"
                    value={interactionForm.next_followup_at}
                    onChange={(e) =>
                      setInteractionForm((prev) => ({
                        ...prev,
                        next_followup_at: e.target.value,
                      }))
                    }
                    className="h-9 rounded-lg border border-indigo-200 px-2 text-xs bg-white"
                  />
                  <button
                    onClick={() => void addInteraction()}
                    className="h-9 rounded-lg bg-indigo-600 text-white text-xs font-semibold"
                  >
                    Registrar interacao
                  </button>
                </div>
                <textarea
                  value={interactionForm.summary}
                  onChange={(e) =>
                    setInteractionForm((prev) => ({ ...prev, summary: e.target.value }))
                  }
                  placeholder="Resumo da interacao, objeções e proximo passo..."
                  className="w-full min-h-[90px] rounded-lg border border-indigo-200 bg-white p-2 text-sm"
                />
                <div className="space-y-1.5">
                  {selectedInteractions.slice(0, 8).map((interaction) => (
                    <div
                      key={interaction.id}
                      className="rounded-lg border border-indigo-100 bg-white px-2 py-2"
                    >
                      <p className="text-xs text-indigo-700 font-semibold">
                        {interaction.channel} • {interaction.direction}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(interaction.happened_at).toLocaleString('pt-BR')}
                      </p>
                      <p className="text-sm text-gray-800 mt-1">{interaction.summary}</p>
                    </div>
                  ))}
                  {selectedInteractions.length === 0 && (
                    <p className="text-xs text-gray-500">
                      Nenhuma interacao registrada para este lead.
                    </p>
                  )}
                </div>
                {selectedFollowups.length > 0 && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-2">
                    <p className="text-xs font-semibold text-amber-800">
                      Follow-up pendente para este cliente
                    </p>
                    {selectedFollowups.map((task) => (
                      <div key={task.id} className="mt-1 flex items-center justify-between gap-2">
                        <p className="text-xs text-amber-900">
                          {task.title} • {new Date(task.due_date).toLocaleDateString('pt-BR')}
                        </p>
                        <button
                          onClick={() => void markFollowupDone(task.id)}
                          className="h-7 px-2 rounded bg-amber-700 text-white text-xs"
                        >
                          Concluir
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3 space-y-3">
                <p className="text-sm font-semibold text-gray-900">
                  Dados contratuais estruturados (Fase 2)
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <input
                    value={contractForm.principal_name}
                    onChange={(e) =>
                      setContractForm((prev) => ({
                        ...prev,
                        principal_name: e.target.value,
                      }))
                    }
                    placeholder="Contato principal - nome"
                    className="h-9 rounded-lg border border-emerald-200 px-2 text-sm bg-white"
                  />
                  <input
                    value={contractForm.principal_email}
                    onChange={(e) =>
                      setContractForm((prev) => ({
                        ...prev,
                        principal_email: e.target.value,
                      }))
                    }
                    placeholder="Contato principal - e-mail"
                    className="h-9 rounded-lg border border-emerald-200 px-2 text-sm bg-white"
                  />
                  <input
                    value={contractForm.principal_phone}
                    onChange={(e) =>
                      setContractForm((prev) => ({
                        ...prev,
                        principal_phone: e.target.value,
                      }))
                    }
                    placeholder="Contato principal - telefone"
                    className="h-9 rounded-lg border border-emerald-200 px-2 text-sm bg-white"
                  />
                  <input
                    value={contractForm.principal_cpf}
                    onChange={(e) =>
                      setContractForm((prev) => ({
                        ...prev,
                        principal_cpf: e.target.value,
                      }))
                    }
                    placeholder="Contato principal - CPF"
                    className="h-9 rounded-lg border border-emerald-200 px-2 text-sm bg-white"
                  />
                  <input
                    value={contractForm.total_value}
                    onChange={(e) =>
                      setContractForm((prev) => ({
                        ...prev,
                        total_value: e.target.value,
                      }))
                    }
                    placeholder="Valor total do contrato"
                    className="h-9 rounded-lg border border-emerald-200 px-2 text-sm bg-white"
                  />
                  <input
                    value={contractForm.foro_city}
                    onChange={(e) =>
                      setContractForm((prev) => ({
                        ...prev,
                        foro_city: e.target.value,
                      }))
                    }
                    placeholder="Foro (cidade)"
                    className="h-9 rounded-lg border border-emerald-200 px-2 text-sm bg-white"
                  />
                </div>
                <textarea
                  value={contractForm.service_scope}
                  onChange={(e) =>
                    setContractForm((prev) => ({
                      ...prev,
                      service_scope: e.target.value,
                    }))
                  }
                  placeholder="Escopo de servico"
                  className="w-full min-h-[80px] rounded-lg border border-emerald-200 bg-white p-2 text-sm"
                />
                <textarea
                  value={contractForm.payment_terms}
                  onChange={(e) =>
                    setContractForm((prev) => ({
                      ...prev,
                      payment_terms: e.target.value,
                    }))
                  }
                  placeholder="Condicoes de pagamento"
                  className="w-full min-h-[80px] rounded-lg border border-emerald-200 bg-white p-2 text-sm"
                />
                <textarea
                  value={contractForm.cancellation_terms}
                  onChange={(e) =>
                    setContractForm((prev) => ({
                      ...prev,
                      cancellation_terms: e.target.value,
                    }))
                  }
                  placeholder="Politica de cancelamento"
                  className="w-full min-h-[80px] rounded-lg border border-emerald-200 bg-white p-2 text-sm"
                />
                <textarea
                  value={contractForm.notes}
                  onChange={(e) =>
                    setContractForm((prev) => ({
                      ...prev,
                      notes: e.target.value,
                    }))
                  }
                  placeholder="Notas contratuais adicionais"
                  className="w-full min-h-[80px] rounded-lg border border-emerald-200 bg-white p-2 text-sm"
                />
                <div className="flex justify-between items-center gap-2">
                  <p className="text-xs text-gray-600">
                    Pessoas estruturadas: {selectedPeople.length}
                  </p>
                  <button
                    onClick={() => void saveStructuredContractData()}
                    className="h-9 px-3 rounded-lg bg-emerald-700 text-white text-xs font-semibold"
                  >
                    Salvar dados estruturados
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-cyan-100 bg-cyan-50/40 p-3 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-900">
                    LGPD: consentimento e titular (Fase 3)
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => void exportClientData()}
                      className="h-8 px-2 rounded border border-cyan-200 text-cyan-700 text-xs font-semibold"
                    >
                      Exportar JSON
                    </button>
                    <button
                      onClick={() => void anonymizeClientData()}
                      className="h-8 px-2 rounded border border-rose-200 text-rose-700 text-xs font-semibold"
                    >
                      Anonimizar
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <select
                    value={consentForm.lawful_basis}
                    onChange={(e) =>
                      setConsentForm((prev) => ({
                        ...prev,
                        lawful_basis: e.target.value as ConsentRecord['lawful_basis'],
                      }))
                    }
                    className="h-9 rounded-lg border border-cyan-200 px-2 text-xs bg-white"
                  >
                    <option value="consentimento">Consentimento</option>
                    <option value="execucao_contrato">Execucao de contrato</option>
                    <option value="legitimo_interesse">Legitimo interesse</option>
                    <option value="anonimizacao_solicitada">Anonimizacao solicitada</option>
                  </select>
                  <input
                    value={consentForm.consent_text_version}
                    onChange={(e) =>
                      setConsentForm((prev) => ({
                        ...prev,
                        consent_text_version: e.target.value,
                      }))
                    }
                    placeholder="Versao do termo (ex: v1)"
                    className="h-9 rounded-lg border border-cyan-200 px-2 text-xs bg-white"
                  />
                  <select
                    value={consentForm.source}
                    onChange={(e) =>
                      setConsentForm((prev) => ({
                        ...prev,
                        source: e.target.value as ConsentRecord['source'],
                      }))
                    }
                    className="h-9 rounded-lg border border-cyan-200 px-2 text-xs bg-white"
                  >
                    <option value="manual">Manual</option>
                    <option value="formulario">Formulario</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="email">E-mail</option>
                    <option value="sistema">Sistema</option>
                  </select>
                </div>
                <textarea
                  value={consentForm.consent_note}
                  onChange={(e) =>
                    setConsentForm((prev) => ({
                      ...prev,
                      consent_note: e.target.value,
                    }))
                  }
                  placeholder="Observacao do consentimento / motivo da solicitacao"
                  className="w-full min-h-[80px] rounded-lg border border-cyan-200 bg-white p-2 text-sm"
                />
                <div className="flex justify-between items-center gap-2">
                  <p className="text-xs text-gray-600">
                    Registros de consentimento: {selectedConsents.length}
                  </p>
                  <button
                    onClick={() => void registerConsentRecord()}
                    className="h-9 px-3 rounded-lg bg-cyan-700 text-white text-xs font-semibold"
                  >
                    Registrar consentimento
                  </button>
                </div>
                <div className="space-y-1.5">
                  {selectedConsents.slice(0, 5).map((item) => (
                    <div
                      key={item.id}
                      className="rounded-lg border border-cyan-100 bg-white px-2 py-2"
                    >
                      <p className="text-xs text-cyan-700 font-semibold">
                        {item.lawful_basis} • {item.source} • {item.consent_text_version}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(item.consented_at).toLocaleString('pt-BR')}
                      </p>
                      {item.consent_note && (
                        <p className="text-xs text-gray-700 mt-1">{item.consent_note}</p>
                      )}
                    </div>
                  ))}
                  {selectedConsents.length === 0 && (
                    <p className="text-xs text-gray-500">
                      Nenhum registro de consentimento para este cliente.
                    </p>
                  )}
                </div>
              </div>

              {selected.stage === 'analisando_orcamento' && (
                <div className="rounded-xl border border-violet-100 bg-violet-50/50 p-3 space-y-2">
                  <div className="flex flex-wrap gap-2 items-center justify-between">
                    <p className="text-sm font-semibold text-gray-900">Orcamento (Word/PDF)</p>
                    <div className="flex gap-2">
                      <button onClick={() => void aiFill('budget')} className="h-8 px-2 rounded border border-violet-200 text-violet-700 text-xs inline-flex items-center gap-1"><Bot className="w-3 h-3" />Plan IA</button>
                      <button onClick={() => void upsertDoc('budget', budgetText, 'draft')} className="h-8 px-2 rounded border border-gray-200 text-xs inline-flex items-center gap-1"><Save className="w-3 h-3" />Salvar</button>
                      <button onClick={() => toWord(`Orcamento - ${selected.name}`, budgetText)} className="h-8 px-2 rounded border border-gray-200 text-xs">Word</button>
                      <button onClick={() => toPdf(`Orcamento - ${selected.name}`, budgetText)} className="h-8 px-2 rounded bg-violet-600 text-white text-xs">PDF</button>
                    </div>
                  </div>
                  <textarea value={budgetText} onChange={(e) => setBudgetText(e.target.value)} className="w-full min-h-[160px] rounded-lg border border-violet-200 bg-white p-2 text-sm" />
                </div>
              )}

              {selected.stage === 'assinatura_contrato' && (
                <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-3 space-y-2">
                  <div className="flex flex-wrap gap-2 items-center justify-between">
                    <p className="text-sm font-semibold text-gray-900">Contrato + pendente assinatura</p>
                    <div className="flex gap-2">
                      <button onClick={() => void aiFill('contract')} className="h-8 px-2 rounded border border-amber-200 text-amber-700 text-xs inline-flex items-center gap-1"><Bot className="w-3 h-3" />Plan IA</button>
                      <button onClick={() => void upsertDoc('contract', contractText, 'draft')} className="h-8 px-2 rounded border border-gray-200 text-xs inline-flex items-center gap-1"><Save className="w-3 h-3" />Salvar</button>
                      <button onClick={() => toWord(`Contrato - ${selected.name}`, contractText)} className="h-8 px-2 rounded border border-gray-200 text-xs">Word</button>
                      <button onClick={() => toPdf(`Contrato - ${selected.name}`, contractText)} className="h-8 px-2 rounded bg-amber-600 text-white text-xs">PDF</button>
                      <button onClick={() => void sendForSignature()} className="h-8 px-2 rounded bg-gray-900 text-white text-xs inline-flex items-center gap-1"><Send className="w-3 h-3" />Enviar</button>
                    </div>
                  </div>
                  <textarea value={contractText} onChange={(e) => setContractText(e.target.value)} className="w-full min-h-[160px] rounded-lg border border-amber-200 bg-white p-2 text-sm" />
                  <div className="rounded-lg border border-amber-100 bg-white p-2 text-xs text-gray-600 space-y-1">
                    <p className="font-semibold text-gray-900">Pendencias de assinatura</p>
                    {pendingReq.length === 0 && <p>Nenhuma pendencia.</p>}
                    {pendingReq.map((r) => {
                      const link = `${window.location.origin}/assinatura/${r.token}`;
                      return (
                        <div key={r.id} className="flex flex-wrap items-center gap-2">
                          <span>{new Date(r.created_at).toLocaleDateString('pt-BR')}</span>
                          <button onClick={() => void navigator.clipboard.writeText(link)} className="h-7 px-2 rounded border border-gray-200">Copiar link</button>
                          <a href={link} target="_blank" rel="noreferrer" className="h-7 px-2 rounded border border-gray-200 inline-flex items-center">Abrir</a>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {busyDoc && (
        <div className="fixed bottom-4 right-4 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs shadow">
          Processando {busyDoc === 'budget' ? 'orcamento' : 'contrato'}...
        </div>
      )}

      {isPortfolioModalOpen && (
        <div className="fixed inset-0 z-[92] bg-black/45 grid place-items-center p-4">
          <div className="w-full max-w-[1500px] max-h-[94vh] bg-white rounded-2xl border border-gray-100 shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Portfolio</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Importe o PDF e copie um texto com link publico para enviar ao possivel cliente.
                </p>
              </div>
              <button onClick={closePortfolioModal} className="text-gray-500">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto max-h-[72vh] space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <input
                  value={portfolioLead.name}
                  onChange={(e) =>
                    setPortfolioLead((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Nome do possivel cliente"
                  className="h-10 rounded-xl border border-gray-200 px-3 text-sm"
                />
                <input
                  value={portfolioLead.email}
                  onChange={(e) =>
                    setPortfolioLead((prev) => ({ ...prev, email: e.target.value }))
                  }
                  placeholder="E-mail do possivel cliente"
                  className="h-10 rounded-xl border border-gray-200 px-3 text-sm"
                />
                <input
                  value={portfolioLead.whatsapp}
                  onChange={(e) =>
                    setPortfolioLead((prev) => ({ ...prev, whatsapp: e.target.value }))
                  }
                  placeholder="WhatsApp do possivel cliente"
                  className="h-10 rounded-xl border border-gray-200 px-3 text-sm"
                />
              </div>

              <div className="rounded-2xl border border-gray-100 p-4 bg-gray-50">
                <p className="text-sm font-semibold text-gray-900">Portfolio em PDF</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Selecione um arquivo PDF para visualizacao e geracao de link publico.
                </p>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setPortfolioPdfFile(e.target.files?.[0] ?? null)}
                  className="mt-3 block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border file:border-gray-300 file:bg-white file:px-3 file:py-1.5 file:text-sm"
                />
                <div className="mt-3 h-[380px] rounded-xl border border-gray-200 bg-white overflow-hidden">
                  {portfolioPdfPreviewUrl ? (
                    <iframe
                      src={portfolioPdfPreviewUrl}
                      title="Pre-visualizacao do portfolio"
                      className="w-full h-full"
                    />
                  ) : (
                    <div className="w-full h-full grid place-items-center text-sm text-gray-500">
                      Nenhum PDF selecionado.
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-gray-100 p-4 bg-white">
                  <p className="text-sm font-semibold text-gray-900">
                    Seus contatos (cerimonialista)
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Esses campos serao preenchidos automaticamente pelo menu Perfil no futuro.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
                    <input
                      value={portfolioSender.name}
                      onChange={(e) =>
                        setPortfolioSender((prev) => ({ ...prev, name: e.target.value }))
                      }
                      placeholder="Seu nome"
                      className="h-10 rounded-xl border border-gray-200 px-3 text-sm"
                    />
                    <input
                      value={portfolioSender.whatsapp}
                      onChange={(e) =>
                        setPortfolioSender((prev) => ({ ...prev, whatsapp: e.target.value }))
                      }
                      placeholder="Seu WhatsApp"
                      className="h-10 rounded-xl border border-gray-200 px-3 text-sm"
                    />
                    <input
                      value={portfolioSender.email}
                      onChange={(e) =>
                        setPortfolioSender((prev) => ({ ...prev, email: e.target.value }))
                      }
                      placeholder="Seu e-mail"
                      className="h-10 rounded-xl border border-gray-200 px-3 text-sm"
                    />
                    <input
                      value={portfolioSender.instagram}
                      onChange={(e) =>
                        setPortfolioSender((prev) => ({ ...prev, instagram: e.target.value }))
                      }
                      placeholder="Seu Instagram"
                      className="h-10 rounded-xl border border-gray-200 px-3 text-sm"
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-100 p-4 bg-white">
                  <p className="text-sm font-semibold text-gray-900">Modelo da mensagem</p>
                  <textarea
                    value={portfolioMessage}
                    onChange={(e) => setPortfolioMessage(e.target.value)}
                    className="mt-3 w-full min-h-[190px] rounded-xl border border-gray-200 p-3 text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 flex justify-end gap-2">
              <button
                onClick={closePortfolioModal}
                className="h-10 px-4 rounded-xl border border-gray-200 text-sm"
              >
                Fechar
              </button>
              <button
                onClick={sendPortfolio}
                disabled={sendingPortfolio}
                className="h-10 px-4 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold inline-flex items-center gap-1 disabled:opacity-60"
              >
                <Send className="w-4 h-4" />
                {sendingPortfolio ? 'Gerando...' : 'Copiar texto com link'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isNewClientModalOpen && (
        <div className="fixed inset-0 z-[90] bg-black/45 grid place-items-center p-4">
          <div className="w-full max-w-[1500px] max-h-[94vh] bg-white rounded-2xl border border-gray-100 shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {newClientStep === 'type' ? 'Novo cliente' : 'Dados do cliente'}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {newClientStep === 'type'
                    ? 'Qual o tipo de evento?'
                    : `Tipo selecionado: ${EVENT_TYPE_OPTIONS.find((item) => item.value === newClient.event_type)?.label ?? '-'}`}
                </p>
              </div>
              <button onClick={closeNewClientWizard} className="text-gray-500">
                <X className="w-4 h-4" />
              </button>
            </div>
            {newClientStep === 'type' && (
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                {EVENT_TYPE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setNewClient((prev) => ({ ...prev, event_type: option.value }))}
                    className={`text-left rounded-2xl border overflow-hidden transition-all ${
                      newClient.event_type === option.value
                        ? 'border-violet-400 ring-2 ring-violet-200'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div
                      className="h-32 bg-cover bg-center"
                      style={{ backgroundImage: `url(${option.image})` }}
                    />
                    <div className="p-3">
                      <p className="text-sm font-semibold text-gray-900">{option.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{option.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {newClientStep === 'form' && (
              <div className="p-4 space-y-4 overflow-y-auto max-h-[72vh]">
                {n(newClient.event_type) === 'casamento' ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">
                          Data planejada do evento (previsao)
                        </p>
                        <input
                          value={newClient.event_date_expected}
                          type="date"
                          onChange={(e) =>
                            setNewClient((p) => ({ ...p, event_date_expected: e.target.value }))
                          }
                          className="h-10 w-full rounded-xl border border-gray-200 px-3 text-sm"
                        />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Orcamento previsto</p>
                        <input
                          value={newClient.budget_expected}
                          onChange={(e) =>
                            setNewClient((p) => ({ ...p, budget_expected: e.target.value }))
                          }
                          placeholder="Ex: 50000"
                          className="h-10 w-full rounded-xl border border-gray-200 px-3 text-sm"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                      <div className="rounded-2xl border border-pink-100 bg-pink-50/40 p-4 space-y-2">
                        <p className="text-sm font-semibold text-gray-900">{partnerOneName}</p>
                        <input
                          value={newClient.partner1_name}
                          onChange={(e) =>
                            setNewClient((p) => ({ ...p, partner1_name: e.target.value }))
                          }
                          placeholder="Nome da Noiva"
                          className="h-10 rounded-xl border border-pink-200 px-3 text-sm bg-white"
                        />
                        <input
                          value={newClient.partner1_email}
                          onChange={(e) =>
                            setNewClient((p) => ({ ...p, partner1_email: e.target.value }))
                          }
                          placeholder={`Email de ${partnerOneName}`}
                          className="h-10 rounded-xl border border-pink-200 px-3 text-sm bg-white"
                        />
                        <input
                          value={newClient.partner1_phone}
                          onChange={(e) =>
                            setNewClient((p) => ({ ...p, partner1_phone: e.target.value }))
                          }
                          placeholder={`Telefone de ${partnerOneName}`}
                          className="h-10 rounded-xl border border-pink-200 px-3 text-sm bg-white"
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <input value={newClient.partner1_cpf} onChange={(e) => setNewClient((p) => ({ ...p, partner1_cpf: e.target.value }))} placeholder={`CPF de ${partnerOneName}`} className="h-10 rounded-xl border border-pink-200 px-3 text-sm bg-white" />
                          <input value={newClient.partner1_rg} onChange={(e) => setNewClient((p) => ({ ...p, partner1_rg: e.target.value }))} placeholder={`RG de ${partnerOneName}`} className="h-10 rounded-xl border border-pink-200 px-3 text-sm bg-white" />
                          <input type="date" value={newClient.partner1_birth_date} onChange={(e) => setNewClient((p) => ({ ...p, partner1_birth_date: e.target.value }))} className="h-10 rounded-xl border border-pink-200 px-3 text-sm bg-white" />
                          <input value={newClient.partner1_civil_status} onChange={(e) => setNewClient((p) => ({ ...p, partner1_civil_status: e.target.value }))} placeholder={`Estado civil de ${partnerOneName}`} className="h-10 rounded-xl border border-pink-200 px-3 text-sm bg-white" />
                          <input value={newClient.partner1_nationality} onChange={(e) => setNewClient((p) => ({ ...p, partner1_nationality: e.target.value }))} placeholder={`Nacionalidade de ${partnerOneName}`} className="h-10 rounded-xl border border-pink-200 px-3 text-sm bg-white" />
                          <input value={newClient.partner1_profession} onChange={(e) => setNewClient((p) => ({ ...p, partner1_profession: e.target.value }))} placeholder={`Profissao de ${partnerOneName}`} className="h-10 rounded-xl border border-pink-200 px-3 text-sm bg-white" />
                        </div>
                        <p className="text-xs text-pink-700/80 pt-1">Endereco completo</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          <input value={newClient.partner1_address_street} onChange={(e) => setNewClient((p) => ({ ...p, partner1_address_street: e.target.value }))} placeholder="Rua" className="md:col-span-2 h-10 rounded-xl border border-pink-200 px-3 text-sm bg-white" />
                          <input value={newClient.partner1_address_number} onChange={(e) => setNewClient((p) => ({ ...p, partner1_address_number: e.target.value }))} placeholder="Numero" className="h-10 rounded-xl border border-pink-200 px-3 text-sm bg-white" />
                          <input value={newClient.partner1_address_complement} onChange={(e) => setNewClient((p) => ({ ...p, partner1_address_complement: e.target.value }))} placeholder="Complemento" className="h-10 rounded-xl border border-pink-200 px-3 text-sm bg-white" />
                          <input value={newClient.partner1_address_neighborhood} onChange={(e) => setNewClient((p) => ({ ...p, partner1_address_neighborhood: e.target.value }))} placeholder="Bairro" className="h-10 rounded-xl border border-pink-200 px-3 text-sm bg-white" />
                          <input value={newClient.partner1_address_zip} onChange={(e) => setNewClient((p) => ({ ...p, partner1_address_zip: e.target.value }))} placeholder="CEP" className="h-10 rounded-xl border border-pink-200 px-3 text-sm bg-white" />
                          <input value={newClient.partner1_address_city} onChange={(e) => setNewClient((p) => ({ ...p, partner1_address_city: e.target.value }))} placeholder="Cidade" className="md:col-span-2 h-10 rounded-xl border border-pink-200 px-3 text-sm bg-white" />
                          <input value={newClient.partner1_address_state} onChange={(e) => setNewClient((p) => ({ ...p, partner1_address_state: e.target.value }))} placeholder="UF" className="h-10 rounded-xl border border-pink-200 px-3 text-sm bg-white" />
                        </div>
                      </div>
                      <div className="rounded-2xl border border-sky-100 bg-sky-50/40 p-4 space-y-2">
                        <p className="text-sm font-semibold text-gray-900">{partnerTwoName}</p>
                        <input
                          value={newClient.partner2_name}
                          onChange={(e) =>
                            setNewClient((p) => ({ ...p, partner2_name: e.target.value }))
                          }
                          placeholder="Nome do Noivo"
                          className="h-10 rounded-xl border border-sky-200 px-3 text-sm bg-white"
                        />
                        <input
                          value={newClient.partner2_email}
                          onChange={(e) =>
                            setNewClient((p) => ({ ...p, partner2_email: e.target.value }))
                          }
                          placeholder={`Email de ${partnerTwoName}`}
                          className="h-10 rounded-xl border border-sky-200 px-3 text-sm bg-white"
                        />
                        <input
                          value={newClient.partner2_phone}
                          onChange={(e) =>
                            setNewClient((p) => ({ ...p, partner2_phone: e.target.value }))
                          }
                          placeholder={`Telefone de ${partnerTwoName}`}
                          className="h-10 rounded-xl border border-sky-200 px-3 text-sm bg-white"
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <input value={newClient.partner2_cpf} onChange={(e) => setNewClient((p) => ({ ...p, partner2_cpf: e.target.value }))} placeholder={`CPF de ${partnerTwoName}`} className="h-10 rounded-xl border border-sky-200 px-3 text-sm bg-white" />
                          <input value={newClient.partner2_rg} onChange={(e) => setNewClient((p) => ({ ...p, partner2_rg: e.target.value }))} placeholder={`RG de ${partnerTwoName}`} className="h-10 rounded-xl border border-sky-200 px-3 text-sm bg-white" />
                          <input type="date" value={newClient.partner2_birth_date} onChange={(e) => setNewClient((p) => ({ ...p, partner2_birth_date: e.target.value }))} className="h-10 rounded-xl border border-sky-200 px-3 text-sm bg-white" />
                          <input value={newClient.partner2_civil_status} onChange={(e) => setNewClient((p) => ({ ...p, partner2_civil_status: e.target.value }))} placeholder={`Estado civil de ${partnerTwoName}`} className="h-10 rounded-xl border border-sky-200 px-3 text-sm bg-white" />
                          <input value={newClient.partner2_nationality} onChange={(e) => setNewClient((p) => ({ ...p, partner2_nationality: e.target.value }))} placeholder={`Nacionalidade de ${partnerTwoName}`} className="h-10 rounded-xl border border-sky-200 px-3 text-sm bg-white" />
                          <input value={newClient.partner2_profession} onChange={(e) => setNewClient((p) => ({ ...p, partner2_profession: e.target.value }))} placeholder={`Profissao de ${partnerTwoName}`} className="h-10 rounded-xl border border-sky-200 px-3 text-sm bg-white" />
                        </div>
                        <p className="text-xs text-sky-700/80 pt-1">Endereco completo</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          <input value={newClient.partner2_address_street} onChange={(e) => setNewClient((p) => ({ ...p, partner2_address_street: e.target.value }))} placeholder="Rua" className="md:col-span-2 h-10 rounded-xl border border-sky-200 px-3 text-sm bg-white" />
                          <input value={newClient.partner2_address_number} onChange={(e) => setNewClient((p) => ({ ...p, partner2_address_number: e.target.value }))} placeholder="Numero" className="h-10 rounded-xl border border-sky-200 px-3 text-sm bg-white" />
                          <input value={newClient.partner2_address_complement} onChange={(e) => setNewClient((p) => ({ ...p, partner2_address_complement: e.target.value }))} placeholder="Complemento" className="h-10 rounded-xl border border-sky-200 px-3 text-sm bg-white" />
                          <input value={newClient.partner2_address_neighborhood} onChange={(e) => setNewClient((p) => ({ ...p, partner2_address_neighborhood: e.target.value }))} placeholder="Bairro" className="h-10 rounded-xl border border-sky-200 px-3 text-sm bg-white" />
                          <input value={newClient.partner2_address_zip} onChange={(e) => setNewClient((p) => ({ ...p, partner2_address_zip: e.target.value }))} placeholder="CEP" className="h-10 rounded-xl border border-sky-200 px-3 text-sm bg-white" />
                          <input value={newClient.partner2_address_city} onChange={(e) => setNewClient((p) => ({ ...p, partner2_address_city: e.target.value }))} placeholder="Cidade" className="md:col-span-2 h-10 rounded-xl border border-sky-200 px-3 text-sm bg-white" />
                          <input value={newClient.partner2_address_state} onChange={(e) => setNewClient((p) => ({ ...p, partner2_address_state: e.target.value }))} placeholder="UF" className="h-10 rounded-xl border border-sky-200 px-3 text-sm bg-white" />
                        </div>
                      </div>
                    </div>
                    <input
                      value={newClient.name}
                      onChange={(e) => setNewClient((p) => ({ ...p, name: e.target.value }))}
                      placeholder="Nome do casal (opcional)"
                      className="h-10 rounded-xl border border-gray-200 px-3 text-sm"
                    />
                    <textarea
                      value={newClient.notes}
                      onChange={(e) => setNewClient((p) => ({ ...p, notes: e.target.value }))}
                      placeholder="Observacoes"
                      className="w-full min-h-[120px] rounded-xl border border-gray-200 p-3 text-sm"
                    />
                  </>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      value={newClient.name}
                      onChange={(e) => setNewClient((p) => ({ ...p, name: e.target.value }))}
                      placeholder="Nome do cliente"
                      className="h-10 rounded-xl border border-gray-200 px-3 text-sm"
                    />
                    <input
                      value={newClient.event_date_expected}
                      type="date"
                      onChange={(e) =>
                        setNewClient((p) => ({ ...p, event_date_expected: e.target.value }))
                      }
                      className="h-10 rounded-xl border border-gray-200 px-3 text-sm"
                    />
                    <input
                      value={newClient.email}
                      onChange={(e) => setNewClient((p) => ({ ...p, email: e.target.value }))}
                      placeholder="Email"
                      className="h-10 rounded-xl border border-gray-200 px-3 text-sm"
                    />
                    <input
                      value={newClient.phone}
                      onChange={(e) => setNewClient((p) => ({ ...p, phone: e.target.value }))}
                      placeholder="Telefone"
                      className="h-10 rounded-xl border border-gray-200 px-3 text-sm"
                    />
                    <input
                      value={newClient.budget_expected}
                      onChange={(e) =>
                        setNewClient((p) => ({ ...p, budget_expected: e.target.value }))
                      }
                      placeholder="Orcamento esperado"
                      className="h-10 rounded-xl border border-gray-200 px-3 text-sm"
                    />
                    <textarea
                      value={newClient.notes}
                      onChange={(e) => setNewClient((p) => ({ ...p, notes: e.target.value }))}
                      placeholder="Observacoes"
                      className="md:col-span-2 min-h-[120px] rounded-xl border border-gray-200 p-3 text-sm"
                    />
                  </div>
                )}
              </div>
            )}
            <div className="p-4 border-t border-gray-100 flex justify-end gap-2">
              {newClientStep === 'form' && (
                <button
                  onClick={() => setNewClientStep('type')}
                  className="h-10 px-4 rounded-xl border border-gray-200 text-sm"
                >
                  Voltar
                </button>
              )}
              <button onClick={closeNewClientWizard} className="h-10 px-4 rounded-xl border border-gray-200 text-sm">Fechar</button>
              {newClientStep === 'type' ? (
                <button
                  disabled={!newClient.event_type}
                  onClick={() => setNewClientStep('form')}
                  className="h-10 px-4 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold disabled:opacity-60"
                >
                  Confirmar tipo
                </button>
              ) : (
                <button disabled={saving} onClick={() => void createClient()} className="h-10 px-4 rounded-xl bg-gold-500 hover:bg-gold-600 text-white text-sm font-semibold disabled:opacity-60">
                  Salvar em Conhecendo cliente
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {isProspectModalOpen && (
        <div className="fixed inset-0 z-[95] bg-black/45 grid place-items-center p-4">
          <div className="w-full max-w-5xl bg-white rounded-2xl border border-gray-100 shadow-2xl">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Prospeccao do cliente</h3>
              <button onClick={() => setIsProspectModalOpen(false)} className="text-gray-500">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <input value={prospectDraft.name} onChange={(e) => setProspectDraft((p) => ({ ...p, name: e.target.value }))} placeholder="Nome" className="h-10 rounded-xl border border-gray-200 px-3 text-sm" />
              <input value={prospectDraft.email} onChange={(e) => setProspectDraft((p) => ({ ...p, email: e.target.value }))} placeholder="Email" className="h-10 rounded-xl border border-gray-200 px-3 text-sm" />
              <input value={prospectDraft.phone} onChange={(e) => setProspectDraft((p) => ({ ...p, phone: e.target.value }))} placeholder="Telefone" className="h-10 rounded-xl border border-gray-200 px-3 text-sm" />
              <input value={prospectDraft.event_type} onChange={(e) => setProspectDraft((p) => ({ ...p, event_type: e.target.value }))} placeholder="Tipo de evento" className="h-10 rounded-xl border border-gray-200 px-3 text-sm" />
              <input type="date" value={prospectDraft.event_date_expected} onChange={(e) => setProspectDraft((p) => ({ ...p, event_date_expected: e.target.value }))} className="h-10 rounded-xl border border-gray-200 px-3 text-sm" />
              <input value={prospectDraft.budget_expected} onChange={(e) => setProspectDraft((p) => ({ ...p, budget_expected: e.target.value }))} placeholder="Orcamento esperado" className="h-10 rounded-xl border border-gray-200 px-3 text-sm" />
              <textarea value={prospectDraft.notes} onChange={(e) => setProspectDraft((p) => ({ ...p, notes: e.target.value }))} placeholder="Observacoes do cliente" className="md:col-span-2 min-h-[140px] rounded-xl border border-gray-200 p-3 text-sm" />
            </div>
            <div className="p-4 border-t border-gray-100 flex flex-wrap justify-end gap-2">
              <button onClick={() => setIsProspectModalOpen(false)} className="h-10 px-4 rounded-xl border border-gray-200 text-sm">Fechar</button>
              <button onClick={() => void saveProspect()} className="h-10 px-4 rounded-xl border border-gray-200 text-sm">
                Salvar
              </button>
              <button
                onClick={() => void saveProspect('analisando_orcamento')}
                className="h-10 px-4 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold"
              >
                Preparar orÃ§amento
              </button>
            </div>
          </div>
        </div>
      )}

      {isDeleteModalOpen && selected && (
        <div className="fixed inset-0 z-[99] bg-black/55 backdrop-blur-[2px] grid place-items-center p-4">
          <div className="w-full max-w-xl rounded-3xl border border-white/20 bg-gradient-to-br from-white to-rose-50 shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-rose-100">
              <p className="text-[11px] uppercase tracking-wide text-rose-500 font-semibold">
                ExclusÃ£o definitiva
              </p>
              <h3 className="text-xl font-bold text-gray-900 mt-1">
                Excluir cliente da base agora?
              </h3>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-sm text-gray-700">
                Cliente: <b>{selected.name}</b>
              </p>
              <p className="text-sm text-gray-600">
                Esta aÃ§Ã£o remove o cliente e seus dados relacionados de forma permanente.
              </p>
              <p className="text-xs text-gray-500">
                Dica: se vocÃª quiser manter histÃ³rico por atÃ© 30 dias, use o estÃ¡gio
                <b> Cliente perdido</b> em vez de excluir.
              </p>
            </div>
            <div className="p-5 border-t border-rose-100 flex justify-end gap-2">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="h-10 px-4 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => void deleteClientPermanently()}
                disabled={deletingClient}
                className="h-10 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold disabled:opacity-60"
              >
                {deletingClient ? 'Excluindo...' : 'Excluir definitivamente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

