import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Clock,
  DollarSign,
  Edit2,
  MapPin,
  Users,
  X,
  CheckSquare,
  AlertCircle,
  Zap,
  Camera,
  Bell,
  Rocket,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Label,
} from 'recharts';

import { supabase } from '../lib/supabaseClient';
import {
  buildDefaultEventTasksPayload,
  getDefaultEventTaskTemplates,
  isLegacyWeddingChecklist,
} from '../lib/defaultEventTasks';
import { useAuth } from '../contexts/AuthContext';
import { TasksTab } from './event-details/tabs/TasksTab';
import { BudgetTab, type PaymentMethod } from './event-details/tabs/BudgetTab';
import { GuestsTab } from './event-details/tabs/GuestsTab';
import { InvitesTab } from './event-details/tabs/InvitesTab';
import { TimelineTab } from './event-details/tabs/TimelineTab';
import { VendorsTab } from './event-details/tabs/VendorsTab';
import { DocumentsTab } from './event-details/tabs/DocumentsTab';
import { NotesTab } from './event-details/tabs/NotesTab';
import { TeamTab } from './event-details/tabs/TeamTab';
import { TablesTab } from './event-details/tabs/TablesTab';

// --------------------
// Config
// --------------------
const T_EVENTS = 'events';
const T_TASKS = 'event_tasks';
const T_EXPENSES = 'event_expenses';
const T_PAYMENTS = 'expense_payments'; // ✅ novo
const T_GUESTS = 'event_guests';
const T_TIMELINE = 'event_timeline';
const T_VENDORS = 'event_vendors';
const T_DOCUMENTS = 'event_documents';
const T_NOTES = 'event_notes';
const T_TEAM = 'event_team_members';
const T_TABLES = 'event_tables';

const COLORS = [
  '#EAB308',
  '#FCA5A5',
  '#93C5FD',
  '#86EFAC',
  '#C084FC',
  '#FB923C',
  '#A78BFA',
];

const METHOD_LABEL: Record<PaymentMethod, string> = {
  pix: 'Pix',
  dinheiro: 'Dinheiro',
  debito: 'Débito',
  credito: 'Crédito',
  boleto: 'Boleto',
  transferencia: 'Transferência',
  outro: 'Outro',
};

const PAYMENT_META_PREFIX = '[[PP_META:';
const PAYMENT_META_SUFFIX = ']]';

type PaymentMeta = {
  installments?: number;
  receipt_document_id?: string | null;
};

function parsePaymentNote(note: string | null | undefined): {
  userNote: string;
  meta: PaymentMeta;
} {
  const raw = (note ?? '').trim();
  if (!raw) return { userNote: '', meta: {} };

  const start = raw.lastIndexOf(PAYMENT_META_PREFIX);
  const hasSuffix = raw.endsWith(PAYMENT_META_SUFFIX);
  if (start < 0 || !hasSuffix) return { userNote: raw, meta: {} };

  const jsonStart = start + PAYMENT_META_PREFIX.length;
  const jsonEnd = raw.length - PAYMENT_META_SUFFIX.length;
  const before = raw.slice(0, start).trim();
  const json = raw.slice(jsonStart, jsonEnd).trim();

  try {
    return {
      userNote: before,
      meta: (JSON.parse(json) as PaymentMeta) ?? {},
    };
  } catch {
    return { userNote: raw, meta: {} };
  }
}

function composePaymentNote(
  userNote: string | null | undefined,
  meta: PaymentMeta
): string | null {
  const clean = (userNote ?? '').trim();
  const hasMeta =
    typeof meta.installments === 'number' ||
    typeof meta.receipt_document_id === 'string' ||
    meta.receipt_document_id === null;

  if (!hasMeta) return clean || null;
  return `${clean}${clean ? '\n' : ''}${PAYMENT_META_PREFIX}${JSON.stringify(
    meta
  )}${PAYMENT_META_SUFFIX}`;
}

type Tab =
  | 'overview'
  | 'tasks'
  | 'budget'
  | 'guests'
  | 'timeline'
  | 'vendors'
  | 'documents'
  | 'notes'
  | 'team'
  | 'tables'
  | 'invites';

type EventRow = {
  id: string;
  user_id: string;
  name: string;
  event_type: string;
  event_date: string;
  location: string | null;
  status: string | null;
  couple: string | null;
  couple_photo_url: string | null;
  budget_total: number | null;
  guests_planned: number | null;
  updated_at?: string | null;
};

type TaskRow = {
  id: string;
  event_id: string;
  text: string;
  completed: boolean;
  position: number;
  due_date?: string | null;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  assignee_name?: string | null;
  created_at?: string;
};

type ExpenseRow = {
  id: string;
  event_id: string;
  name: string;
  value: number;
  color: string;
  vendor_id?: string | null;
  status?: 'pending' | 'confirmed' | 'paid' | 'cancelled';
  created_at?: string;
};

type PaymentRow = {
  id: string;
  event_id: string;
  expense_id: string;
  amount: number;
  method: PaymentMethod;
  paid_at: string; // YYYY-MM-DD
  note?: string | null;
  created_at?: string;
};

type GuestRow = {
  id: string;
  event_id: string;
  name: string;
  phone: string | null;
  confirmed: boolean;
  table_id?: string | null;
  invite_token?: string;
  created_at?: string;
};

type TimelineRow = {
  id: string;
  event_id: string;
  time: string;
  activity: string;
  description?: string | null;
  assignee_name?: string | null;
  position: number;
  created_at?: string;
};

type VendorRow = {
  id: string;
  event_id: string;
  name: string;
  category: string;
  phone?: string | null;
  email?: string | null;
  status: 'pending' | 'confirmed' | 'paid' | 'cancelled';
  notes?: string | null;
  created_at?: string;
};

type DocumentRow = {
  id: string;
  event_id: string;
  name: string;
  file_url: string;
  file_type?: string | null;
  category?: string | null;
  created_at?: string;
  vendor_id?: string | null;
};

type NoteRow = {
  id: string;
  event_id: string;
  content: string;
  color: string;
  created_at?: string;
  updated_at?: string;
};

type TeamMemberRow = {
  id: string;
  event_id: string;
  name: string;
  phone?: string | null;
  address?: string | null;
  role?: string | null;
  created_at?: string;
};

type TableRow = {
  id: string;
  event_id: string;
  name: string;
  seats: number;
  shape: 'round' | 'rectangular';
  note?: string | null;
  pos_x?: number | null;
  pos_y?: number | null;
  posx?: number | null;
  posy?: number | null;
  created_at?: string;
};

function toBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(date: string | null | undefined) {
  if (!date) return '';
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  });
}

function isOverdue(dueDate: string | null | undefined) {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date(new Date().setHours(0, 0, 0, 0));
}

function isToday(dueDate: string | null | undefined) {
  if (!dueDate) return false;
  const today = new Date().setHours(0, 0, 0, 0);
  const due = new Date(dueDate).setHours(0, 0, 0, 0);
  return today === due;
}

function isThisWeek(dueDate: string | null | undefined) {
  if (!dueDate) return false;
  const today = new Date();
  const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const due = new Date(dueDate);
  return due > today && due <= weekFromNow;
}

const PRIORITY_CONFIG = {
  urgent: {
    label: 'Urgente',
    color: 'text-red-600',
    bg: 'bg-red-50',
    icon: Zap,
  },
  high: {
    label: 'Alta',
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    icon: AlertCircle,
  },
  normal: {
    label: 'Normal',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    icon: null,
  },
  low: {
    label: 'Baixa',
    color: 'text-gray-600',
    bg: 'bg-gray-50',
    icon: null,
  },
};

