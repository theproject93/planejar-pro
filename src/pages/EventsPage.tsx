import { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Calendar,
  MapPin,
  Users,
  Clock,
  X,
  Loader2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient'; // Importe seu client
import { useAuth } from '../contexts/AuthContext';

interface Event {
  id: string;
  name: string; // Campo do banco
  event_date: string; // Campo do banco
  location: string;
  status: string;
}

export function EventsPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados do Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Form
  const [newCouple, setNewCouple] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newLocation, setNewLocation] = useState('');

  // 1. Buscar Eventos
  useEffect(() => {
    async function fetchEvents() {
      if (!user) return;

      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('event_date', { ascending: true });

      if (error) {
        console.error('Erro ao buscar eventos:', error);
      } else {
        setEvents(data || []);
      }
      setLoading(false);
    }
    fetchEvents();
  }, [user]);

  // 2. Criar Evento
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    if (!user) return;

    const { data, error } = await supabase
      .from('events')
      .insert([
        {
          user_id: user.id,
          name: newCouple,
          event_date: newDate,
          location: newLocation,
          event_type: 'wedding', // Obrigatório no banco
          status: 'active',
        },
      ])
      .select();

    if (error) {
      alert('Erro ao criar evento: ' + error.message);
    } else {
      if (data) setEvents([...events, ...data]);
      setIsModalOpen(false);
      setNewCouple('');
      setNewDate('');
      setNewLocation('');
    }
    setIsCreating(false);
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
            Gerencie todos os casamentos em um só lugar.
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
              {/* Imagem Placeholder Fixa por enquanto */}
              <img
                src="https://images.unsplash.com/photo-1519741497674-611481863552?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80"
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
                  Nome do Casal
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
    </div>
  );
}
