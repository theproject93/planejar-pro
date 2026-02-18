import React, { useMemo, useState } from 'react';
import { Plus, Upload, Trash2, CheckCircle2, Circle, Search } from 'lucide-react';

type GuestStatus = 'pending' | 'confirmed' | 'declined';

type NewGuest = { name: string; phone: string };

type Guest = {
  id: string;
  name: string;
  phone: string | null;
  confirmed: boolean;
  table_id?: string | null;
  rsvp_status?: GuestStatus | null;
  plus_one_count?: number | null;
  dietary_restrictions?: string | null;
};

type Props = {
  newGuest: NewGuest;
  setNewGuest: React.Dispatch<React.SetStateAction<NewGuest>>;
  addGuest: () => void | Promise<void>;
  guests: Guest[];
  toggleGuest: (guestId: string) => void | Promise<void>;
  updateGuestStatus: (guestId: string, status: GuestStatus) => void | Promise<void>;
  deleteGuest: (guestId: string) => void | Promise<void>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  importCSV: (file: File) => void | Promise<void>;
};

function normalizeGuestStatus(guest: Guest): GuestStatus {
  const status = (guest.rsvp_status ?? '').trim().toLowerCase();
  if (status === 'confirmed' || status === 'declined' || status === 'pending') {
    return status;
  }
  return guest.confirmed ? 'confirmed' : 'pending';
}

export function GuestsTab({
  newGuest,
  setNewGuest,
  addGuest,
  guests,
  toggleGuest,
  updateGuestStatus,
  deleteGuest,
  fileInputRef,
  importCSV,
}: Props) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<
    'all' | 'confirmed' | 'pending' | 'declined' | 'no_table'
  >('all');

  const [isAdding, setIsAdding] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [updatingGuestId, setUpdatingGuestId] = useState<string | null>(null);

  const stats = useMemo(() => {
    const total = guests.length;
    const confirmed = guests.filter((g) => normalizeGuestStatus(g) === 'confirmed').length;
    const declined = guests.filter((g) => normalizeGuestStatus(g) === 'declined').length;
    const pending = Math.max(total - confirmed - declined, 0);
    const noTable = guests.filter((g) => !g.table_id).length;
    return { total, confirmed, pending, declined, noTable };
  }, [guests]);

  const filteredGuests = useMemo(() => {
    const q = query.trim().toLowerCase();

    return guests
      .filter((g) => {
        const status = normalizeGuestStatus(g);
        if (filter === 'confirmed') return status === 'confirmed';
        if (filter === 'pending') return status === 'pending';
        if (filter === 'declined') return status === 'declined';
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

  async function handleChangeStatus(guestId: string, status: GuestStatus) {
    if (updatingGuestId) return;
    setUpdatingGuestId(guestId);
    try {
      await updateGuestStatus(guestId, status);
    } finally {
      setUpdatingGuestId(null);
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex flex-col md:flex-row gap-2 mb-4">
        <input
          value={newGuest.name}
          onChange={(e) => setNewGuest((p) => ({ ...p, name: e.target.value }))}
          placeholder="Nome"
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          onKeyDown={(e) => {
            if (e.key === 'Enter') void handleAddGuest();
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
            if (e.key === 'Enter') void handleAddGuest();
          }}
        />
        <button
          onClick={() => void handleAddGuest()}
          disabled={isAdding || !newGuest.name.trim()}
          className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          title="Adicionar convidado"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="mb-3 flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2">
        <Search className="w-4 h-4 text-gray-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nome ou telefone..."
          className="w-full outline-none text-sm"
        />
      </div>

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
          active={filter === 'declined'}
          onClick={() => setFilter('declined')}
        >
          Recusados ({stats.declined})
        </Chip>
        <Chip
          active={filter === 'no_table'}
          onClick={() => setFilter('no_table')}
        >
          Sem mesa ({stats.noTable})
        </Chip>
      </div>

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
                onClick={() => void toggleGuest(g.id)}
                className="flex items-start gap-3 text-left"
                title="Alternar confirmacao"
              >
                {normalizeGuestStatus(g) === 'confirmed' ? (
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

                  {Number(g.plus_one_count ?? 0) > 0 ? (
                    <div className="mt-2 inline-flex text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      +{Number(g.plus_one_count)} acompanhante(s)
                    </div>
                  ) : null}

                  {g.dietary_restrictions ? (
                    <div className="mt-2 text-xs text-rose-700">
                      Restricao alimentar: {g.dietary_restrictions}
                    </div>
                  ) : null}
                </div>
              </button>

              <div className="flex items-center gap-2">
                <select
                  value={normalizeGuestStatus(g)}
                  onChange={(e) =>
                    void handleChangeStatus(g.id, e.target.value as GuestStatus)
                  }
                  disabled={updatingGuestId === g.id}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1"
                  title="Status RSVP"
                >
                  <option value="pending">Pendente</option>
                  <option value="confirmed">Confirmado</option>
                  <option value="declined">Recusado</option>
                </select>
                <button
                  onClick={() => void deleteGuest(g.id)}
                  className="p-2 rounded-lg hover:bg-red-50 text-red-600"
                  title="Remover convidado"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
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
