import React, { useMemo, useState } from 'react';
import {
  Plus,
  Upload,
  Trash2,
  CheckCircle2,
  Circle,
  Search,
} from 'lucide-react';

type GuestNewBase = { name: string; phone: string };

type GuestBase = {
  id: string;
  name: string;
  phone: string | null;
  confirmed: boolean;
  table_id?: string | null;
};

type Props<TNewGuest extends GuestNewBase, TGuest extends GuestBase> = {
  newGuest: TNewGuest;
  setNewGuest: React.Dispatch<React.SetStateAction<TNewGuest>>;
  addGuest: () => void | Promise<void>;

  guests: TGuest[];
  toggleGuest: (guestId: string) => void | Promise<void>;
  deleteGuest: (guestId: string) => void | Promise<void>;

  fileInputRef: React.RefObject<HTMLInputElement | null>;
  importCSV: (file: File) => void | Promise<void>;
};

export function GuestsTab<
  TNewGuest extends GuestNewBase,
  TGuest extends GuestBase,
>({
  newGuest,
  setNewGuest,
  addGuest,
  guests,
  toggleGuest,
  deleteGuest,
  fileInputRef,
  importCSV,
}: Props<TNewGuest, TGuest>) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<
    'all' | 'confirmed' | 'pending' | 'no_table'
  >('all');

  const [isAdding, setIsAdding] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const stats = useMemo(() => {
    const total = guests.length;
    const confirmed = guests.filter((g) => g.confirmed).length;
    const pending = total - confirmed;
    const noTable = guests.filter((g) => !g.table_id).length;
    return { total, confirmed, pending, noTable };
  }, [guests]);

  const filteredGuests = useMemo(() => {
    const q = query.trim().toLowerCase();

    return guests
      .filter((g) => {
        if (filter === 'confirmed') return g.confirmed;
        if (filter === 'pending') return !g.confirmed;
        if (filter === 'no_table') return !g.table_id;
        return true;
      })
      .filter((g) => {
        if (!q) return true;
        return (
          (g.name ?? '').toLowerCase().includes(q) ||
          (g.phone ?? '').toLowerCase().includes(q)
        );
      })
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [guests, query, filter]);

  async function handleAddGuest() {
    if (!newGuest.name.trim() || isAdding) return;
    setIsAdding(true);
    try {
      await addGuest();
    } finally {
      setIsAdding(false);
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      {/* Form */}
      <div className="flex flex-col md:flex-row gap-2 mb-4">
        <input
          value={newGuest.name}
          onChange={(e) => setNewGuest((p) => ({ ...p, name: e.target.value }))}
          placeholder="Nome"
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAddGuest();
          }}
        />
        <input
          value={newGuest.phone}
          onChange={(e) =>
            setNewGuest((p) => ({ ...p, phone: e.target.value }))
          }
          placeholder="Telefone (opcional)"
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAddGuest();
          }}
        />
        <button
          onClick={handleAddGuest}
          disabled={isAdding || !newGuest.name.trim()}
          className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          title="Adicionar convidado"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Busca */}
      <div className="mb-3 flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2">
        <Search className="w-4 h-4 text-gray-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nome ou telefone..."
          className="w-full outline-none text-sm"
        />
      </div>

      {/* Filtros */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Chip active={filter === 'all'} onClick={() => setFilter('all')}>
          Todos ({stats.total})
        </Chip>
        <Chip
          active={filter === 'confirmed'}
          onClick={() => setFilter('confirmed')}
        >
          Confirmados ({stats.confirmed})
        </Chip>
        <Chip
          active={filter === 'pending'}
          onClick={() => setFilter('pending')}
        >
          Pendentes ({stats.pending})
        </Chip>
        <Chip
          active={filter === 'no_table'}
          onClick={() => setFilter('no_table')}
        >
          Sem mesa ({stats.noTable})
        </Chip>
      </div>

      {/* CSV */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;

          setIsImporting(true);
          try {
            await importCSV(f);
          } finally {
            setIsImporting(false);
            e.currentTarget.value = '';
          }
        }}
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={isImporting}
        className="w-full mb-6 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-pink-500 hover:bg-pink-50 transition-colors flex items-center justify-center gap-2 text-gray-700 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <Upload className="w-5 h-5" />
        {isImporting ? 'Importando...' : 'Importar CSV (Nome,Telefone)'}
      </button>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredGuests.length === 0 ? (
          <div className="md:col-span-2 p-8 text-center text-sm text-gray-400 italic border rounded-xl">
            Nenhum convidado encontrado.
          </div>
        ) : (
          filteredGuests.map((g) => (
            <div
              key={g.id}
              className="border rounded-xl p-4 flex items-start justify-between gap-3 hover:bg-gray-50 transition-colors"
            >
              <button
                onClick={() => toggleGuest(g.id)}
                className="flex items-start gap-3 text-left"
                title="Alternar confirmação"
              >
                {g.confirmed ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                ) : (
                  <Circle className="w-5 h-5 text-gray-400 mt-0.5" />
                )}

                <div>
                  <div className="font-semibold text-gray-800 leading-tight">
                    {g.name}
                  </div>
                  <div className="text-sm text-gray-500">
                    {g.phone ? (
                      g.phone
                    ) : (
                      <span className="italic text-gray-400">Sem telefone</span>
                    )}
                  </div>

                  {!g.table_id && (
                    <div className="mt-2 inline-flex text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                      Sem mesa
                    </div>
                  )}
                </div>
              </button>

              <button
                onClick={() => deleteGuest(g.id)}
                className="p-2 rounded-lg hover:bg-red-50 text-red-600"
                title="Remover convidado"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        'text-sm px-3 py-1.5 rounded-full border transition-colors',
        active
          ? 'bg-pink-500 text-white border-pink-500'
          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50',
      ].join(' ')}
    >
      {children}
    </button>
  );
}
