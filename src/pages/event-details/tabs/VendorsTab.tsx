import React, { useMemo } from 'react';
import { Mail, Phone, Plus, Trash2, Link2 } from 'lucide-react';

type VendorStatus = 'pending' | 'confirmed' | 'paid' | 'cancelled';

const VENDOR_STATUS: Record<
  VendorStatus,
  { label: string; color: string; bg: string }
> = {
  pending: { label: 'Pendente', color: 'text-amber-700', bg: 'bg-amber-100' },
  confirmed: { label: 'Confirmado', color: 'text-blue-600', bg: 'bg-blue-100' },
  paid: { label: 'Pago', color: 'text-green-600', bg: 'bg-green-100' },
  cancelled: { label: 'Cancelado', color: 'text-red-600', bg: 'bg-red-100' },
};

type VendorBase = {
  id: string;
  name: string;
  category: string;
  phone?: string | null;
  email?: string | null;
  status: VendorStatus;
};

type ExpenseBase = {
  id: string;
  vendor_id?: string | null;
  value: number;
  status?: VendorStatus;
};

type NewVendorBase = {
  name: string;
  category: string;
  phone: string;
  email: string;
};

type Props<
  TVendor extends VendorBase,
  TNewVendor extends NewVendorBase,
  TExpense extends ExpenseBase,
> = {
  newVendor: TNewVendor;
  setNewVendor: React.Dispatch<React.SetStateAction<TNewVendor>>;
  onAdd: () => void | Promise<void>;

  vendors: TVendor[];
  expenses: TExpense[];

  onStatusChange: (id: string, status: VendorStatus) => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
};

function computeAggregateStatus(statuses: VendorStatus[]): VendorStatus {
  // prioridade para "bater o olho":
  // se tiver pendente -> pendente
  // senão se tiver confirmado -> confirmado
  // senão se tiver pago -> pago
  // senão -> cancelado (quando tudo cancelado)
  if (statuses.includes('pending')) return 'pending';
  if (statuses.includes('confirmed')) return 'confirmed';
  if (statuses.includes('paid')) return 'paid';
  return 'cancelled';
}

export function VendorsTab<
  TVendor extends VendorBase,
  TNewVendor extends NewVendorBase,
  TExpense extends ExpenseBase,
>({
  newVendor,
  setNewVendor,
  onAdd,
  vendors,
  expenses,
  onStatusChange,
  onDelete,
}: Props<TVendor, TNewVendor, TExpense>) {
  const statsByVendor = useMemo(() => {
    const map = new Map<
      string,
      { count: number; total: number; statuses: VendorStatus[] }
    >();

    for (const e of expenses) {
      const vid = e.vendor_id ?? null;
      if (!vid) continue;

      const st = (e.status ?? 'pending') as VendorStatus;

      const cur = map.get(vid) ?? { count: 0, total: 0, statuses: [] };
      cur.count += 1;
      cur.total += Number(e.value || 0);
      cur.statuses.push(st);
      map.set(vid, cur);
    }

    return map;
  }, [expenses]);

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-2 mb-4">
        <input
          value={newVendor.name}
          onChange={(e) =>
            setNewVendor((p) => ({ ...p, name: e.target.value }))
          }
          placeholder="Nome do fornecedor"
          className="md:col-span-3 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
        />

        <input
          value={newVendor.category}
          onChange={(e) =>
            setNewVendor((p) => ({ ...p, category: e.target.value }))
          }
          placeholder="Categoria (ex: Fotografia)"
          className="md:col-span-3 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
        />

        <input
          value={newVendor.phone}
          onChange={(e) =>
            setNewVendor((p) => ({ ...p, phone: e.target.value }))
          }
          placeholder="Telefone"
          className="md:col-span-2 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
        />

        <input
          value={newVendor.email}
          onChange={(e) =>
            setNewVendor((p) => ({ ...p, email: e.target.value }))
          }
          placeholder="Email"
          className="md:col-span-3 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
        />

        <button
          onClick={() => onAdd()}
          className="md:col-span-1 px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors"
          title="Adicionar fornecedor"
        >
          <Plus className="w-5 h-5 mx-auto" />
        </button>
      </div>

      <div className="space-y-2">
        {vendors.map((v) => {
          const linked = statsByVendor.get(v.id);
          const linkedCount = linked?.count ?? 0;
          const linkedTotal = linked?.total ?? 0;

          const computedStatus =
            linkedCount > 0
              ? computeAggregateStatus(linked!.statuses)
              : v.status;

          const isAuto = linkedCount > 0;

          return (
            <div
              key={v.id}
              className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-gray-800 font-medium">{v.name}</p>

                  <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600">
                    {v.category}
                  </span>

                  {isAuto && (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                      <Link2 className="w-3 h-3" />
                      Vinculado ({linkedCount})
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 mt-1 text-sm text-gray-600 flex-wrap">
                  {v.phone && (
                    <span className="inline-flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {v.phone}
                    </span>
                  )}

                  {v.email && (
                    <span className="inline-flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {v.email}
                    </span>
                  )}

                  {isAuto && (
                    <span className="text-sm text-gray-700">
                      • Total no financeiro: <b>R$ {linkedTotal.toFixed(2)}</b>
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={computedStatus}
                  disabled={isAuto}
                  onChange={(e) =>
                    onStatusChange(v.id, e.target.value as VendorStatus)
                  }
                  className={`px-3 py-1 rounded text-sm font-medium ${VENDOR_STATUS[computedStatus].bg} ${VENDOR_STATUS[computedStatus].color} ${
                    isAuto ? 'opacity-90 cursor-not-allowed' : ''
                  }`}
                  title={isAuto ? 'Status vindo do Financeiro' : 'Status'}
                >
                  <option value="pending">Pendente</option>
                  <option value="confirmed">Confirmado</option>
                  <option value="paid">Pago</option>
                  <option value="cancelled">Cancelado</option>
                </select>

                <button
                  onClick={() => onDelete(v.id)}
                  className="p-1 text-red-600 hover:bg-red-50 rounded"
                  title="Remover fornecedor"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}

        {vendors.length === 0 && (
          <p className="text-gray-600 py-8 text-center">
            Nenhum fornecedor cadastrado.
          </p>
        )}
      </div>
    </div>
  );
}
