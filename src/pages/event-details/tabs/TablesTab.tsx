import React from 'react';
import { LayoutGrid, MapPin, Plus, Trash2, X } from 'lucide-react';
import { VisualMapTab } from './VisualMapTab';

type TableViewMode = 'list' | 'map';

export type GuestItem = {
  id: string;
  name: string;
  // suporte aos dois nomes pra não quebrar agora
  tableid?: string | null;
  table_id?: string | null;
};

export type TableBase = {
  id: string;
  name: string;
  seats: number;
  note?: string | null;
  posx?: number | null;
  posy?: number | null;
};

type NewTable = { name: string; seats: number };

type Props<TTable extends TableBase = TableBase> = {
  eventId: string;

  tableViewMode: TableViewMode;
  setTableViewMode: (m: TableViewMode) => void;

  tables: TTable[];
  setTables: React.Dispatch<React.SetStateAction<TTable[]>>;
  guests: GuestItem[];

  newTable: NewTable;
  setNewTable: React.Dispatch<React.SetStateAction<NewTable>>;

  addTable: () => void | Promise<void>;
  deleteTable: (id: string) => void | Promise<void>;
  assignGuestToTable: (
    guestId: string,
    tableId: string | null
  ) => void | Promise<void>;

  saveTableNote: (tableId: string, note: string | null) => void | Promise<void>;

  // Encapsulamento: quem salva no DB é o pai.
  onPersistPosition: (
    tableId: string,
    x: number,
    y: number
  ) => void | Promise<void>;
};

function getGuestTableId(g: GuestItem) {
  return g.tableid ?? g.table_id ?? null;
}

export function TablesTab<TTable extends TableBase = TableBase>({
  eventId,
  tableViewMode,
  setTableViewMode,
  tables,
  setTables,
  guests,
  newTable,
  setNewTable,
  addTable,
  deleteTable,
  assignGuestToTable,
  saveTableNote,
  onPersistPosition,
}: Props<TTable>) {
  const unseated = guests.filter((g) => !getGuestTableId(g));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl shadow-sm">
        <div>
          <h3 className="text-lg font-bold text-gray-800">
            Organização de Mesas
          </h3>
          <p className="text-sm text-gray-500">
            Alterne entre lista e mapa visual (arraste e solte).
          </p>
        </div>

        <div className="flex bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setTableViewMode('list')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
              tableViewMode === 'list'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            Lista
          </button>

          <button
            onClick={() => setTableViewMode('map')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
              tableViewMode === 'map'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <MapPin className="w-4 h-4" />
            Mapa
          </button>
        </div>
      </div>

      {tableViewMode === 'map' && (
        <VisualMapTab<TTable>
          eventId={eventId}
          tables={tables}
          guests={guests}
          onPositionsApplied={(next) => setTables(next)}
          onPersistPosition={onPersistPosition}
        />
      )}

      <div className={tableViewMode === 'list' ? 'space-y-6' : 'hidden'}>
        {/* Criar Mesa */}
        <div className="bg-white rounded-xl shadow-sm p-6 flex gap-4 items-center">
          <div className="p-3 bg-indigo-100 rounded-full text-indigo-600">
            <LayoutGrid className="w-6 h-6" />
          </div>

          <input
            value={newTable.name}
            onChange={(e) =>
              setNewTable((p) => ({ ...p, name: e.target.value }))
            }
            placeholder="Nome da Mesa (ex: Família Noiva)"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
          />

          <input
            type="number"
            value={newTable.seats}
            onChange={(e) =>
              setNewTable((p) => ({ ...p, seats: Number(e.target.value) }))
            }
            placeholder="Lugares"
            className="w-24 px-4 py-2 border border-gray-300 rounded-lg"
          />

          <button
            onClick={addTable}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            title="Adicionar mesa"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna: Convidados Sem Mesa */}
          <div className="bg-white rounded-xl shadow-sm p-6 lg:col-span-1 h-fit">
            <h3 className="font-bold text-gray-700 mb-4 flex justify-between">
              Sem Mesa
              <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">
                {unseated.length}
              </span>
            </h3>

            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {unseated.map((guest) => (
                <div
                  key={guest.id}
                  className="p-3 bg-gray-50 rounded-lg border border-gray-100 flex justify-between items-center group"
                >
                  <span className="text-sm text-gray-700">{guest.name}</span>

                  <div className="relative group-hover:block hidden">
                    <select
                      onChange={(e) =>
                        assignGuestToTable(guest.id, e.target.value)
                      }
                      className="text-xs bg-white border border-gray-300 rounded px-1 py-1"
                      defaultValue=""
                    >
                      <option value="" disabled>
                        Mover para...
                      </option>
                      {tables.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}

              {unseated.length === 0 && (
                <p className="text-gray-400 text-sm text-center italic">
                  Todos sentados!
                </p>
              )}
            </div>
          </div>

          {/* Coluna: Mesas */}
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            {tables.map((table) => {
              const tableGuests = guests.filter(
                (g) => getGuestTableId(g) === table.id
              );
              const isFull = tableGuests.length >= table.seats;

              return (
                <div
                  key={table.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
                >
                  <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                    <div className="w-full pr-3">
                      <h4 className="font-bold text-gray-800">{table.name}</h4>

                      <input
                        value={table.note ?? ''}
                        onChange={(e) =>
                          setTables((prev) =>
                            prev.map((x) =>
                              x.id === table.id
                                ? ({ ...x, note: e.target.value } as TTable)
                                : x
                            )
                          )
                        }
                        onBlur={async (e) => {
                          const note = e.target.value.trim();
                          await saveTableNote(table.id, note ? note : null);

                          setTables((prev) =>
                            prev.map((x) =>
                              x.id === table.id
                                ? ({ ...x, note: note ? note : null } as TTable)
                                : x
                            )
                          );
                        }}
                        placeholder="Observação (ex: Família do cunhado...)"
                        className="mt-2 w-full text-xs px-2 py-1 border border-gray-200 rounded"
                      />

                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          isFull
                            ? 'bg-red-100 text-red-600'
                            : 'bg-green-100 text-green-600'
                        }`}
                      >
                        {tableGuests.length} / {table.seats} lugares
                      </span>
                    </div>

                    <button
                      onClick={() => deleteTable(table.id)}
                      className="text-gray-400 hover:text-red-500"
                      title="Excluir mesa"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="p-4 min-h-[100px]">
                    {tableGuests.length > 0 ? (
                      <div className="space-y-2">
                        {tableGuests.map((g) => (
                          <div
                            key={g.id}
                            className="flex justify-between items-center text-sm p-2 hover:bg-gray-50 rounded"
                          >
                            <span className="text-gray-700 truncate">
                              {g.name}
                            </span>
                            <button
                              onClick={() => assignGuestToTable(g.id, null)}
                              className="text-gray-400 hover:text-red-500"
                              title="Remover da mesa"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-gray-400 text-xs py-4">
                        Mesa vazia
                      </p>
                    )}

                    {!isFull && (
                      <select
                        onChange={(e) =>
                          assignGuestToTable(e.target.value, table.id)
                        }
                        className="mt-3 w-full text-xs bg-white border border-dashed border-gray-300 rounded px-2 py-2 text-gray-500 hover:border-indigo-400 cursor-pointer"
                        value=""
                      >
                        <option value="" disabled>
                          + Adicionar convidado...
                        </option>
                        {unseated.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