// --------------------
// Page
// --------------------
export function EventDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const eventId = id ?? '';
  const { user } = useAuth();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<Tab>('overview');

  // filtro: Fornecedor -> Financeiro
  const [budgetVendorFilterId, setBudgetVendorFilterId] = useState<
    string | null
  >(null);
  function goToBudgetFilteredByVendor(vendorId: string) {
    setBudgetVendorFilterId(vendorId);
    setActiveTab('budget');
  }
  function clearBudgetVendorFilter() {
    setBudgetVendorFilterId(null);
  }

  const [documentsVendorFilterId, setDocumentsVendorFilterId] = useState<
    string | null
  >(null);
  const [documentsReceiptFilterId, setDocumentsReceiptFilterId] = useState<
    string | null
  >(null);
  function goToDocumentById(documentId: string) {
    setDocumentsVendorFilterId(null);
    setDocumentsReceiptFilterId(documentId);
    setActiveTab('documents');
  }
  function goToDocumentsFilteredByVendor(vendorId: string) {
    setDocumentsReceiptFilterId(null);
    setDocumentsVendorFilterId(vendorId);
    setActiveTab('documents');
  }

  const [tableViewMode, setTableViewMode] = useState<'list' | 'map'>('list');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [savingBasics, setSavingBasics] = useState(false);
  const [savingBudgetCard, setSavingBudgetCard] = useState(false);
  const [isBudgetCardEditing, setIsBudgetCardEditing] = useState(false);
  const [budgetCardDraft, setBudgetCardDraft] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [event, setEvent] = useState<EventRow | null>(null);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [isAddingExpense, setIsAddingExpense] = useState(false);

  const [guests, setGuests] = useState<GuestRow[]>([]);
  const [timeline, setTimeline] = useState<TimelineRow[]>([]);
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [team, setTeam] = useState<TeamMemberRow[]>([]);
  const [tables, setTables] = useState<TableRow[]>([]);

  const paymentReceiptCountByVendor = useMemo(() => {
    const documentsById = new Map(documents.map((doc) => [doc.id, doc]));
    const receiptIdsByVendor = new Map<string, Set<string>>();

    for (const payment of payments) {
      const receiptDocumentId = parsePaymentNote(payment.note).meta
        .receipt_document_id;
      if (!receiptDocumentId) continue;

      const vendorId = documentsById.get(receiptDocumentId)?.vendor_id ?? null;
      if (!vendorId) continue;

      const ids = receiptIdsByVendor.get(vendorId) ?? new Set<string>();
      ids.add(receiptDocumentId);
      receiptIdsByVendor.set(vendorId, ids);
    }

    const counts = new Map<string, number>();
    for (const [vendorId, receiptIds] of receiptIdsByVendor.entries()) {
      counts.set(vendorId, receiptIds.size);
    }
    return counts;
  }, [documents, payments]);

  const tasksRef = useRef<TaskRow[]>([]);
  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  // Inputs
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<
    'low' | 'normal' | 'high' | 'urgent'
  >('normal');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');

  const [newExpense, setNewExpense] = useState({
    name: '',
    value: '',
    vendor_id: '',
    status: 'pending' as const,
  });

  const [newGuest, setNewGuest] = useState({ name: '', phone: '' });

  const [newTimelineItem, setNewTimelineItem] = useState({
    time: '',
    activity: '',
    assignee: '',
  });

  const [newVendor, setNewVendor] = useState({
    name: '',
    category: '',
    phone: '',
    email: '',
  });

  const [newNote, setNewNote] = useState('');
  const [newTeamMember, setNewTeamMember] = useState({
    name: '',
    phone: '',
    address: '',
    role: '',
  });

  const [newTable, setNewTable] = useState({ name: '', seats: 8 });
  const [draggedTaskIndex, setDraggedTaskIndex] = useState<number | null>(null);

  // --------------------
  // Derived
  // --------------------
  const expensesForCharts = useMemo(() => {
    return expenses.filter((e) => (e.status ?? 'pending') !== 'cancelled');
  }, [expenses]);

  const totalSpent = useMemo(
    () =>
      expenses.reduce((sum, e) => {
        const st = (e.status ?? 'pending') as ExpenseRow['status'];
        if (st === 'cancelled') return sum;
        return sum + (Number(e.value) || 0);
      }, 0),
    [expenses]
  );

  const paymentsByMethod = useMemo(() => {
    const expenseStatusById = new Map<string, ExpenseRow['status']>();
    expenses.forEach((expenseItem) => {
      expenseStatusById.set(
        expenseItem.id,
        (expenseItem.status ?? 'pending') as ExpenseRow['status']
      );
    });

    const map = new Map<PaymentMethod, number>();
    payments.forEach((paymentItem) => {
      const st = expenseStatusById.get(paymentItem.expense_id) ?? 'pending';
      if (st === 'cancelled') return;
      map.set(
        paymentItem.method,
        (map.get(paymentItem.method) ?? 0) + Number(paymentItem.amount || 0)
      );
    });

    return Array.from(map.entries()).map(([method, value], idx) => ({
      id: method,
      name: METHOD_LABEL[method],
      value,
      color: COLORS[idx % COLORS.length],
    }));
  }, [payments, expenses]);

  const budgetTotal = Number(event?.budget_total || 0);
  const budgetProgress =
    budgetTotal > 0 ? Math.min((totalSpent / budgetTotal) * 100, 100) : 0;

  useEffect(() => {
    setBudgetCardDraft(String(Number(event?.budget_total || 0)));
    setIsBudgetCardEditing(false);
  }, [event?.id, event?.budget_total]);

  const completedTasks = useMemo(
    () => tasks.filter((t) => t.completed).length,
    [tasks]
  );
  const tasksProgress =
    tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0;

  const confirmedGuests = useMemo(
    () => guests.filter((g) => g.confirmed).length,
    [guests]
  );

  const displayName = useMemo(() => {
    const couple = (event?.couple ?? '').trim();
    return couple || event?.name || 'Evento';
  }, [event]);

  const daysRemaining = useMemo(() => {
    if (!event?.event_date) return 0;
    const diff = new Date(event.event_date).getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }, [event?.event_date]);

  const pendingTasks = useMemo(
    () => tasks.filter((t) => !t.completed),
    [tasks]
  );

  const overdueTasks = useMemo(
    () => pendingTasks.filter((t) => isOverdue(t.due_date)),
    [pendingTasks]
  );
  const todayTasks = useMemo(
    () => pendingTasks.filter((t) => isToday(t.due_date)),
    [pendingTasks]
  );
  const thisWeekTasks = useMemo(
    () => pendingTasks.filter((t) => isThisWeek(t.due_date)),
    [pendingTasks]
  );
  const futureTasks = useMemo(
    () =>
      pendingTasks.filter(
        (t) =>
          !isOverdue(t.due_date) &&
          !isToday(t.due_date) &&
          !isThisWeek(t.due_date)
      ),
    [pendingTasks]
  );

  // Alertas
  const alerts = useMemo(() => {
    const list: { type: 'error' | 'warning' | 'info'; message: string }[] = [];
    if (overdueTasks.length > 0) {
      list.push({
        type: 'error',
        message: `${overdueTasks.length} tarefa(s) atrasada(s)!`,
      });
    }
    if (budgetProgress > 90) {
      list.push({
        type: 'warning',
        message: `Orçamento em ${budgetProgress.toFixed(0)}% - atenção!`,
      });
    }
    if (daysRemaining > 0 && daysRemaining <= 7 && pendingTasks.length > 5) {
      list.push({
        type: 'info',
        message: `Faltam ${daysRemaining} dias e ainda há ${pendingTasks.length} tarefas!`,
      });
    }
    const unconfirmed = guests.length - confirmedGuests;
    if (daysRemaining > 0 && daysRemaining <= 14 && unconfirmed > 10) {
      list.push({
        type: 'info',
        message: `${unconfirmed} convidados ainda não confirmaram presença.`,
      });
    }
    return list;
  }, [
    overdueTasks,
    budgetProgress,
    daysRemaining,
    pendingTasks,
    guests.length,
    confirmedGuests,
  ]);

  // --------------------
  // Load
  // --------------------
  useEffect(() => {
    let cancelled = false;

    async function loadAll() {
      if (!eventId) {
        setErrorMsg('ID do evento ausente na rota.');
        setLoading(false);
        return;
      }
      if (!user) {
        setErrorMsg('Usuário não autenticado.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorMsg(null);

      try {
        const [
          eventRes,
          tasksRes,
          expensesRes,
          paymentsRes,
          guestsRes,
          timelineRes,
          vendorsRes,
          docsRes,
          notesRes,
          teamRes,
          tablesRes,
        ] = await Promise.all([
          supabase
            .from(T_EVENTS)
            .select(
              'id, user_id, name, event_type, event_date, location, status, couple, couple_photo_url, budget_total, guests_planned, updated_at'
            )
            .eq('id', eventId)
            .eq('user_id', user.id)
            .single(),
          supabase
            .from(T_TASKS)
            .select('*')
            .eq('event_id', eventId)
            .order('position', { ascending: true }),
          supabase
            .from(T_EXPENSES)
            .select('*')
            .eq('event_id', eventId)
            .order('created_at', { ascending: true }),
          supabase
            .from(T_PAYMENTS)
            .select('*')
            .eq('event_id', eventId)
            .order('paid_at', { ascending: false }),
          supabase
            .from(T_GUESTS)
            .select('*')
            .eq('event_id', eventId)
            .order('name', { ascending: true }),
          supabase
            .from(T_TIMELINE)
            .select('*')
            .eq('event_id', eventId)
            .order('position', { ascending: true }),
          supabase
            .from(T_VENDORS)
            .select('*')
            .eq('event_id', eventId)
            .order('created_at', { ascending: true }),
          supabase
            .from(T_DOCUMENTS)
            .select('*')
            .eq('event_id', eventId)
            .order('created_at', { ascending: false }),
          supabase
            .from(T_NOTES)
            .select('*')
            .eq('event_id', eventId)
            .order('created_at', { ascending: false }),
          supabase
            .from(T_TEAM)
            .select('*')
            .eq('event_id', eventId)
            .order('name', { ascending: true }),
          supabase
            .from(T_TABLES)
            .select('*')
            .eq('event_id', eventId)
            .order('created_at', { ascending: true }),
        ]);

        if (eventRes.error) throw eventRes.error;
        if (tasksRes.error) throw tasksRes.error;
        if (expensesRes.error) throw expensesRes.error;
        if (paymentsRes.error) throw paymentsRes.error;
        if (guestsRes.error) throw guestsRes.error;
        if (timelineRes.error) throw timelineRes.error;
        if (vendorsRes.error) throw vendorsRes.error;
        if (docsRes.error) throw docsRes.error;
        if (notesRes.error) throw notesRes.error;
        if (teamRes.error) throw teamRes.error;
        if (tablesRes.error) throw tablesRes.error;

        if (cancelled) return;

        const loadedEvent = eventRes.data as EventRow;
        const eventType = loadedEvent?.event_type ?? 'wedding';

        let loadedTasks = ((tasksRes.data as TaskRow[]) ?? []).sort(
          (a, b) => a.position - b.position
        );

        if (loadedTasks.length === 0) {
          const { data: insertedDefaultTasks, error: insertDefaultTasksError } =
            await supabase
              .from(T_TASKS)
              .insert(buildDefaultEventTasksPayload(eventId, eventType))
              .select('*');

          if (insertDefaultTasksError) throw insertDefaultTasksError;

          loadedTasks = ((insertedDefaultTasks as TaskRow[]) ?? []).sort(
            (a, b) => a.position - b.position
          );
        }

        const shouldMigrateLegacyChecklist =
          eventType !== 'wedding' && isLegacyWeddingChecklist(loadedTasks);

        if (shouldMigrateLegacyChecklist) {
          const nextTemplate = getDefaultEventTaskTemplates(eventType);
          const migrationPayload = loadedTasks.map((task, idx) => ({
            id: task.id,
            text: nextTemplate[idx]?.text ?? task.text,
            priority: nextTemplate[idx]?.priority ?? task.priority ?? 'normal',
            position: idx,
          }));

          const { error: migrationError } = await supabase
            .from(T_TASKS)
            .upsert(migrationPayload, { onConflict: 'id' });
          if (migrationError) throw migrationError;

          loadedTasks = loadedTasks.map((task, idx) => ({
            ...task,
            text: nextTemplate[idx]?.text ?? task.text,
            priority: nextTemplate[idx]?.priority ?? task.priority ?? 'normal',
            position: idx,
          }));
        }

        setEvent(loadedEvent);
        setTasks(loadedTasks);
        setExpenses((expensesRes.data as ExpenseRow[]) ?? []);
        setPayments((paymentsRes.data as PaymentRow[]) ?? []);
        setGuests((guestsRes.data as GuestRow[]) ?? []);
        setTimeline((timelineRes.data as TimelineRow[]) ?? []);
        setVendors((vendorsRes.data as VendorRow[]) ?? []);
        setDocuments((docsRes.data as DocumentRow[]) ?? []);
        setNotes((notesRes.data as NoteRow[]) ?? []);
        setTeam((teamRes.data as TeamMemberRow[]) ?? []);
        setTables((tablesRes.data as TableRow[]) ?? []);
      } catch (err: any) {
        if (cancelled) return;
        setErrorMsg(err?.message ?? 'Erro ao carregar dados do evento.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadAll();

    return () => {
      cancelled = true;
    };
  }, [eventId, user]);

  // --------------------
  // Upload foto
  // --------------------
  async function uploadPhoto(file: File) {
    if (!event) return;

    setUploadingPhoto(true);
    setErrorMsg(null);

    try {
      const ext = file.name.split('.').pop();
      const filename = `${eventId}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('event-photos')
        .upload(filename, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('event-photos')
        .getPublicUrl(filename);

      const { error: updateError } = await supabase
        .from(T_EVENTS)
        .update({ couple_photo_url: urlData.publicUrl })
        .eq('id', eventId);

      if (updateError) throw updateError;

      setEvent((p) => (p ? { ...p, couple_photo_url: urlData.publicUrl } : p));
    } catch (err: any) {
      setErrorMsg(err?.message ?? 'Erro ao fazer upload da foto.');
    } finally {
      setUploadingPhoto(false);
    }
  }

  // --------------------
  // Save basics
  // --------------------
  async function saveBasics() {
    if (!event) return;

    setSavingBasics(true);
    setErrorMsg(null);

    try {
      const coupleTrim = (event.couple ?? '').trim();

      const payload: Partial<EventRow> = {
        couple: coupleTrim || null,
        name: coupleTrim || event.name || 'Evento',
        event_date: event.event_date,
        location: (event.location ?? '').trim() || null,
        budget_total: Number(event.budget_total || 0),
        guests_planned: Number(event.guests_planned || 0),
        updated_at: new Date().toISOString(),
      };

      const res = await supabase
        .from(T_EVENTS)
        .update(payload)
        .eq('id', event.id);
      if (res.error) throw res.error;

      setIsEditModalOpen(false);
    } catch (err: any) {
      setErrorMsg(err?.message ?? 'Erro ao salvar informações básicas.');
    } finally {
      setSavingBasics(false);
    }
  }

  // --------------------
  // Tasks CRUD (mantive o seu)
  // --------------------

  async function saveTableNote(tableId: string, note: string | null) {
    const { error } = await supabase
      .from(T_TABLES)
      .update({ note })
      .eq('id', tableId);

    if (error) setErrorMsg(error.message);
  }

  async function persistTablePosition(tableId: string, x: number, y: number) {
    const { error } = await supabase
      .from(T_TABLES)
      .update({ posx: x, posy: y })
      .eq('id', tableId);

    if (error) setErrorMsg(error.message);
  }

  async function addTask() {
    const text = newTaskText.trim();
    if (!text || !eventId) return;

    try {
      const position = tasks.length;
      const res = await supabase
        .from(T_TASKS)
        .insert({
          event_id: eventId,
          text,
          completed: false,
          position,
          due_date: newTaskDueDate || null,
          priority: newTaskPriority,
          assignee_name: newTaskAssignee.trim() || null,
        })
        .select('*')
        .single();

      if (res.error) throw res.error;

      setTasks((prev) => [...prev, res.data as TaskRow]);
      setNewTaskText('');
      setNewTaskDueDate('');
      setNewTaskPriority('normal');
      setNewTaskAssignee('');
    } catch (err: any) {
      setErrorMsg(err?.message ?? 'Erro ao criar tarefa.');
    }
  }

  async function toggleTask(taskId: string) {
    const t = tasks.find((x) => x.id === taskId);
    if (!t) return;

    try {
      const res = await supabase
        .from(T_TASKS)
        .update({ completed: !t.completed })
        .eq('id', taskId);
      if (res.error) throw res.error;

      setTasks((prev) =>
        prev.map((x) =>
          x.id === taskId ? { ...x, completed: !x.completed } : x
        )
      );
    } catch (err: any) {
      setErrorMsg(err?.message ?? 'Erro ao atualizar tarefa.');
    }
  }

  async function deleteTask(taskId: string) {
    try {
      const res = await supabase.from(T_TASKS).delete().eq('id', taskId);
      if (res.error) throw res.error;

      setTasks((prev) => prev.filter((x) => x.id !== taskId));
    } catch (err: any) {
      setErrorMsg(err?.message ?? 'Erro ao remover tarefa.');
    }
  }

  function onTaskDragStart(index: number) {
    setDraggedTaskIndex(index);
  }

  function onTaskDragOver(e: React.DragEvent, overIndex: number) {
    e.preventDefault();
    if (draggedTaskIndex === null || draggedTaskIndex === overIndex) return;

    setTasks((prev) => {
      const copy = [...prev];
      const [moved] = copy.splice(draggedTaskIndex, 1);
      copy.splice(overIndex, 0, moved);
      return copy;
    });

    setDraggedTaskIndex(overIndex);
  }

  async function onTaskDragEnd() {
    setDraggedTaskIndex(null);

    try {
      const current = tasksRef.current;
      const payload = current.map((t, idx) => ({ id: t.id, position: idx }));

      const res = await supabase
        .from(T_TASKS)
        .upsert(payload, { onConflict: 'id' });
      if (res.error) throw res.error;

      setTasks((prev) => prev.map((t, idx) => ({ ...t, position: idx })));
    } catch (err: any) {
      setErrorMsg(err?.message ?? 'Erro ao reordenar tarefas.');
    }
  }

  // --------------------
  // Expenses CRUD
  // --------------------
  async function addExpense() {
    if (isAddingExpense) return;

    const name = newExpense.name.trim();
    const raw = newExpense.value?.toString().trim();
    const value = raw === '' ? NaN : Number(raw);
    const vendor_id = newExpense.vendor_id ? newExpense.vendor_id : null;
    const status = (newExpense.status ?? 'pending') as ExpenseRow['status'];

    if (!eventId || !name || !Number.isFinite(value) || value < 0) return;

    setIsAddingExpense(true);
    try {
      const color = COLORS[expenses.length % COLORS.length];

      const res = await supabase
        .from(T_EXPENSES)
        .insert({ event_id: eventId, name, value, color, vendor_id, status })
        .select('*')
        .single();

      if (res.error) throw res.error;

      setExpenses((prev) => [...prev, res.data as ExpenseRow]);
      setNewExpense({ name: '', value: '', vendor_id: '', status: 'pending' });
    } catch (err: any) {
      setErrorMsg(err?.message ?? 'Erro ao criar despesa.');
    } finally {
      setIsAddingExpense(false);
    }
  }

  async function updateDocument(
    docId: string,
    patch: Partial<Pick<DocumentRow, 'name' | 'category' | 'vendor_id'>>
  ) {
    try {
      const res = await supabase
        .from(T_DOCUMENTS)
        .update(patch)
        .eq('id', docId);
      if (res.error) throw res.error;

      setDocuments((prev) =>
        prev.map((d) => (d.id === docId ? { ...d, ...patch } : d))
      );
    } catch (err: any) {
      setErrorMsg(err?.message ?? 'Erro ao atualizar documento.');
    }
  }

  async function updateExpense(
    expenseId: string,
    patch: Partial<Pick<ExpenseRow, 'name' | 'value' | 'vendor_id' | 'status'>>
  ) {
    try {
      const res = await supabase
        .from(T_EXPENSES)
        .update(patch)
        .eq('id', expenseId);
      if (res.error) throw res.error;

      setExpenses((prev) =>
        prev.map((e) => (e.id === expenseId ? { ...e, ...patch } : e))
      );
    } catch (err: any) {
      setErrorMsg(err?.message ?? 'Erro ao atualizar despesa.');
    }
  }

  async function deleteExpense(expenseId: string) {
    try {
      // ✅ evita FK (se você não tiver cascade)
      await supabase.from(T_PAYMENTS).delete().eq('expense_id', expenseId);

      const res = await supabase.from(T_EXPENSES).delete().eq('id', expenseId);
      if (res.error) throw res.error;

      setExpenses((prev) => prev.filter((e) => e.id !== expenseId));
      setPayments((prev) => prev.filter((p) => p.expense_id !== expenseId));
    } catch (err: any) {
      setErrorMsg(err?.message ?? 'Erro ao remover despesa.');
    }
  }

  // --------------------
  // Payments CRUD (Opção 1)
  // --------------------
  async function addPayment(
    expenseId: string,
    payload: {
      amount: number;
      method: PaymentMethod;
      paid_at: string;
      note?: string | null;
      installments?: number;
    }
  ) {
    if (!eventId || !expenseId) return;

    const amount = Number(payload.amount);
    if (!Number.isFinite(amount) || amount <= 0) return;

    const installments = Math.max(1, Number(payload.installments || 1));
    const composedNote = composePaymentNote(payload.note, {
      installments,
      receipt_document_id: null,
    });

    try {
      const res = await supabase
        .from(T_PAYMENTS)
        .insert({
          event_id: eventId,
          expense_id: expenseId,
          amount,
          method: payload.method,
          paid_at: payload.paid_at,
          note: composedNote,
        })
        .select('*')
        .single();

      if (res.error) throw res.error;

      setPayments((prev) => [res.data as PaymentRow, ...prev]);
    } catch (err: any) {
      setErrorMsg(err?.message ?? 'Erro ao registrar pagamento.');
    }
  }

  async function saveBudgetFromCard() {
    if (!event || !user || savingBudgetCard) return;

    const parsedBudget = Number((budgetCardDraft ?? '').trim());
    if (!Number.isFinite(parsedBudget) || parsedBudget < 0) {
      setErrorMsg('Informe um orçamento válido (0 ou maior).');
      return;
    }

    setSavingBudgetCard(true);
    setErrorMsg(null);

    try {
      const { error } = await supabase
        .from(T_EVENTS)
        .update({
          budget_total: parsedBudget,
          updated_at: new Date().toISOString(),
        })
        .eq('id', event.id)
        .eq('user_id', user.id);

      if (error) throw error;

      setEvent((prev) =>
        prev
          ? { ...prev, budget_total: parsedBudget, updated_at: new Date().toISOString() }
          : prev
      );
      setIsBudgetCardEditing(false);
    } catch (err: any) {
      setErrorMsg(err?.message ?? 'Erro ao salvar orçamento do evento.');
    } finally {
      setSavingBudgetCard(false);
    }
  }

  async function updateTaskPriority(
    taskId: string,
    priority: 'low' | 'normal' | 'high' | 'urgent'
  ) {
    const currentTask = tasks.find((x) => x.id === taskId);
    if (!currentTask || currentTask.priority === priority) return;

    try {
      const res = await supabase
        .from(T_TASKS)
        .update({ priority })
        .eq('id', taskId);
      if (res.error) throw res.error;

      setTasks((prev) =>
        prev.map((x) => (x.id === taskId ? { ...x, priority } : x))
      );
    } catch (err: any) {
      setErrorMsg(err?.message ?? 'Erro ao atualizar prioridade da tarefa.');
    }
  }

  async function linkPaymentReceiptDocument(
    paymentId: string,
    documentId: string | null
  ) {
    const current = payments.find((p) => p.id === paymentId);
    if (!current) return;
    const expenseVendorId =
      expenses.find((e) => e.id === current.expense_id)?.vendor_id ?? null;
    const currentDocVendorId =
      documentId != null
        ? documents.find((doc) => doc.id === documentId)?.vendor_id ?? null
        : null;

    const parsed = parsePaymentNote(current.note);
    const nextNote = composePaymentNote(parsed.userNote, {
      ...parsed.meta,
      receipt_document_id: documentId,
    });

    try {
      const res = await supabase
        .from(T_PAYMENTS)
        .update({ note: nextNote })
        .eq('id', paymentId);
      if (res.error) throw res.error;

      setPayments((prev) =>
        prev.map((p) => (p.id === paymentId ? { ...p, note: nextNote } : p))
      );

      const canAutoLinkDocumentVendor =
        documentId &&
        expenseVendorId &&
        (currentDocVendorId == null || currentDocVendorId === '');

      if (canAutoLinkDocumentVendor) {
        const docRes = await supabase
          .from(T_DOCUMENTS)
          .update({ vendor_id: expenseVendorId })
          .eq('id', documentId);
        if (docRes.error) throw docRes.error;

        setDocuments((prev) =>
          prev.map((doc) =>
            doc.id === documentId ? { ...doc, vendor_id: expenseVendorId } : doc
          )
        );
      }
    } catch (err: any) {
      setErrorMsg(err?.message ?? 'Erro ao vincular comprovante.');
    }
  }

  async function deletePayment(paymentId: string) {
    if (!paymentId) return;
    try {
      const res = await supabase.from(T_PAYMENTS).delete().eq('id', paymentId);
      if (res.error) throw res.error;

      setPayments((prev) => prev.filter((p) => p.id !== paymentId));
    } catch (err: any) {
      setErrorMsg(err?.message ?? 'Erro ao remover pagamento.');
    }
  }

  // --------------------
  // Guests CRUD + import CSV
  // --------------------
  async function addGuest() {
    const name = newGuest.name.trim();
    const phone = newGuest.phone.trim();
    if (!name || !eventId) return;

    try {
      const res = await supabase
        .from(T_GUESTS)
        .insert({
          event_id: eventId,
          name,
          phone: phone || null,
          confirmed: false,
        })
        .select('*')
        .single();

      if (res.error) throw res.error;

      setGuests((prev) =>
        [...prev, res.data as GuestRow].sort((a, b) =>
          a.name.localeCompare(b.name)
        )
      );
      setNewGuest({ name: '', phone: '' });
    } catch (err: any) {
      setErrorMsg(err?.message ?? 'Erro ao adicionar convidado.');
    }
  }

  async function toggleGuest(guestId: string) {
    const g = guests.find((x) => x.id === guestId);
    if (!g) return;

    try {
      const res = await supabase
        .from(T_GUESTS)
        .update({ confirmed: !g.confirmed })
        .eq('id', guestId);
      if (res.error) throw res.error;

      setGuests((prev) =>
        prev.map((x) =>
          x.id === guestId ? { ...x, confirmed: !x.confirmed } : x
        )
      );
    } catch (err: any) {
      setErrorMsg(err?.message ?? 'Erro ao atualizar confirmação.');
    }
  }

  async function deleteGuest(guestId: string) {
    try {
      const res = await supabase.from(T_GUESTS).delete().eq('id', guestId);
      if (res.error) throw res.error;

      setGuests((prev) => prev.filter((x) => x.id !== guestId));
    } catch (err: any) {
      setErrorMsg(err?.message ?? 'Erro ao remover convidado.');
    }
  }

  async function importCSV(file: File) {
    const text = await file.text();
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    const rows = lines
      .map((line) => line.split(',').map((x) => x.trim()))
      .filter((cols) => cols[0] && cols[0].toLowerCase() !== 'nome');

    if (rows.length === 0 || !eventId) return;

    try {
      const payload = rows.map(([name, phone]) => ({
        event_id: eventId,
        name,
        phone: phone || null,
        confirmed: false,
      }));

      const res = await supabase.from(T_GUESTS).insert(payload).select('*');
      if (res.error) throw res.error;

      const inserted = (res.data as GuestRow[]) ?? [];
      setGuests((prev) =>
        [...prev, ...inserted].sort((a, b) => a.name.localeCompare(b.name))
      );
    } catch (err: any) {
      setErrorMsg(err?.message ?? 'Erro ao importar convidados.');
    }
  }

  // --------------------
  // Timeline CRUD
  // --------------------
  async function addTimelineItem() {
    const { time, activity, assignee } = newTimelineItem;
    if (!time.trim() || !activity.trim() || !eventId) return;

    try {
      const position = timeline.length;
      const res = await supabase
        .from(T_TIMELINE)
        .insert({
          event_id: eventId,
          time: time.trim(),
          activity: activity.trim(),
          assignee_name: assignee.trim() || null,
          position,
        })
        .select('*')
        .single();

      if (res.error) throw res.error;

      setTimeline((prev) => [...prev, res.data as TimelineRow]);
      setNewTimelineItem({ time: '', activity: '', assignee: '' });
    } catch (err: any) {
      setErrorMsg(err?.message ?? 'Erro ao criar item da timeline.');
    }
  }

  async function deleteTimelineItem(id: string) {
    try {
      const res = await supabase.from(T_TIMELINE).delete().eq('id', id);
      if (res.error) throw res.error;

      setTimeline((prev) => prev.filter((x) => x.id !== id));
    } catch (err: any) {
      setErrorMsg(err?.message ?? 'Erro ao remover item da timeline.');
    }
  }

  // --------------------
  // Vendors CRUD
  // --------------------
  async function addVendor() {
    const { name, category, phone, email } = newVendor;
    if (!name.trim() || !category.trim() || !eventId) return;

    try {
      const res = await supabase
        .from(T_VENDORS)
        .insert({
          event_id: eventId,
          name: name.trim(),
          category: category.trim(),
          phone: phone.trim() || null,
          email: email.trim() || null,
          status: 'pending',
        })
        .select('*')
        .single();

      if (res.error) throw res.error;

      setVendors((prev) => [...prev, res.data as VendorRow]);
      setNewVendor({ name: '', category: '', phone: '', email: '' });
    } catch (err: any) {
      setErrorMsg(err?.message ?? 'Erro ao criar fornecedor.');
    }
  }

  async function updateVendorStatus(id: string, status: VendorRow['status']) {
    try {
      const res = await supabase
        .from(T_VENDORS)
        .update({ status })
        .eq('id', id);
      if (res.error) throw res.error;

      setVendors((prev) =>
        prev.map((v) => (v.id === id ? { ...v, status } : v))
      );
    } catch (err: any) {
      setErrorMsg(err?.message ?? 'Erro ao atualizar fornecedor.');
    }
  }

  async function deleteVendor(id: string) {
    try {
      const res = await supabase.from(T_VENDORS).delete().eq('id', id);
      if (res.error) throw res.error;

      setVendors((prev) => prev.filter((x) => x.id !== id));
    } catch (err: any) {
      setErrorMsg(err?.message ?? 'Erro ao remover fornecedor.');
    }
  }

  // --------------------
  // Documents CRUD
  // --------------------
  async function uploadDocument(file: File) {
    if (!eventId) return;

    setUploadingDoc(true);
    setErrorMsg(null);

    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filename = `${eventId}-${Date.now()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from('event-documents')
        .upload(filename, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('event-documents')
        .getPublicUrl(filename);

      const res = await supabase
        .from(T_DOCUMENTS)
        .insert({
          event_id: eventId,
          name: file.name,
          file_url: urlData.publicUrl,
          file_type: file.type,
          category: 'Outros',
        })
        .select('*')
        .single();

      if (res.error) throw res.error;

      setDocuments((prev) => [res.data as DocumentRow, ...prev]);
    } catch (err: any) {
      setErrorMsg(err?.message ?? 'Erro ao fazer upload do documento.');
    } finally {
      setUploadingDoc(false);
    }
  }

  async function deleteDocument(id: string) {
    try {
      const res = await supabase.from(T_DOCUMENTS).delete().eq('id', id);
      if (res.error) throw res.error;

      setDocuments((prev) => prev.filter((x) => x.id !== id));
    } catch (err: any) {
      setErrorMsg(err?.message ?? 'Erro ao remover documento.');
    }
  }

  // --------------------
  // Notes CRUD
  // --------------------
  async function addNote() {
    if (!newNote.trim() || !eventId) return;

    try {
      const res = await supabase
        .from(T_NOTES)
        .insert({
          event_id: eventId,
          content: newNote.trim(),
          color: '#fef3c7',
        })
        .select('*')
        .single();

      if (res.error) throw res.error;

      setNotes((prev) => [res.data as NoteRow, ...prev]);
      setNewNote('');
    } catch (err: any) {
      setErrorMsg(err?.message ?? 'Erro ao criar nota.');
    }
  }

  async function deleteNote(id: string) {
    try {
      const res = await supabase.from(T_NOTES).delete().eq('id', id);
      if (res.error) throw res.error;

      setNotes((prev) => prev.filter((x) => x.id !== id));
    } catch (err: any) {
      setErrorMsg(err?.message ?? 'Erro ao remover nota.');
    }
  }

  // --------------------
  // Team CRUD
  // --------------------
  async function addTeamMember() {
    const { name, phone, address, role } = newTeamMember;
    if (!name.trim() || !eventId) return;

    try {
      const res = await supabase
        .from(T_TEAM)
        .insert({
          event_id: eventId,
          name: name.trim(),
          phone: phone.trim() || null,
          address: address.trim() || null,
          role: role.trim() || 'Cerimonialista',
        })
        .select('*')
        .single();

      if (res.error) throw res.error;

      setTeam((prev) => [...prev, res.data as TeamMemberRow]);
      setNewTeamMember({ name: '', phone: '', address: '', role: '' });
    } catch (err: any) {
      setErrorMsg(err?.message ?? 'Erro ao adicionar membro da equipe.');
    }
  }

  async function deleteTeamMember(id: string) {
    try {
      const res = await supabase.from(T_TEAM).delete().eq('id', id);
      if (res.error) throw res.error;

      setTeam((prev) => prev.filter((x) => x.id !== id));
    } catch (err: any) {
      setErrorMsg(err?.message ?? 'Erro ao remover membro da equipe.');
    }
  }

  // --------------------
  // Tables CRUD
  // --------------------

  async function addTable() {
    if (!newTable.name.trim() || !eventId) return;
    try {
      const res = await supabase
        .from(T_TABLES)
        .insert({
          event_id: eventId,
          name: newTable.name,
          seats: Number(newTable.seats),
          shape: 'round',
          note: null,
          pos_x: null,
          pos_y: null,
        })
        .select('*')
        .single();
      if (res.error) throw res.error;
      setTables((prev) => [...prev, res.data as TableRow]);
      setNewTable({ name: '', seats: 8 });
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  }

  async function deleteTable(id: string) {
    try {
      // Primeiro, remova os convidados da mesa (set table_id = null)
      await supabase
        .from(T_GUESTS)
        .update({ table_id: null })
        .eq('table_id', id);

      const res = await supabase.from(T_TABLES).delete().eq('id', id);
      if (res.error) throw res.error;

      setTables((prev) => prev.filter((t) => t.id !== id));
      // Atualiza localmente os convidados que estavam nessa mesa
      setGuests((prev) =>
        prev.map((g) => (g.table_id === id ? { ...g, table_id: null } : g))
      );
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  }

  async function assignGuestToTable(guestId: string, tableId: string | null) {
    try {
      const res = await supabase
        .from(T_GUESTS)
        .update({ table_id: tableId })
        .eq('id', guestId);
      if (res.error) throw res.error;

      setGuests((prev) =>
        prev.map((g) => (g.id === guestId ? { ...g, table_id: tableId } : g))
      );
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  }
  // --------------------
  // UI (trechos relevantes)
  // --------------------
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50">
        <div className="max-w-7xl mx-auto px-4 py-10 text-gray-700">
          Carregando...
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50">
        <div className="max-w-7xl mx-auto px-4 py-10 text-gray-700">
          Evento não encontrado.
          {errorMsg ? (
            <div className="mt-4 text-red-700">{errorMsg}</div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <Link
              to="/dashboard"
              className="p-2 hover:bg-white rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </Link>

            {/* Avatar com foto */}
            <div className="relative group">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-400 to-purple-400 flex items-center justify-center text-white text-2xl font-bold overflow-hidden">
                {event.couple_photo_url ? (
                  <img
                    src={event.couple_photo_url}
                    alt="Casal"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Users className="w-8 h-8" />
                )}
              </div>
              <button
                onClick={() => photoInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
              >
                {uploadingPhoto ? '...' : <Camera className="w-5 h-5" />}
              </button>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadPhoto(f);
                  e.currentTarget.value = '';
                }}
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                {displayName}
              </h1>
              <div className="text-sm text-gray-600 flex flex-wrap gap-3 mt-1">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {event.event_date
                    ? new Date(event.event_date).toLocaleDateString('pt-BR')
                    : 'Sem data'}
                </span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {event.location || 'Sem local'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to={`/dashboard/eventos/${event.id}/torre`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg shadow-lg hover:bg-red-700 transition-all animate-pulse"
              title="Abrir Torre de Controle"
            >
              <Rocket className="w-4 h-4" />
              Torre de Controle
            </Link>
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg hover:shadow-lg transition-all"
            >
              <Edit2 className="w-4 h-4" />
              Editar
            </button>
          </div>
        </div>

        {/* Alertas */}
        {alerts.length > 0 && (
          <div className="mb-6 space-y-2">
            {alerts.map((alert, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-lg flex items-center gap-3 ${
                  alert.type === 'error'
                    ? 'bg-red-50 border border-red-200 text-red-700'
                    : alert.type === 'warning'
                      ? 'bg-orange-50 border border-orange-200 text-orange-700'
                      : 'bg-blue-50 border border-blue-200 text-blue-700'
                }`}
              >
                <Bell className="w-5 h-5" />
                <span>{alert.message}</span>
              </div>
            ))}
          </div>
        )}

        {/* Erro */}
        {errorMsg && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {errorMsg}
          </div>
        )}

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-pink-500">
            <div className="flex items-center justify-between">
              <p className="text-gray-600 text-sm">Contagem</p>
              <Clock className="w-6 h-6 text-pink-500" />
            </div>
            <p className="text-2xl font-bold text-gray-800 mt-2">
              {event.event_date
                ? daysRemaining <= 0
                  ? 'Hoje'
                  : `${daysRemaining} dias`
                : '-'}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-yellow-500">
            <div className="flex items-center justify-between">
              <p className="text-gray-600 text-sm">Orçamento</p>
              <div className="flex items-center gap-2">
                {!isBudgetCardEditing && (
                  <button
                    type="button"
                    onClick={() => setIsBudgetCardEditing(true)}
                    className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500"
                    title="Editar orçamento total"
                    disabled={savingBudgetCard}
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
                <DollarSign className="w-6 h-6 text-yellow-500" />
              </div>
            </div>
            {isBudgetCardEditing ? (
              <div className="mt-2 space-y-2">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={budgetCardDraft}
                  onChange={(e) => setBudgetCardDraft(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  placeholder="Orçamento total"
                  disabled={savingBudgetCard}
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setBudgetCardDraft(String(budgetTotal));
                      setIsBudgetCardEditing(false);
                    }}
                    className="px-3 py-1.5 rounded-lg text-gray-700 hover:bg-gray-100 text-sm"
                    disabled={savingBudgetCard}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={saveBudgetFromCard}
                    className="px-3 py-1.5 rounded-lg bg-yellow-500 text-white hover:bg-yellow-600 text-sm disabled:opacity-60"
                    disabled={savingBudgetCard}
                  >
                    {savingBudgetCard ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-lg font-bold text-gray-800 mt-2">
                {toBRL(budgetTotal)}
              </p>
            )}
            <p className="text-sm text-gray-600 mt-1">Gasto: {toBRL(totalSpent)}</p>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div
                className="bg-yellow-500 h-2 rounded-full"
                style={{ width: `${budgetProgress}%` }}
              />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <p className="text-gray-600 text-sm">Tarefas</p>
              <CheckSquare className="w-6 h-6 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-gray-800 mt-2">
              {completedTasks}/{tasks.length}
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div
                className="bg-blue-500 h-2 rounded-full"
                style={{ width: `${tasksProgress}%` }}
              />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <p className="text-gray-600 text-sm">Convidados</p>
              <Users className="w-6 h-6 text-green-500" />
            </div>
            <p className="text-2xl font-bold text-gray-800 mt-2">
              {confirmedGuests}/{guests.length}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {(
            [
              'overview',
              'tasks',
              'budget',
              'guests',
              'timeline',
              'vendors',
              'documents',
              'notes',
              'team',
              'tables',
              'invites',
            ] as Tab[]
          ).map((t) => (
            <button
              key={t}
              onClick={() => {
                setActiveTab(t);
                if (t !== 'budget') setBudgetVendorFilterId(null);
                if (t !== 'documents') {
                  setDocumentsVendorFilterId(null);
                  setDocumentsReceiptFilterId(null);
                }
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === t
                  ? 'bg-white shadow-sm text-pink-600'
                  : 'text-gray-600 hover:bg-white/60'
              }`}
            >
              {t === 'overview' && 'Visão geral'}
              {t === 'tasks' && 'Checklist'}
              {t === 'budget' && 'Financeiro'}
              {t === 'guests' && 'Convidados'}
              {t === 'timeline' && 'Cronograma'}
              {t === 'vendors' && 'Fornecedores'}
              {t === 'documents' && 'Documentos'}
              {t === 'notes' && 'Notas'}
              {t === 'team' && 'Equipe'}
              {t === 'tables' && 'Mapa de Mesas'}
              {t === 'invites' && 'Convites'}
            </button>
          ))}
        </div>

        {/* Conteúdo */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Gráfico de despesas */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-baseline justify-between mb-3">
                <h2 className="text-lg font-bold text-gray-800">
                  Gastos por categoria
                </h2>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Total gasto</p>
                  <p className="text-lg font-bold text-gray-800">
                    {toBRL(totalSpent)}
                  </p>
                </div>
              </div>

              {expensesForCharts.length > 0 ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expensesForCharts}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={100}
                      >
                        {expensesForCharts.map((e, idx) => (
                          <Cell
                            key={e.id}
                            fill={e.color || COLORS[idx % COLORS.length]}
                          />
                        ))}
                        <Label
                          value={toBRL(totalSpent)}
                          position="center"
                          className="text-lg font-bold fill-gray-800"
                        />
                      </Pie>
                      <Tooltip formatter={(v: any) => toBRL(Number(v || 0))} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-gray-600 py-10 text-center">
                  Sem despesas ainda - adicione na aba Financeiro.
                </p>
              )}
            </div>

            {/* Gráfico de pagamentos por método */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-baseline justify-between mb-3">
                <h2 className="text-lg font-bold text-gray-800">
                  Gastos por método de pagamento
                </h2>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Total pago</p>
                  <p className="text-lg font-bold text-gray-800">
                    {toBRL(
                      paymentsByMethod.reduce(
                        (acc, curr) => acc + Number(curr.value || 0),
                        0
                      )
                    )}
                  </p>
                </div>
              </div>

              {paymentsByMethod.length > 0 ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paymentsByMethod}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={100}
                      >
                        {paymentsByMethod.map((m, idx) => (
                          <Cell
                            key={m.id}
                            fill={m.color || COLORS[idx % COLORS.length]}
                          />
                        ))}
                        <Label
                          value={toBRL(
                            paymentsByMethod.reduce(
                              (acc, curr) => acc + Number(curr.value || 0),
                              0
                            )
                          )}
                          position="center"
                          className="text-lg font-bold fill-gray-800"
                        />
                      </Pie>
                      <Tooltip formatter={(v: any) => toBRL(Number(v || 0))} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-gray-600 py-10 text-center">
                  Sem pagamentos ainda - registre na aba Financeiro.
                </p>
              )}
            </div>

            {/* Tarefas pendentes */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-baseline justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-800">
                  Tarefas pendentes
                </h3>
                <span className="text-sm text-gray-600">
                  {pendingTasks.length} de {tasks.length}
                </span>
              </div>

              <div className="space-y-4 max-h-96 overflow-y-auto">
                {overdueTasks.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="w-4 h-4 text-red-600" />
                      <h4 className="text-sm font-semibold text-red-600">
                        Atrasadas ({overdueTasks.length})
                      </h4>
                    </div>
                    {overdueTasks.slice(0, 3).map((t) => (
                      <TaskCard key={t.id} task={t} onToggle={toggleTask} />
                    ))}
                  </div>
                )}

                {todayTasks.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4 text-orange-600" />
                      <h4 className="text-sm font-semibold text-orange-600">
                        Hoje ({todayTasks.length})
                      </h4>
                    </div>
                    {todayTasks.slice(0, 3).map((t) => (
                      <TaskCard key={t.id} task={t} onToggle={toggleTask} />
                    ))}
                  </div>
                )}

                {thisWeekTasks.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      <h4 className="text-sm font-semibold text-blue-600">
                        Esta semana ({thisWeekTasks.length})
                      </h4>
                    </div>
                    {thisWeekTasks.slice(0, 3).map((t) => (
                      <TaskCard key={t.id} task={t} onToggle={toggleTask} />
                    ))}
                  </div>
                )}

                {futureTasks.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-600 mb-2">
                      Futuro ({futureTasks.length})
                    </h4>
                    {futureTasks.slice(0, 2).map((t) => (
                      <TaskCard key={t.id} task={t} onToggle={toggleTask} />
                    ))}
                  </div>
                )}

                {pendingTasks.length === 0 && (
                  <p className="text-gray-600 text-center py-10">
                    Nenhuma tarefa pendente! ðŸŽ‰
                  </p>
                )}
              </div>

              <button
                onClick={() => setActiveTab('tasks')}
                className="w-full mt-4 px-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Ver checklist completo
              </button>
            </div>
          </div>
        )}

        {activeTab === 'tasks' && (
          <TasksTab
            tasks={tasks}
            newTaskText={newTaskText}
            setNewTaskText={setNewTaskText}
            newTaskDueDate={newTaskDueDate}
            setNewTaskDueDate={setNewTaskDueDate}
            newTaskPriority={newTaskPriority as any}
            setNewTaskPriority={setNewTaskPriority as any}
            newTaskAssignee={newTaskAssignee}
            setNewTaskAssignee={setNewTaskAssignee}
            addTask={addTask}
            toggleTask={toggleTask}
            deleteTask={deleteTask}
            updateTaskPriority={updateTaskPriority}
            onTaskDragStart={onTaskDragStart}
            onTaskDragOver={onTaskDragOver}
            onTaskDragEnd={onTaskDragEnd}
            formatDate={formatDate}
            isOverdue={isOverdue}
            priorityConfig={PRIORITY_CONFIG}
          />
        )}

        {/* ✅ AQUI está o essencial: Budget/Vendors com props novas */}
        {activeTab === 'budget' && (
          <BudgetTab
            vendors={vendors}
            expenses={expenses}
            setExpenses={setExpenses}
            payments={payments}
            documents={documents}
            newExpense={newExpense}
            setNewExpense={setNewExpense}
            addExpense={addExpense}
            updateExpense={updateExpense}
            deleteExpense={deleteExpense}
            addPayment={addPayment}
            deletePayment={deletePayment}
            linkPaymentReceiptDocument={linkPaymentReceiptDocument}
            goToDocument={goToDocumentById}
            totalSpent={totalSpent}
            toBRL={toBRL}
            vendorFilterId={budgetVendorFilterId}
            onClearVendorFilter={clearBudgetVendorFilter}
            isBusy={isAddingExpense}
            busyText="Salvando no Supabase..."
          />
        )}

        {activeTab === 'vendors' && (
          <VendorsTab
            newVendor={newVendor}
            setNewVendor={setNewVendor}
            onAdd={addVendor}
            vendors={vendors}
            expenses={expenses}
            payments={payments}
            onStatusChange={updateVendorStatus}
            onDelete={deleteVendor}
            onGoToVendorExpenses={goToBudgetFilteredByVendor}
            onGoToVendorDocuments={goToDocumentsFilteredByVendor}
            paymentReceiptCountByVendor={paymentReceiptCountByVendor}
          />
        )}

        {activeTab === 'guests' && (
          <GuestsTab
            newGuest={newGuest}
            setNewGuest={setNewGuest}
            addGuest={addGuest}
            guests={guests}
            toggleGuest={toggleGuest}
            deleteGuest={deleteGuest}
            fileInputRef={fileInputRef}
            importCSV={importCSV}
          />
        )}

        {activeTab === 'timeline' && (
          <TimelineTab
            newTimelineItem={newTimelineItem}
            setNewTimelineItem={setNewTimelineItem}
            onAdd={addTimelineItem}
            timeline={timeline}
            onDelete={deleteTimelineItem}
          />
        )}

        {activeTab === 'documents' && (
          <DocumentsTab
            docInputRef={docInputRef}
            uploadingDoc={uploadingDoc}
            onPickFile={uploadDocument}
            documents={documents}
            onDelete={deleteDocument}
            vendors={vendors}
            onUpdateDocument={updateDocument}
            vendorFilterId={documentsVendorFilterId}
            onClearVendorFilter={() => setDocumentsVendorFilterId(null)}
            paymentReceiptDocumentId={documentsReceiptFilterId}
            onClearPaymentReceiptFilter={() =>
              setDocumentsReceiptFilterId(null)
            }
          />
        )}

        {activeTab === 'notes' && (
          <NotesTab
            newNote={newNote}
            setNewNote={setNewNote}
            onAdd={addNote}
            notes={notes}
            onDelete={deleteNote}
          />
        )}

        {activeTab === 'team' && (
          <TeamTab
            newTeamMember={newTeamMember}
            setNewTeamMember={setNewTeamMember}
            onAdd={addTeamMember}
            team={team}
            onDelete={deleteTeamMember}
          />
        )}

        {activeTab === 'tables' && (
          <TablesTab
            eventId={eventId}
            tableViewMode={tableViewMode}
            setTableViewMode={setTableViewMode}
            tables={tables}
            setTables={setTables}
            guests={guests}
            newTable={newTable}
            setNewTable={setNewTable}
            addTable={addTable}
            deleteTable={deleteTable}
            assignGuestToTable={assignGuestToTable}
            saveTableNote={saveTableNote}
            onPersistPosition={persistTablePosition}
          />
        )}

        {activeTab === 'invites' && event && (
          <InvitesTab event={event} guests={guests} />
        )}

        {/* Modal: editar básicos */}
        {isEditModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden">
              <div className="flex items-center justify-between p-5 border-b">
                <h2 className="text-xl font-bold text-gray-800">
                  Editar evento
                </h2>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 max-h-[70vh] overflow-y-auto">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome do casal
                    </label>
                    <input
                      value={event.couple ?? ''}
                      onChange={(e) =>
                        setEvent((p) =>
                          p ? { ...p, couple: e.target.value } : p
                        )
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                      placeholder="Ex: Carla & João"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Data do evento
                      </label>
                      <input
                        type="date"
                        value={event.event_date ?? ''}
                        onChange={(e) =>
                          setEvent((p) =>
                            p ? { ...p, event_date: e.target.value } : p
                          )
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Convidados planejados
                      </label>
                      <input
                        type="number"
                        value={Number(event.guests_planned || 0)}
                        onChange={(e) =>
                          setEvent((p) =>
                            p
                              ? {
                                  ...p,
                                  guests_planned: Number(e.target.value) || 0,
                                }
                              : p
                          )
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Local
                    </label>
                    <input
                      value={event.location ?? ''}
                      onChange={(e) =>
                        setEvent((p) =>
                          p ? { ...p, location: e.target.value } : p
                        )
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                      placeholder="Ex: Espaço Villa Lobos - SP"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Orçamento total
                    </label>
                    <input
                      type="number"
                      value={Number(event.budget_total || 0)}
                      onChange={(e) =>
                        setEvent((p) =>
                          p
                            ? {
                                ...p,
                                budget_total: Number(e.target.value) || 0,
                              }
                            : p
                        )
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                      placeholder="Ex: 80000"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 p-5 border-t">
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveBasics}
                  disabled={savingBasics}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-pink-500 to-purple-500 text-white disabled:opacity-60"
                >
                  {savingBasics ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Componente auxiliar: card de tarefa
function TaskCard({
  task,
  onToggle,
}: {
  task: TaskRow;
  onToggle: (id: string) => void;
}) {
  const priorityConfig = task.priority ? PRIORITY_CONFIG[task.priority] : null;
  const Icon = priorityConfig?.icon;

  return (
    <button
      onClick={() => onToggle(task.id)}
      className="w-full text-left flex items-start gap-3 p-3 mb-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition"
    >
      <input
        type="checkbox"
        checked={task.completed}
        readOnly
        className="w-5 h-5 mt-0.5"
      />
      <div className="flex-1 min-w-0">
        <p className="text-gray-800 text-sm line-clamp-2">{task.text}</p>
        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
          {task.due_date && (
            <span
              className={`inline-flex items-center gap-1 ${
                isOverdue(task.due_date) ? 'text-red-600 font-medium' : ''
              }`}
            >
              <Calendar className="w-3 h-3" />
              {formatDate(task.due_date)}
            </span>
          )}
          {priorityConfig && task.priority !== 'normal' && (
            <span
              className={`inline-flex items-center gap-1 ${priorityConfig.color}`}
            >
              {Icon && <Icon className="w-3 h-3" />}
              {priorityConfig.label}
            </span>
          )}
          {task.assignee_name && (
            <span className="truncate">→ {task.assignee_name}</span>
          )}
        </div>
      </div>
    </button>
  );
}

