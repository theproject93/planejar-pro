import { useState, useEffect } from 'react';
import {
  Plus,
  Calendar,
  MapPin,
  X,
  Loader2,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient'; // Importe seu client
import { useAuth } from '../contexts/AuthContext';
import { buildDefaultEventTasksPayload } from '../lib/defaultEventTasks';

interface Event {
  id: string;
  name: string; // Campo do banco
  event_date: string; // Campo do banco
  location: string;
  status: string;
  event_type?: string;
}

function getEventCoverImage(eventType?: string) {
  const type = (eventType ?? 'wedding').toLowerCase();

  if (type === 'corporate') {
    return 'https://images.unsplash.com/photo-1515169067868-5387ec356754?auto=format&fit=crop&w=1200&q=80';
  }
  if (type === 'debutante') {
    return 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=80';
  }
  if (type === 'birthday') {
    return 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=1200&q=80';
  }

  return 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80';
}

export function EventsPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [deleteErrorMsg, setDeleteErrorMsg] = useState<string | null>(null);

  // Estados do Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Form
  const [newCouple, setNewCouple] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newEventType, setNewEventType] = useState('wedding');
  const eventNameLabel =
    newEventType === 'wedding' ? 'Nome do Casal' : 'Nome do Evento';

  // 1. Buscar Eventos
  async function fetchEvents() {
    if (!user) return;

    const { data, error } = await supabase
      .from('events')
      .select('id, name, event_date, location, status, event_type')
      .eq('user_id', user.id)
      .or('status.is.null,status.neq.deleted')
      .order('event_date', { ascending: true });

    if (error) {
      console.error('Erro ao buscar eventos:', error);
    } else {
      setEvents(data || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchEvents();
  }, [user]);

  // 2. Criar Evento
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    if (!user) {
      setIsCreating(false);
      return;
    }

    const { data, error } = await supabase
      .from('events')
      .insert([
        {
          user_id: user.id,
          name: newCouple,
          event_date: newDate,
          location: newLocation,
          event_type: newEventType,
          status: 'active',
        },
      ])
      .select('id, name, event_date, location, status, event_type');

    if (error) {
      alert('Erro ao criar evento: ' + error.message);
    } else {
      const createdEvent = data?.[0];
      if (createdEvent?.id) {
        const defaultTasksPayload = buildDefaultEventTasksPayload(
          createdEvent.id,
          createdEvent.event_type ?? newEventType
        );

        const { error: tasksInsertError } = await supabase
          .from('event_tasks')
          .insert(defaultTasksPayload);

        if (tasksInsertError) {
          console.error(
            'Erro ao criar checklist padrão do evento:',
            tasksInsertError
          );
        }
      }

      if (data) setEvents([...events, ...data]);
      setIsModalOpen(false);
      setNewCouple('');
      setNewDate('');
      setNewLocation('');
      setNewEventType('wedding');
    }
    setIsCreating(false);
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!user) return;

    setDeleteErrorMsg(null);
    setDeletingEventId(eventId);
    try {
      const childTables = [
        'expense_payments',
        'event_tasks',
        'event_guests',
        'event_timeline',
        'event_documents',
        'event_notes',
        'event_team_members',
        'event_tables',
        'event_expenses',
        'event_vendors',
      ];

      for (const table of childTables) {
        const { error } = await supabase
          .from(table)
          .delete()
          .eq('event_id', eventId);
        if (error) throw error;
      }

      const { error: eventDeleteError } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId)
        .eq('user_id', user.id);
      if (eventDeleteError) throw eventDeleteError;

      const { data: stillExists, error: verifyDeleteError } = await supabase
        .from('events')
        .select('id')
        .eq('id', eventId)
        .maybeSingle();
      if (verifyDeleteError) throw verifyDeleteError;
      if (stillExists?.id) {
        const { error: softDeleteError } = await supabase
          .from('events')
          .update({ status: 'deleted' })
          .eq('id', eventId)
          .eq('user_id', user.id);
        if (softDeleteError) {
          throw new Error('Não foi possível excluir o evento no banco.');
        }
      }

      await fetchEvents();
      setDeleteCandidate(null);
    } catch (error: any) {
      setDeleteErrorMsg(
        `Erro ao excluir evento: ${error?.message ?? 'erro desconhecido'}`
      );
    } finally {
      setDeletingEventId(null);
    }
  };

  if (loading)
    return (
      <div className="p-10 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-gold-500" />
      </div>
    );

  return (
    <div className="max-w-6xl mx-auto relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 font-playfair">
            Meus Eventos
          </h1>
          <p className="text-gray-500 mt-1">
            Gerencie todos os seus eventos em um só lugar.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center px-6 py-3 bg-gold-500 hover:bg-gold-600 text-white font-bold rounded-xl shadow-lg hover:shadow-gold-500/30 transition-all transform hover:-translate-y-1"
        >
          <Plus className="w-5 h-5 mr-2" />
          Novo Evento
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map((event) => (
          <div
            key={event.id}
            className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col"
          >
            <div className="h-48 overflow-hidden relative bg-gray-200">
              <button
                type="button"
                onClick={() => {
                  setDeleteErrorMsg(null);
                  setDeleteCandidate({ id: event.id, name: event.name });
                }}
                disabled={deletingEventId === event.id}
                className="absolute top-3 right-3 z-20 p-2 rounded-lg bg-white/90 text-red-600 hover:bg-red-50 disabled:opacity-60"
                title="Excluir evento"
              >
                {deletingEventId === event.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </button>

              {/* Imagem Placeholder Fixa por enquanto */}
              <img
                src={getEventCoverImage(event.event_type)}
                alt={event.name}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute bottom-4 left-4 text-white">
                <h3 className="text-xl font-bold font-playfair">
                  {event.name}
                </h3>
                <span className="inline-block px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider mt-1 bg-green-500">
                  {event.status === 'active' ? 'Em Planejamento' : event.status}
                </span>
              </div>
            </div>
            <div className="p-6 flex-1 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center text-gray-600 text-sm">
                  <Calendar className="w-4 h-4 mr-3 text-gold-500" />
                  {new Date(event.event_date).toLocaleDateString()}
                </div>
                <div className="flex items-center text-gray-600 text-sm">
                  <MapPin className="w-4 h-4 mr-3 text-gold-500" />
                  {event.location}
                </div>
              </div>
              <Link
                to={`/dashboard/eventos/${event.id}`}
                className="block w-full mt-6 py-2 border border-gold-500 text-gold-600 font-bold rounded-lg hover:bg-gold-50 transition-colors uppercase text-xs tracking-wider text-center"
              >
                Gerenciar Evento
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in-up">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-xl font-bold text-gray-900 font-playfair">
                Novo Evento
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateEvent} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Evento
                </label>
                <select
                  required
                  value={newEventType}
                  onChange={(e) => setNewEventType(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gold-400 focus:border-transparent outline-none"
                >
                  <option value="wedding">Casamento</option>
                  <option value="birthday">Aniversário</option>
                  <option value="debutante">Aniversário de 15 anos</option>
                  <option value="corporate">
                    Confraternização empresarial
                  </option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {eventNameLabel}
                </label>
                <input
                  required
                  type="text"
                  value={newCouple}
                  onChange={(e) => setNewCouple(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gold-400 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data
                </label>
                <input
                  required
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gold-400 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Local
                </label>
                <input
                  required
                  type="text"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gold-400 focus:border-transparent outline-none"
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="flex-1 py-3 bg-gold-500 hover:bg-gold-600 text-white font-bold rounded-xl shadow-lg hover:shadow-gold-500/30 transition-all flex items-center justify-center"
                >
                  {isCreating ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    'Criar Evento'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteCandidate && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-red-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-red-50 to-white">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-100 text-red-600">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">
                  Excluir evento
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDeleteCandidate(null)}
                disabled={deletingEventId === deleteCandidate.id}
                className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5">
              <p className="text-gray-700 leading-relaxed">
                Deseja realmente excluir o evento{' '}
                <span className="font-semibold text-gray-900">
                  "{deleteCandidate.name}"
                </span>
                ? Essa ação é permanente e remove também tarefas, convidados e
                demais dados vinculados.
              </p>

              {deleteErrorMsg && (
                <p className="mt-3 text-sm text-red-600">{deleteErrorMsg}</p>
              )}
            </div>

            <div className="px-6 pb-6 flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteCandidate(null)}
                disabled={deletingEventId === deleteCandidate.id}
                className="flex-1 py-3 border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleDeleteEvent(deleteCandidate.id)}
                disabled={deletingEventId === deleteCandidate.id}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg hover:shadow-red-500/30 transition-all flex items-center justify-center disabled:opacity-60"
              >
                {deletingEventId === deleteCandidate.id ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'Excluir'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


