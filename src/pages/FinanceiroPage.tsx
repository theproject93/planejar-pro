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
  PiggyBank,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';

const currency = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const cashflowSeries = [
  { name: 'Jan', entradas: 12800, saidas: 5400, saldo: 7400 },
  { name: 'Fev', entradas: 19200, saidas: 7200, saldo: 12000 },
  { name: 'Mar', entradas: 15100, saidas: 8800, saldo: 6300 },
  { name: 'Abr', entradas: 21700, saidas: 10200, saldo: 11500 },
  { name: 'Mai', entradas: 26800, saidas: 14200, saldo: 12600 },
  { name: 'Jun', entradas: 30300, saidas: 16800, saldo: 13500 },
];

const paymentSchedule = [
  { name: '01/06', recebido: 2200, previsto: 1500 },
  { name: '05/06', recebido: 1800, previsto: 1800 },
  { name: '09/06', recebido: 1200, previsto: 2100 },
  { name: '13/06', recebido: 2600, previsto: 2400 },
  { name: '17/06', recebido: 900, previsto: 1800 },
  { name: '21/06', recebido: 2100, previsto: 2000 },
];

const categorySplit = [
  { name: 'Equipe', value: 38 },
  { name: 'Logística', value: 21 },
  { name: 'Alimentação', value: 16 },
  { name: 'Transporte', value: 15 },
  { name: 'Outros', value: 10 },
];

const categoryColors = ['#C9A46E', '#1F2937', '#9CA3AF', '#6B7280', '#E5E7EB'];

const transactions = [
  {
    id: 'TRX-9912',
    type: 'Entrada',
    title: 'Sinal do evento “Juliana & Danilo”',
    date: '12/06/2026',
    amount: 4200,
    status: 'Pago',
    proof: true,
  },
  {
    id: 'TRX-9911',
    type: 'Saída',
    title: 'Equipe - montagem e desmontagem',
    date: '10/06/2026',
    amount: -1850,
    status: 'Pago',
    proof: true,
  },
  {
    id: 'TRX-9910',
    type: 'Saída',
    title: 'Reembolso Uber - equipe externa',
    date: '09/06/2026',
    amount: -320,
    status: 'Pago',
    proof: false,
  },
  {
    id: 'TRX-9909',
    type: 'Entrada',
    title: 'Parcelamento “Evento Maria Laura”',
    date: '08/06/2026',
    amount: 2500,
    status: 'Confirmado',
    proof: true,
  },
  {
    id: 'TRX-9908',
    type: 'Saída',
    title: 'Alimentação equipe (almoço)',
    date: '06/06/2026',
    amount: -480,
    status: 'Pago',
    proof: true,
  },
];

const teamRanking = [
  {
    name: 'Camila Souza',
    role: 'Coordenação geral',
    events: 12,
    score: 94,
  },
  {
    name: 'Thiago Lopes',
    role: 'Assistente sênior',
    events: 10,
    score: 88,
  },
  {
    name: 'Patrícia Reis',
    role: 'Operação & logística',
    events: 9,
    score: 84,
  },
  {
    name: 'Gustavo Lima',
    role: 'Assistente',
    events: 7,
    score: 79,
  },
];

const insights = [
  {
    title: 'Antecipe os próximos 7 dias',
    description:
      'Você tem R$ 6.200 previstos para entrar e R$ 3.400 em pagamentos de equipe.',
  },
  {
    title: 'Negocie prazos com fornecedores',
    description:
      'Suas saídas em logística subiram 18% no último mês. Vale revisar contratos.',
  },
  {
    title: 'Equipe com maior eficiência',
    description:
      'Camila e Thiago lideram eventos concluídos sem retrabalho. Mantenha-os nas maiores produções.',
  },
];

export function FinanceiroPage() {
  return (
    <div className="max-w-6xl mx-auto pb-10">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 font-playfair">
            Financeiro Geral
          </h1>
          <p className="text-gray-500 mt-1">
            Visão completa do seu caixa, pagamentos recebidos e despesas da sua
            equipe.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gold-500" />
            Junho de 2026
          </div>
          <button className="px-5 py-2 bg-gold-500 hover:bg-gold-600 text-white font-bold rounded-xl shadow-lg hover:shadow-gold-500/30 transition-all">
            Exportar relatório
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Saldo em caixa</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {currency(26840)}
              </p>
              <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                +12% vs mês anterior
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
                {currency(18200)}
              </p>
              <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                5 pagamentos nesta semana
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
              <p className="text-sm text-gray-500">Saídas programadas</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {currency(6840)}
              </p>
              <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                <TrendingDown className="w-4 h-4" />
                3 pagamentos pendentes
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
                Entradas e saídas consolidadas.
              </p>
            </div>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-gold-50 text-gold-700">
              Últimos 6 meses
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
                Próximas entradas confirmadas.
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
                Onde o seu caixa está sendo consumido.
              </p>
            </div>
          </div>
          <div className="h-56">
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
                    <Cell key={entry.name} fill={categoryColors[index]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `${value}%`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2 text-sm">
            {categorySplit.map((item, index) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-600">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: categoryColors[index] }}
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
                Últimas movimentações
              </h2>
              <p className="text-sm text-gray-500">
                Entradas e saídas do seu caixa pessoal.
              </p>
            </div>
            <button className="text-xs font-semibold text-gold-600 hover:text-gold-700">
              Ver tudo
            </button>
          </div>
          <div className="space-y-4">
            {transactions.map((tx) => (
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
                      {tx.date} • {tx.id}
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
                  <button className="text-xs text-gray-400 hover:text-gray-600">
                    <FileText className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
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
            {teamRanking.map((member, index) => (
              <div
                key={member.name}
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
                    <p className="text-xs text-gray-500">{member.role}</p>
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
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold">Sugestões inteligentes</h2>
              <p className="text-sm text-gray-300">
                Melhore o caixa com ações rápidas.
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
