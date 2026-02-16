import { useState } from 'react';
import { Link } from 'react-router-dom';
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

// Tipo do Evento
interface Event {
  id: string;
  couple: string;
  date: string;
  location: string;
  guests: number;
  status: 'active' | 'completed' | 'cancelled';
  image: string;
}

// Dados Mockados (Apenas Carla & João com a foto que funcionou)
const INITIAL_EVENTS: Event[] = [
  {
    id: '1',
    couple: 'Carla & João',
    date: '2026-05-15',
    location: 'Espaço Villa Lobos - SP',
    guests: 150,
    status: 'active',
    image:
      'https://images.unsplash.com/photo-1519741497674-611481863552?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
  },
];

export function EventsPage() {
  const [events, setEvents] = useState<Event[]>(INITIAL_EVENTS);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

  // Estados do Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Estados do Formulário
  const [newCouple, setNewCouple] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newGuests, setNewGuests] = useState('');

  // Filtra os eventos
  const filteredEvents = events.filter((event) => {
    const matchesSearch = event.couple
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' ? true : event.status === filter;
    return matchesSearch && matchesFilter;
  });

  // Função de Criar Evento
  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simula API
    setTimeout(() => {
      const newEvent: Event = {
        id: Math.random().toString(),
        couple: newCouple,
        date: newDate,
        location: newLocation,
        guests: Number(newGuests),
        status: 'active',
        // Usa uma imagem padrão aleatória de casamento
        image:
          'https://images.unsplash.com/photo-1511285560982-1356c11d4606?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
      };

      setEvents([...events, newEvent]);
      setIsLoading(false);
      setIsModalOpen(false);

      // Limpa formulário
      setNewCouple('');
      setNewDate('');
      setNewLocation('');
      setNewGuests('');
    }, 1000);
  };

  return (
    <div className="max-w-6xl mx-auto relative">
      {/* Header com Ações */}
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

      {/* Barra de Filtros e Busca */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 justify-between items-center mb-8">
        <div className="flex bg-gray-100 p-1 rounded-lg w-full md:w-auto">
          {(['all', 'active', 'completed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex-1 md:flex-none capitalize ${
                filter === f
                  ? 'bg-white text-gold-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {f === 'all' ? 'Todos' : f === 'active' ? 'Ativos' : 'Realizados'}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por noivos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-gold-400 focus:border-transparent outline-none transition-all"
          />
        </div>
      </div>

      {/* Grid de Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEvents.map((event) => (
          <div
            key={event.id}
            className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col"
          >
            <div className="h-48 overflow-hidden relative">
              <img
                src={event.image}
                alt={event.couple}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
              <div className="absolute bottom-4 left-4 text-white">
                <h3 className="text-xl font-bold font-playfair">
                  {event.couple}
                </h3>
                <span
                  className={`inline-block px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider mt-1 ${
                    event.status === 'active' ? 'bg-green-500' : 'bg-gray-500'
                  }`}
                >
                  {event.status === 'active' ? 'Em Planejamento' : 'Realizado'}
                </span>
              </div>
            </div>

            <div className="p-6 flex-1 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center text-gray-600 text-sm">
                  <Calendar className="w-4 h-4 mr-3 text-gold-500" />
                  {new Date(event.date).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </div>
                <div className="flex items-center text-gray-600 text-sm">
                  <Clock className="w-4 h-4 mr-3 text-gold-500" />
                  Faltam{' '}
                  {Math.ceil(
                    (new Date(event.date).getTime() - new Date().getTime()) /
                      (1000 * 60 * 60 * 24)
                  )}{' '}
                  dias
                </div>
                <div className="flex items-center text-gray-600 text-sm">
                  <MapPin className="w-4 h-4 mr-3 text-gold-500" />
                  {event.location}
                </div>
                <div className="flex items-center text-gray-600 text-sm">
                  <Users className="w-4 h-4 mr-3 text-gold-500" />
                  {event.guests} convidados
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

      {/* MODAL DE NOVO EVENTO */}
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
                  Nome dos Noivos
                </label>
                <input
                  required
                  type="text"
                  value={newCouple}
                  onChange={(e) => setNewCouple(e.target.value)}
                  placeholder="Ex: Maria & João"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gold-400 focus:border-transparent outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                    Convidados
                  </label>
                  <input
                    required
                    type="number"
                    value={newGuests}
                    onChange={(e) => setNewGuests(e.target.value)}
                    placeholder="Ex: 150"
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gold-400 focus:border-transparent outline-none"
                  />
                </div>
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
                  placeholder="Ex: Buffet Torres"
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
                  disabled={isLoading}
                  className="flex-1 py-3 bg-gold-500 hover:bg-gold-600 text-white font-bold rounded-xl shadow-lg hover:shadow-gold-500/30 transition-all flex items-center justify-center"
                >
                  {isLoading ? (
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
