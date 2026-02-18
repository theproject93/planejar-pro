import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  BadgeCheck,
  Calendar,
  Crown,
  FileText,
  HandCoins,
  Loader2,
  PiggyBank,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

type FinanceEntry = {
  id: string;
  user_id: string;
  client_name: string | null;
  title: string;
  amount: number;
  status: 'pendente' | 'confirmado' | 'pago' | 'parcelado' | 'previsto';
  received_at: string | null;
  expected_at: string | null;
  payment_method: string | null;
  proof_url: string | null;
  notes: string | null;
  created_at?: string | null;
};

type FinanceExpense = {
  id: string;
  user_id: string;
  title: string;
  amount: number;
  status: 'pendente' | 'confirmado' | 'pago' | 'parcelado' | 'previsto';
  paid_at: string | null;
  expected_at: string | null;
  category_id: string | null;
  category_label: string | null;
  team_member_name: string | null;
  team_member_role: string | null;
  reason: string | null;
  payment_method: string | null;
  proof_url: string | null;
  notes: string | null;
  created_at?: string | null;
  user_finance_categories?: {
    name: string;
    color: string | null;
  } | null;
};

type FinanceCategory = {
  id: string;
  user_id: string;
  name: string;
  type: 'entrada' | 'saida';
  color: string | null;
};

type TeamRankingRow = {
  name: string;
  role: string | null;
  events: number;
  score: number;
};

const currency = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const RECEIVED_STATUSES = new Set(['confirmado', 'pago', 'parcelado']);
const PLANNED_STATUSES = new Set(['pendente', 'previsto', 'parcelado']);

const CATEGORY_FALLBACK_COLORS = ['#C9A46E', '#1F2937', '#9CA3AF', '#6B7280'];

function parseDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatShortDate(value: string | null | undefined) {
  const date = parseDate(value);
  if (!date) return '';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(date: Date) {
  return date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
}

export function FinanceiroPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<FinanceEntry[]>([]);
  const [expenses, setExpenses] = useState<FinanceExpense[]>([]);
  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [teamRanking, setTeamRanking] = useState<TeamRankingRow[]>([]);
  const [teamMembers, setTeamMembers] = useState<
    { name: string; role: string | null }[]
  >([]);
  const [baseBalance, setBaseBalance] = useState(0);
  const [formTab, setFormTab] = useState<'entradas' | 'saidas'>('saidas');
  const [entryForm, setEntryForm] = useState({
    title: '',
    client_name: '',
    amount: '',
    status: 'confirmado' as FinanceEntry['status'],
    date: '',
    payment_method: '',
    notes: '',
  });
  const [expenseForm, setExpenseForm] = useState({
    title: '',
    amount: '',
    status: 'pendente' as FinanceExpense['status'],
    date: '',
    category_id: '',
    team_member_name: '',
    payment_method: '',
    notes: '',
  });
  const [entryProof, setEntryProof] = useState<File | null>(null);
  const [expenseProof, setExpenseProof] = useState<File | null>(null);
  const [savingEntry, setSavingEntry] = useState(false);
  const [savingExpense, setSavingExpense] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [openingProofId, setOpeningProofId] = useState<string | null>(null);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState<'cash' | 'events'>('cash');
  const [cashInput, setCashInput] = useState('0');
  const [eventsCount, setEventsCount] = useState(0);
  const [isSyncingEvents, setIsSyncingEvents] = useState(false);

  const SELF_VENDOR_CATEGORY = 'Assessoria/Cerimonialista';

  function getSelfVendorName(email?: string | null) {
    if (!email) return 'Assessoria/Cerimonialista';
    return email.split('@')[0] || 'Assessoria/Cerimonialista';
  }

  const loadFinance = async () => {
    if (!user) return;
    setLoading(true);

    const onboardingRes = await supabase
      .from('user_finance_onboarding')
      .select('completed_at')
      .eq('user_id', user.id)
      .maybeSingle();

    const balanceRes = await supabase
      .from('user_finance_balance')
      .select('base_balance')
      .eq('user_id', user.id)
      .maybeSingle();

    const eventsRes = await supabase
      .from('events')
      .select('id')
      .eq('user_id', user.id);

    const eventIds = (eventsRes.data ?? []).map((row) => row.id);
    setEventsCount(eventIds.length);
    let teamData: { name: string | null; role: string | null }[] = [];

    if (eventIds.length > 0) {
      const teamRes = await supabase
        .from('event_team_members')
        .select('name, role')
        .in('event_id', eventIds);
      teamData = (teamRes.data ?? []) as {
        name: string | null;
        role: string | null;
      }[];
    }

    if (eventIds.length > 0) {
      await ensureSelfVendors(eventIds);
      await syncAssessoriaEntries(eventIds);
    }

    const entriesRes = await supabase
      .from('user_finance_entries')
      .select('*')
      .eq('user_id', user.id)
      .order('received_at', { ascending: false, nullsFirst: false });

    const expensesRes = await supabase
      .from('user_finance_expenses')
      .select('*, user_finance_categories(name, color)')
      .eq('user_id', user.id)
      .order('paid_at', { ascending: false, nullsFirst: false });

    const categoriesRes = await supabase
      .from('user_finance_categories')
      .select('*')
      .eq('user_id', user.id);

    if (!entriesRes.error) setEntries(entriesRes.data ?? []);
    if (!expensesRes.error) setExpenses(expensesRes.data ?? []);
    if (!categoriesRes.error) setCategories(categoriesRes.data ?? []);
      if (!balanceRes.error && balanceRes.data?.base_balance != null) {
        const balanceValue = Number(balanceRes.data.base_balance) || 0;
        setBaseBalance(balanceValue);
      }

    const memberMap = new Map<string, { name: string; role: string | null }>();
    const rankingMap = new Map<
      string,
      { name: string; role: string | null; events: number }
    >();
    teamData.forEach((member) => {
      const name = (member.name ?? '').trim();
      if (!name) return;
      const role = (member.role ?? '').trim() || null;
      const key = `${name}::${role ?? ''}`;
      if (!memberMap.has(key)) {
        memberMap.set(key, { name, role });
      }
      const existing = rankingMap.get(key);
      if (existing) {
        existing.events += 1;
      } else {
        rankingMap.set(key, { name, role, events: 1 });
      }
    });

    setTeamMembers(Array.from(memberMap.values()));

    const ranked = Array.from(rankingMap.values())
      .sort((a, b) => b.events - a.events)
      .slice(0, 6)
      .map((item, index) => ({
        ...item,
        score: Math.min(99, 70 + item.events * 3 - index),
      }));

    setTeamRanking(ranked);
    setLoading(false);

    const completed = !!onboardingRes.data?.completed_at;
    if (!completed) {
      setCashInput(String(balanceRes.data?.base_balance ?? 0));
      setOnboardingOpen(true);
      setOnboardingStep('cash');
    }
  };

  useEffect(() => {
    loadFinance();
  }, [user]);

  async function markOnboardingComplete() {
    if (!user) return;
    await supabase.from('user_finance_onboarding').upsert({
      user_id: user.id,
      completed_at: new Date().toISOString(),
    });
    setOnboardingOpen(false);
  }

  async function handleSaveInitialCash() {
    if (!user) return;
    const value = Number(cashInput.replace(',', '.')) || 0;
    await supabase.from('user_finance_balance').upsert({
      user_id: user.id,
      base_balance: value,
      updated_at: new Date().toISOString(),
    });
    setBaseBalance(value);
    setOnboardingStep('events');
  }

  async function ensureSelfVendors(eventIds: string[]) {
    if (!user || eventIds.length === 0) return;
    const { data: vendors } = await supabase
      .from('event_vendors')
      .select('id,event_id,category,name')
      .in('event_id', eventIds);

    const existingByEvent = new Map<string, boolean>();
    (vendors ?? []).forEach((vendor) => {
      const isSelf =
        vendor.category === SELF_VENDOR_CATEGORY ||
        vendor.name === getSelfVendorName(user.email);
      if (isSelf) {
        existingByEvent.set(vendor.event_id, true);
      }
    });

    const toInsert = eventIds
      .filter((eventId) => !existingByEvent.has(eventId))
      .map((eventId) => ({
        event_id: eventId,
        name: getSelfVendorName(user.email),
        category: SELF_VENDOR_CATEGORY,
        status: 'confirmed',
      }));

    if (toInsert.length > 0) {
      await supabase.from('event_vendors').insert(toInsert);
    }
  }

  async function syncAssessoriaEntries(eventIds: string[]) {
    if (!user || eventIds.length === 0) return;

    const { data: vendors } = await supabase
      .from('event_vendors')
      .select('id,event_id,category,name')
      .in('event_id', eventIds);

    const selfVendorIds = (vendors ?? [])
      .filter(
        (vendor) =>
          vendor.category === SELF_VENDOR_CATEGORY ||
          vendor.name === getSelfVendorName(user.email)
      )
      .map((vendor) => vendor.id);

    if (selfVendorIds.length === 0) return;

    const { data: expensesData } = await supabase
      .from('event_expenses')
      .select('id,event_id,name,value,vendor_id, events(name,event_date,user_id)')
      .in('vendor_id', selfVendorIds);

    const entriesPayload =
      (expensesData ?? [])
        .filter((row) => row.events?.user_id === user.id)
        .map((row) => ({
          user_id: user.id,
          title: `Assessoria • ${row.events?.name ?? row.name ?? 'Evento'}`,
          client_name: row.events?.name ?? null,
          amount: Number(row.value) || 0,
          status: 'previsto' as const,
          expected_at: row.events?.event_date ?? null,
          payment_method: 'transferencia',
          notes: 'Receita prevista do seu evento.',
          source_event_id: row.event_id,
          source_vendor_id: row.vendor_id,
          source_expense_id: row.id,
        }))
        .filter((item) => Number(item.amount) > 0) ?? [];

    if (entriesPayload.length === 0) return;

    await supabase
      .from('user_finance_entries')
      .upsert(entriesPayload, { onConflict: 'source_expense_id' });
  }

  async function uploadProof(file: File, kind: 'entries' | 'expenses') {
    if (!user) return null;
    const path = `${user.id}/${kind}/${Date.now()}-${file.name}`;
    const uploadRes = await supabase.storage
      .from('finance-proofs')
      .upload(path, file);
    if (uploadRes.error) throw uploadRes.error;
    return path;
  }

  async function openProof(proofUrl: string, id: string) {
    setOpeningProofId(id);
    setActionError(null);
    try {
      let objectPath = proofUrl;
      if (proofUrl.startsWith('http')) {
        const parsed = new URL(proofUrl);
        const match = parsed.pathname.split('/finance-proofs/')[1];
        objectPath = match ?? '';
      }
      if (!objectPath) {
        window.open(proofUrl, '_blank', 'noopener');
        return;
      }
      const { data, error } = await supabase.storage
        .from('finance-proofs')
        .createSignedUrl(objectPath, 60 * 5);
      if (error || !data?.signedUrl) {
        throw error ?? new Error('Sem URL assinada');
      }
      window.open(data.signedUrl, '_blank', 'noopener');
    } catch (err) {
      setActionError('Nao foi possivel abrir o comprovante.');
    } finally {
      setOpeningProofId(null);
    }
  }


  async function handleCreateEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSavingEntry(true);
    setActionError(null);
    try {
      let proofUrl: string | null = null;
      if (entryProof) {
        proofUrl = await uploadProof(entryProof, 'entries');
      }

      const isPlanned = entryForm.status === 'pendente' || entryForm.status === 'previsto';
      const payload = {
        user_id: user.id,
        title: entryForm.title.trim(),
        client_name: entryForm.client_name.trim() || null,
        amount: Number(entryForm.amount.replace(',', '.')) || 0,
        status: entryForm.status,
        received_at: isPlanned ? null : entryForm.date || null,
        expected_at: isPlanned ? entryForm.date || null : null,
        payment_method: entryForm.payment_method.trim() || null,
        notes: entryForm.notes.trim() || null,
        proof_url: proofUrl,
      };

      const res = await supabase.from('user_finance_entries').insert(payload).select('*');
      if (res.error) throw res.error;
      setEntryForm({
        title: '',
        client_name: '',
        amount: '',
        status: 'confirmado',
        date: '',
        payment_method: '',
        notes: '',
      });
      setEntryProof(null);
      await loadFinance();
    } catch (err) {
      setActionError('Nao foi possivel salvar a entrada.');
    } finally {
      setSavingEntry(false);
    }
  }

  async function handleCreateExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSavingExpense(true);
    setActionError(null);
    try {
      let proofUrl: string | null = null;
      if (expenseProof) {
        proofUrl = await uploadProof(expenseProof, 'expenses');
      }

      const isPlanned = expenseForm.status === 'pendente' || expenseForm.status === 'previsto';
      const payload = {
        user_id: user.id,
        title: expenseForm.title.trim(),
        amount: Number(expenseForm.amount.replace(',', '.')) || 0,
        status: expenseForm.status,
        paid_at: isPlanned ? null : expenseForm.date || null,
        expected_at: isPlanned ? expenseForm.date || null : null,
        category_id: expenseForm.category_id || null,
        category_label: null,
        team_member_name: expenseForm.team_member_name.trim() || null,
        team_member_role:
          teamMembers.find((member) => member.name === expenseForm.team_member_name)
            ?.role ?? null,
        payment_method: expenseForm.payment_method.trim() || null,
        notes: expenseForm.notes.trim() || null,
        proof_url: proofUrl,
      };

      const res = await supabase.from('user_finance_expenses').insert(payload).select('*');
      if (res.error) throw res.error;
      setExpenseForm({
        title: '',
        amount: '',
        status: 'pendente',
        date: '',
        category_id: '',
        team_member_name: '',
        payment_method: '',
        notes: '',
      });
      setExpenseProof(null);
      await loadFinance();
    } catch (err) {
      setActionError('Nao foi possivel salvar a saida.');
    } finally {
      setSavingExpense(false);
    }
  }

  const cashflowSeries = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, idx) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - idx), 1);
      return {
        key: monthKey(date),
        name: monthLabel(date),
        entradas: 0,
        saidas: 0,
        saldo: 0,
      };
    });
    const monthIndex = new Map(months.map((m, index) => [m.key, index]));

    entries.forEach((entry) => {
      const date = parseDate(entry.received_at ?? entry.expected_at);
      if (!date) return;
      const key = monthKey(date);
      const idx = monthIndex.get(key);
      if (idx === undefined) return;
      months[idx].entradas += Number(entry.amount) || 0;
    });

    expenses.forEach((expense) => {
      const date = parseDate(expense.paid_at ?? expense.expected_at);
      if (!date) return;
      const key = monthKey(date);
      const idx = monthIndex.get(key);
      if (idx === undefined) return;
      months[idx].saidas += Number(expense.amount) || 0;
    });

    months.forEach((month) => {
      month.saldo = month.entradas - month.saidas;
    });

    return months;
  }, [entries, expenses]);

  const paymentSchedule = useMemo(() => {
    const upcoming = new Map<string, { name: string; recebido: number; previsto: number }>();
    const today = new Date();
    const end = new Date(today.getTime() + 21 * 24 * 60 * 60 * 1000);

    entries.forEach((entry) => {
      const date = parseDate(entry.expected_at ?? entry.received_at);
      if (!date) return;
      if (date < today || date > end) return;
      const key = date.toISOString().slice(0, 10);
      const label = formatShortDate(key);
      if (!upcoming.has(key)) {
        upcoming.set(key, { name: label, recebido: 0, previsto: 0 });
      }
      const row = upcoming.get(key)!;
      const amount = Number(entry.amount) || 0;
      if (RECEIVED_STATUSES.has(entry.status)) {
        row.recebido += amount;
      } else {
        row.previsto += amount;
      }
    });

    return Array.from(upcoming.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(0, 6)
      .map(([, row]) => row);
  }, [entries]);

  const categorySplit = useMemo(() => {
    const categoryMap = new Map<string, { name: string; value: number }>();
    expenses.forEach((expense) => {
      const label =
        expense.category_label ||
        expense.user_finance_categories?.name ||
        'Outros';
      const amount = Number(expense.amount) || 0;
      const existing = categoryMap.get(label);
      if (existing) {
        existing.value += amount;
      } else {
        categoryMap.set(label, { name: label, value: amount });
      }
    });

    const total = Array.from(categoryMap.values()).reduce(
      (acc, item) => acc + item.value,
      0
    );
    if (total <= 0) return [];

    return Array.from(categoryMap.values())
      .map((item) => ({
        name: item.name,
        value: Math.round((item.value / total) * 100),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [expenses]);

  const transactions = useMemo(() => {
    const rows = [
      ...entries.map((entry) => ({
        id: entry.id,
        type: 'Entrada' as const,
        title: entry.title,
        date: entry.received_at ?? entry.expected_at ?? entry.created_at ?? null,
        sortKey: entry.created_at ?? entry.received_at ?? entry.expected_at ?? null,
        amount: Number(entry.amount) || 0,
        status: entry.status,
        proof_url: entry.proof_url,
      })),
      ...expenses.map((expense) => ({
        id: expense.id,
        type: 'Saida' as const,
        title: expense.title,
        date: expense.paid_at ?? expense.expected_at ?? expense.created_at ?? null,
        sortKey: expense.created_at ?? expense.paid_at ?? expense.expected_at ?? null,
        amount: -(Number(expense.amount) || 0),
        status: expense.status,
        proof_url: expense.proof_url,
      })),
    ];
    return rows
      .filter((row) => row.date || row.sortKey)
      .sort((a, b) => (b.sortKey ?? b.date ?? '').localeCompare(a.sortKey ?? a.date ?? ''))
      .slice(0, 6);
  }, [entries, expenses]);

  const stats = useMemo(() => {
    const totalEntries = entries.reduce((acc, entry) => acc + (Number(entry.amount) || 0), 0);
    const totalExpenses = expenses.reduce((acc, expense) => acc + (Number(expense.amount) || 0), 0);
    const confirmedEntries = entries
      .filter((entry) => RECEIVED_STATUSES.has(entry.status))
      .reduce((acc, entry) => acc + (Number(entry.amount) || 0), 0);
    const plannedExpenses = expenses
      .filter((expense) => PLANNED_STATUSES.has(expense.status))
      .reduce((acc, expense) => acc + (Number(expense.amount) || 0), 0);

    return {
      balance: baseBalance + totalEntries - totalExpenses,
      confirmedEntries,
      plannedEntries: entries
        .filter((entry) => PLANNED_STATUSES.has(entry.status))
        .reduce((acc, entry) => acc + (Number(entry.amount) || 0), 0),
      plannedExpenses,
    };
  }, [entries, expenses, baseBalance]);

  const insights = useMemo(() => {
    const expectedIn = entries
      .filter((entry) => entry.status === 'previsto' || entry.status === 'pendente')
      .reduce((acc, entry) => acc + (Number(entry.amount) || 0), 0);
    const expectedOut = expenses
      .filter((expense) => expense.status === 'previsto' || expense.status === 'pendente')
      .reduce((acc, expense) => acc + (Number(expense.amount) || 0), 0);

    return [
      {
        title: 'Proximos 21 dias',
        description: `Entradas previstas: ${currency(expectedIn)} | Saidas: ${currency(
          expectedOut
        )}.`,
      },
      {
        title: 'Controle de custos',
        description:
          'Revise pagamentos recorrentes da equipe e categorize cada saida para analisar margens.',
      },
      {
        title: 'Equipe mais ativa',
        description:
          teamRanking.length > 0
            ? `${teamRanking[0].name} lidera com ${teamRanking[0].events} eventos.`
            : 'Sem dados de equipe suficientes para ranquear.',
      },
    ];
  }, [entries, expenses, teamRanking]);

  if (loading) {
    return (
      <div className="p-10 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-gold-500" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-10">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 font-playfair">
            Financeiro Geral
          </h1>
          <p className="text-gray-500 mt-1">
            Visao completa do seu caixa, pagamentos recebidos e despesas da sua
            equipe.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gold-500" />
            Atualizado agora
          </div>
          <button className="px-5 py-2 bg-gold-500 hover:bg-gold-600 text-white font-bold rounded-xl shadow-lg hover:shadow-gold-500/30 transition-all">
            Exportar relatorio
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Saldo em caixa</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {currency(stats.balance)}
              </p>
              <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                Baseado nas ultimas movimentacoes
              </p>
            </div>
            <div className="p-3 rounded-xl bg-gold-50 text-gold-500">
              <Wallet className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Entradas confirmadas</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {currency(stats.confirmedEntries)}
              </p>
              <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                {entries.length} registros no total
              </p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-500">
              <HandCoins className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Entradas programadas</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {currency(stats.plannedEntries)}
              </p>
              <p className="text-xs text-blue-600 mt-2 flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                Previstas e parceladas
              </p>
            </div>
            <div className="p-3 rounded-xl bg-blue-50 text-blue-500">
              <Wallet className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Saidas programadas</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {currency(stats.plannedExpenses)}
              </p>
              <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                <TrendingDown className="w-4 h-4" />
                {expenses.length} despesas registradas
              </p>
            </div>
            <div className="p-3 rounded-xl bg-red-50 text-red-500">
              <PiggyBank className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {onboardingOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className="px-8 py-6 border-b border-gray-100 bg-gray-50">
              <h2 className="text-2xl font-bold text-gray-900 font-playfair">
                Que bom ter voce aqui
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Vamos calibrar seu financeiro para começar certo.
              </p>
            </div>
            <div className="p-8 space-y-6">
              {onboardingStep === 'cash' && (
                <>
                  <div>
                    <p className="text-gray-800 font-semibold">
                      Quanto voce possui em caixa hoje?
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Esse valor ajusta seu saldo inicial no dashboard.
                    </p>
                  </div>
                  <input
                    type="number"
                    value={cashInput}
                    onChange={(e) => setCashInput(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-gold-400 focus:border-transparent outline-none text-lg"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleSaveInitialCash}
                      className="px-6 py-3 bg-gold-500 hover:bg-gold-600 text-white font-bold rounded-xl shadow-lg hover:shadow-gold-500/30 transition-all"
                    >
                      Continuar
                    </button>
                  </div>
                </>
              )}

              {onboardingStep === 'events' && (
                <>
                  {eventsCount === 0 ? (
                    <>
                      <p className="text-gray-800 font-semibold">
                        Vi que voce ainda nao tem nenhum evento cadastrado.
                      </p>
                      <p className="text-sm text-gray-500">
                        Deseja cadastrar seu primeiro evento agora?
                      </p>
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => navigate('/dashboard/eventos')}
                          className="px-6 py-3 bg-gold-500 hover:bg-gold-600 text-white font-bold rounded-xl shadow-lg hover:shadow-gold-500/30 transition-all"
                        >
                          Cadastrar agora
                        </button>
                        <button
                          type="button"
                          onClick={markOnboardingComplete}
                          className="px-6 py-3 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50"
                        >
                          Agora nao
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-gray-800 font-semibold">
                        Vi que voce ja tem eventos cadastrados.
                      </p>
                      <p className="text-sm text-gray-500">
                        Posso contabilizar agora os eventos em que voce e a assessoria?
                      </p>
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={async () => {
                            setIsSyncingEvents(true);
                            await ensureSelfVendors(
                              Array.from(new Set((await supabase
                                .from('events')
                                .select('id')
                                .eq('user_id', user?.id ?? '')
                              ).data?.map((row) => row.id) ?? []))
                            );
                            await syncAssessoriaEntries(
                              Array.from(new Set((await supabase
                                .from('events')
                                .select('id')
                                .eq('user_id', user?.id ?? '')
                              ).data?.map((row) => row.id) ?? []))
                            );
                            await loadFinance();
                            setIsSyncingEvents(false);
                            await markOnboardingComplete();
                          }}
                          disabled={isSyncingEvents}
                          className="px-6 py-3 bg-gold-500 hover:bg-gold-600 text-white font-bold rounded-xl shadow-lg hover:shadow-gold-500/30 transition-all"
                        >
                          {isSyncingEvents ? 'Processando...' : 'Sim, contabilizar'}
                        </button>
                        <button
                          type="button"
                          onClick={markOnboardingComplete}
                          className="px-6 py-3 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50"
                        >
                          Nao agora
                        </button>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mb-8">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Registrar movimentacoes
              </h2>
              <p className="text-sm text-gray-500">
                Adicione entradas ou saidas com comprovantes.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFormTab('entradas')}
                className={`px-4 py-2 rounded-full text-sm font-semibold ${
                  formTab === 'entradas'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                Entradas
              </button>
              <button
                type="button"
                onClick={() => setFormTab('saidas')}
                className={`px-4 py-2 rounded-full text-sm font-semibold ${
                  formTab === 'saidas'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                Saidas
              </button>
            </div>
          </div>

          {formTab === 'entradas' ? (
            <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleCreateEntry}>
              <input
                type="text"
                placeholder="Titulo"
                value={entryForm.title}
                onChange={(e) => setEntryForm((prev) => ({ ...prev, title: e.target.value }))}
                className="px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gold-400 focus:border-transparent outline-none"
                required
              />
              <input
                type="text"
                placeholder="Cliente (opcional)"
                value={entryForm.client_name}
                onChange={(e) => setEntryForm((prev) => ({ ...prev, client_name: e.target.value }))}
                className="px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gold-400 focus:border-transparent outline-none"
              />
              <input
                type="number"
                placeholder="Valor"
                value={entryForm.amount}
                onChange={(e) => setEntryForm((prev) => ({ ...prev, amount: e.target.value }))}
                className="px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gold-400 focus:border-transparent outline-none"
                required
              />
              <select
                value={entryForm.status}
                onChange={(e) => setEntryForm((prev) => ({ ...prev, status: e.target.value as FinanceEntry['status'] }))}
                className="px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gold-400 focus:border-transparent outline-none"
              >
                <option value="confirmado">Confirmado</option>
                <option value="pago">Pago</option>
                <option value="pendente">Pendente</option>
                <option value="previsto">Previsto</option>
                <option value="parcelado">Parcelado</option>
              </select>
              <input
                type="date"
                placeholder="Data"
                value={entryForm.date}
                onChange={(e) =>
                  setEntryForm((prev) => ({ ...prev, date: e.target.value }))
                }
                className="px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gold-400 focus:border-transparent outline-none"
                required
              />
              <input
                type="text"
                placeholder="Metodo de pagamento"
                value={entryForm.payment_method}
                onChange={(e) => setEntryForm((prev) => ({ ...prev, payment_method: e.target.value }))}
                className="px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gold-400 focus:border-transparent outline-none"
              />
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setEntryProof(e.target.files?.[0] ?? null)}
                className="px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gold-400 focus:border-transparent outline-none"
              />
              <textarea
                placeholder="Observacoes"
                value={entryForm.notes}
                onChange={(e) => setEntryForm((prev) => ({ ...prev, notes: e.target.value }))}
                className="md:col-span-2 px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gold-400 focus:border-transparent outline-none"
              />
              <button
                type="submit"
                disabled={savingEntry}
                className="md:col-span-2 px-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-lg hover:shadow-emerald-500/30 transition-all"
              >
                {savingEntry ? 'Salvando...' : 'Salvar entrada'}
              </button>
            </form>
          ) : (
            <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleCreateExpense}>
              <input
                type="text"
                placeholder="Titulo"
                value={expenseForm.title}
                onChange={(e) => setExpenseForm((prev) => ({ ...prev, title: e.target.value }))}
                className="px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gold-400 focus:border-transparent outline-none"
                required
              />
              <input
                type="number"
                placeholder="Valor"
                value={expenseForm.amount}
                onChange={(e) => setExpenseForm((prev) => ({ ...prev, amount: e.target.value }))}
                className="px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gold-400 focus:border-transparent outline-none"
                required
              />
              <select
                value={expenseForm.status}
                onChange={(e) => setExpenseForm((prev) => ({ ...prev, status: e.target.value as FinanceExpense['status'] }))}
                className="px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gold-400 focus:border-transparent outline-none"
              >
                <option value="pendente">Pendente</option>
                <option value="confirmado">Confirmado</option>
                <option value="pago">Pago</option>
                <option value="previsto">Previsto</option>
                <option value="parcelado">Parcelado</option>
              </select>
              <select
                value={expenseForm.category_id}
                onChange={(e) => setExpenseForm((prev) => ({ ...prev, category_id: e.target.value }))}
                className="px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gold-400 focus:border-transparent outline-none"
              >
                <option value="">Categoria</option>
                {categories
                  .filter((cat) => cat.type === 'saida')
                  .map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
              </select>
              <input
                type="date"
                placeholder="Data"
                value={expenseForm.date}
                onChange={(e) =>
                  setExpenseForm((prev) => ({ ...prev, date: e.target.value }))
                }
                className="px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gold-400 focus:border-transparent outline-none"
                required
              />
              <select
                value={expenseForm.team_member_name}
                onChange={(e) =>
                  setExpenseForm((prev) => ({
                    ...prev,
                    team_member_name: e.target.value,
                  }))
                }
                className="px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gold-400 focus:border-transparent outline-none"
              >
                <option value="">Nome da equipe</option>
                {teamMembers.map((member) => (
                  <option key={`${member.name}-${member.role ?? 'role'}`} value={member.name}>
                    {member.name}
                    {member.role ? ` - ${member.role}` : ''}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Metodo de pagamento"
                value={expenseForm.payment_method}
                onChange={(e) => setExpenseForm((prev) => ({ ...prev, payment_method: e.target.value }))}
                className="px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gold-400 focus:border-transparent outline-none"
              />
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setExpenseProof(e.target.files?.[0] ?? null)}
                className="px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gold-400 focus:border-transparent outline-none"
              />
              <textarea
                placeholder="Observacoes"
                value={expenseForm.notes}
                onChange={(e) => setExpenseForm((prev) => ({ ...prev, notes: e.target.value }))}
                className="md:col-span-2 px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gold-400 focus:border-transparent outline-none"
              />
              <button
                type="submit"
                disabled={savingExpense}
                className="md:col-span-2 px-4 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl shadow-lg hover:shadow-red-500/30 transition-all"
              >
                {savingExpense ? 'Salvando...' : 'Salvar saida'}
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
        <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Fluxo de caixa</h2>
              <p className="text-sm text-gray-500">
                Entradas e saidas consolidadas.
              </p>
            </div>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-gold-50 text-gold-700">
              Ultimos 6 meses
            </span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cashflowSeries}>
                <defs>
                  <linearGradient id="saldo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#C9A46E" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#C9A46E" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip
                  formatter={(value: number) => currency(value)}
                  contentStyle={{ borderRadius: 12 }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="saldo"
                  stroke="#C9A46E"
                  fill="url(#saldo)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="entradas"
                  stroke="#10B981"
                  fill="transparent"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="saidas"
                  stroke="#EF4444"
                  fill="transparent"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Recebimentos previstos
              </h2>
              <p className="text-sm text-gray-500">
                Proximas entradas confirmadas.
              </p>
            </div>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700">
              21 dias
            </span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={paymentSchedule} barSize={14}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip
                  formatter={(value: number) => currency(value)}
                  contentStyle={{ borderRadius: 12 }}
                />
                <Legend />
                <Bar dataKey="previsto" fill="#CBD5F5" radius={[6, 6, 0, 0]} />
                <Bar dataKey="recebido" fill="#10B981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Despesas por categoria
              </h2>
              <p className="text-sm text-gray-500">
                Onde o seu caixa esta sendo consumido.
              </p>
            </div>
          </div>
          <div className="h-56">
            {categorySplit.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-gray-400">
                Sem dados de categorias.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categorySplit}
                    innerRadius={55}
                    outerRadius={90}
                    dataKey="value"
                    paddingAngle={3}
                  >
                    {categorySplit.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={CATEGORY_FALLBACK_COLORS[index % CATEGORY_FALLBACK_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `${value}%`} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="mt-4 space-y-2 text-sm">
            {categorySplit.map((item, index) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-600">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{
                      backgroundColor:
                        CATEGORY_FALLBACK_COLORS[index % CATEGORY_FALLBACK_COLORS.length],
                    }}
                  />
                  {item.name}
                </div>
                <span className="font-semibold text-gray-900">
                  {item.value}%
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Ultimas movimentacoes
              </h2>
              <p className="text-sm text-gray-500">
                Entradas e saidas do seu caixa pessoal.
              </p>
            </div>
            <button className="text-xs font-semibold text-gold-600 hover:text-gold-700">
              Ver tudo
            </button>
          </div>
          <div className="space-y-4">
            {transactions.length === 0 ? (
              <div className="text-sm text-gray-400">Sem movimentacoes.</div>
            ) : (
              transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 border border-gray-100 rounded-xl hover:shadow-md transition"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2 rounded-lg ${
                        tx.type === 'Entrada'
                          ? 'bg-emerald-50 text-emerald-600'
                          : 'bg-red-50 text-red-600'
                      }`}
                    >
                      {tx.type === 'Entrada' ? (
                        <TrendingUp className="w-5 h-5" />
                      ) : (
                        <TrendingDown className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{tx.title}</p>
                      <p className="text-xs text-gray-500">
                        {formatShortDate(tx.date)} • {tx.id.slice(0, 8)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        tx.type === 'Entrada'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-red-50 text-red-700'
                      }`}
                    >
                      {tx.status}
                    </span>
                    <span className="font-semibold text-gray-900">
                      {currency(tx.amount)}
                    </span>
                    {tx.proof_url ? (
                      <button
                        type="button"
                        onClick={() => openProof(tx.proof_url ?? '', tx.id)}
                        className="text-xs text-gray-400 hover:text-gray-600"
                        title="Abrir comprovante"
                        disabled={openingProofId === tx.id}
                      >
                        {openingProofId === tx.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <FileText className="w-4 h-4" />
                        )}
                      </button>
                    ) : (
                      <span className="text-xs text-gray-300">
                        <FileText className="w-4 h-4" />
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Ranking da equipe</h2>
              <p className="text-sm text-gray-500">
                Quem mais atuou nos seus eventos.
              </p>
            </div>
            <Crown className="w-5 h-5 text-gold-500" />
          </div>
          <div className="space-y-4">
            {teamRanking.length === 0 ? (
              <div className="text-sm text-gray-400">
                Sem dados de equipe.
              </div>
            ) : (
              teamRanking.map((member, index) => (
                <div
                  key={`${member.name}-${member.role ?? 'role'}`}
                  className="flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold ${
                        index === 0
                          ? 'bg-gold-500 text-white'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      #{index + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{member.name}</p>
                      <p className="text-xs text-gray-500">{member.role ?? 'Equipe'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">
                      {member.events} eventos
                    </p>
                    <p className="text-xs text-gray-500">
                      Score {member.score}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="lg:col-span-2 bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold">Sugestoes inteligentes</h2>
              <p className="text-sm text-gray-300">
                Melhore o caixa com acoes rapidas.
              </p>
            </div>
            <BadgeCheck className="w-5 h-5 text-gold-400" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {insights.map((item) => (
              <div
                key={item.title}
                className="bg-white/10 rounded-xl p-4 border border-white/10"
              >
                <h3 className="font-semibold text-white">{item.title}</h3>
                <p className="text-xs text-gray-200 mt-2">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
