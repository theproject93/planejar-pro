import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  CheckSquare,
  DollarSign,
  Clock,
  Wallet,
  Phone,
  FileText,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

// Dados Mockados para o Gráfico
const mockExpenses = [
  { name: 'Buffet', value: 15000, color: '#EAB308' }, // Gold-500
  { name: 'Decoração', value: 8000, color: '#FCA5A5' }, // Red-300
  { name: 'Foto/Vídeo', value: 5000, color: '#93C5FD' }, // Blue-300
  { name: 'Local', value: 4500, color: '#86EFAC' }, // Green-300
];

export function EventDetailsPage() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState<
    'overview' | 'tasks' | 'budget' | 'guests' | 'vendors'
  >('overview');

  // Mock dos dados do evento
  const event = {
    id: id,
    couple: 'Carla & João',
    date: '2026-05-15',
    location: 'Espaço Villa Lobos - SP',
    guests: 150,
    budget: {
      total: 80000,
      spent: 32500,
      paid: 25000,
    },
    tasks: {
      total: 120,
      completed: 45,
    },
  };

  const daysRemaining = Math.ceil(
    (new Date(event.date).getTime() - new Date().getTime()) /
      (1000 * 60 * 60 * 24)
  );
  const budgetProgress = (event.budget.spent / event.budget.total) * 100;
  const tasksProgress = (event.tasks.completed / event.tasks.total) * 100;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header do Evento */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            to="/dashboard/eventos"
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 font-playfair">
              {event.couple}
            </h1>
            <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />{' '}
                {new Date(event.date).toLocaleDateString()}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" /> {event.location}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm">
          <Clock className="w-5 h-5 text-gold-500" />
          <div>
            <p className="text-xs text-gray-400 uppercase font-bold">
              Contagem Regressiva
            </p>
            <p className="text-lg font-bold text-gray-900">
              {daysRemaining} dias
            </p>
          </div>
        </div>
      </div>

      {/* Navegação por Abas */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-1 overflow-x-auto">
        <div className="flex space-x-1 min-w-max">
          {[
            { id: 'overview', label: 'Visão Geral', icon: FileText },
            { id: 'tasks', label: 'Checklist', icon: CheckSquare },
            { id: 'budget', label: 'Financeiro', icon: DollarSign },
            { id: 'guests', label: 'Convidados', icon: Users },
            { id: 'vendors', label: 'Fornecedores', icon: Phone },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`
                flex items-center px-6 py-3 rounded-lg text-sm font-medium transition-all
                ${
                  activeTab === tab.id
                    ? 'bg-gold-50 text-gold-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                }
              `}
            >
              <tab.icon
                className={`w-4 h-4 mr-2 ${activeTab === tab.id ? 'text-gold-500' : 'text-gray-400'}`}
              />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Conteúdo das Abas */}
      <div className="space-y-6">
        {/* ABA: VISÃO GERAL */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Card de Orçamento (Resumo) */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gold-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-green-50 rounded-xl text-green-600">
                    <Wallet className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-gray-700">Orçamento</h3>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-500">Utilizado</span>
                      <span className="font-bold text-gray-900">
                        {budgetProgress.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full"
                        style={{ width: `${budgetProgress}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <p className="text-xs text-gray-400">Previsto</p>
                      <p className="font-bold text-gray-900">
                        R$ {event.budget.total.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Gasto</p>
                      <p className="font-bold text-red-600">
                        R$ {event.budget.spent.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card de Tarefas */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                    <CheckSquare className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-gray-700">Checklist</h3>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-500">Concluído</span>
                      <span className="font-bold text-gray-900">
                        {tasksProgress.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${tasksProgress}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <div>
                      <p className="text-3xl font-bold text-gray-900">
                        {event.tasks.completed}
                        <span className="text-lg text-gray-400 font-normal">
                          /{event.tasks.total}
                        </span>
                      </p>
                      <p className="text-xs text-gray-400">
                        Tarefas finalizadas
                      </p>
                    </div>
                    <button className="px-4 py-2 bg-blue-50 text-blue-600 text-sm font-bold rounded-lg hover:bg-blue-100 transition-colors">
                      Ver Lista
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* GRÁFICO DE GASTOS (NOVO!) */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 md:row-span-2 flex flex-col">
              <h3 className="font-bold text-gray-900 mb-4">
                Distribuição de Gastos
              </h3>

              <div className="flex-1 min-h-[200px] relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={mockExpenses}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {mockExpenses.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) =>
                        `R$ ${value.toLocaleString()}`
                      }
                      contentStyle={{
                        borderRadius: '8px',
                        border: 'none',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                {/* Legenda Centralizada (Total Gasto) */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <p className="text-xs text-gray-400 font-bold uppercase">
                      Total
                    </p>
                    <p className="text-lg font-bold text-gray-900">32.5k</p>
                  </div>
                </div>
              </div>

              {/* Legenda Customizada */}
              <div className="mt-4 space-y-2">
                {mockExpenses.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      ></div>
                      <span className="text-gray-600">{item.name}</span>
                    </div>
                    <span className="font-bold text-gray-900">
                      R$ {item.value.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Próximas Atividades (Timeline Mini) */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 md:col-span-2 lg:col-span-2">
              <h3 className="font-bold text-gray-900 mb-4">
                Próximas Pendências
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {
                    text: 'Reunião com Buffet',
                    date: 'Amanhã, 14:00',
                    type: 'meeting',
                  },
                  {
                    text: 'Pagamento 2ª Parc. Fotógrafo',
                    date: '20/02/2026',
                    type: 'payment',
                  },
                  {
                    text: 'Enviar Convites Padrinhos',
                    date: '25/02/2026',
                    type: 'task',
                  },
                  {
                    text: 'Degustação de Doces',
                    date: '28/02/2026',
                    type: 'meeting',
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100 cursor-pointer"
                  >
                    <div
                      className={`w-2 h-2 mt-2 rounded-full ${
                        item.type === 'payment'
                          ? 'bg-red-500'
                          : item.type === 'meeting'
                            ? 'bg-purple-500'
                            : 'bg-gold-500'
                      }`}
                    ></div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {item.text}
                      </p>
                      <p className="text-xs text-gray-400">{item.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Placeholders para outras abas (Igual ao anterior) */}
        {activeTab === 'tasks' && (
          <div className="p-10 text-center bg-white rounded-2xl border border-gray-100 text-gray-400">
            Módulo de Checklist em desenvolvimento...
          </div>
        )}
        {activeTab === 'budget' && (
          <div className="p-10 text-center bg-white rounded-2xl border border-gray-100 text-gray-400">
            Módulo Financeiro em desenvolvimento...
          </div>
        )}
        {activeTab === 'guests' && (
          <div className="p-10 text-center bg-white rounded-2xl border border-gray-100 text-gray-400">
            Módulo de Convidados em desenvolvimento...
          </div>
        )}
        {activeTab === 'vendors' && (
          <div className="p-10 text-center bg-white rounded-2xl border border-gray-100 text-gray-400">
            Módulo de Fornecedores em desenvolvimento...
          </div>
        )}
      </div>
    </div>
  );
}
