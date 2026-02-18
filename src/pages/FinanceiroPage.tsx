import { useEffect, useMemo, useState } from 'react';
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
  const [entries, setEntries] = useState<FinanceEntry[]>([]);
  const [expenses, setExpenses] = useState<FinanceExpense[]>([]);
  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [teamRanking, setTeamRanking] = useState<TeamRankingRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFinance() {
      if (!user) return;
      setLoading(true);

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

      const eventsRes = await supabase
        .from('events')
        .select('id')
        .eq('user_id', user.id);

      const eventIds = (eventsRes.data ?? []).map((row) => row.id);
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

      if (!entriesRes.error) setEntries(entriesRes.data ?? []);
      if (!expensesRes.error) setExpenses(expensesRes.data ?? []);
      if (!categoriesRes.error) setCategories(categoriesRes.data ?? []);

      const rankingMap = new Map<string, { name: string; role: string | null; events: number }>();
      teamData.forEach((member) => {
        const name = (member.name ?? '').trim();
        if (!name) return;
        const role = (member.role ?? '').trim() || null;
        const key = `${name}::${role ?? ''}`;
        const existing = rankingMap.get(key);
        if (existing) {
          existing.events += 1;
        } else {
          rankingMap.set(key, { name, role, events: 1 });
        }
      });

      const ranked = Array.from(rankingMap.values())
        .sort((a, b) => b.events - a.events)
        .slice(0, 6)
        .map((item, index) => ({
          ...item,
          score: Math.min(99, 70 + item.events * 3 - index),
        }));

      setTeamRanking(ranked);
      setLoading(false);
    }

    loadFinance();
  }, [user]);

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
        date: entry.received_at ?? entry.expected_at,
        amount: Number(entry.amount) || 0,
        status: entry.status,
        proof_url: entry.proof_url,
      })),
      ...expenses.map((expense) => ({
        id: expense.id,
        type: 'Saida' as const,
        title: expense.title,
        date: expense.paid_at ?? expense.expected_at,
        amount: -(Number(expense.amount) || 0),
        status: expense.status,
        proof_url: expense.proof_url,
      })),
    ];
    return rows
      .filter((row) => row.date)
      .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
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
      balance: totalEntries - totalExpenses,
      confirmedEntries,
      plannedExpenses,
    };
  }, [entries, expenses]);

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
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
                      <a
                        href={tx.proof_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-gray-400 hover:text-gray-600"
                        title="Abrir comprovante"
                      >
                        <FileText className="w-4 h-4" />
                      </a>
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
