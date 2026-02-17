import React from 'react';
import { Mail, Phone, Plus, Trash2 } from 'lucide-react';

type VendorStatus = 'pending' | 'confirmed' | 'paid' | 'cancelled';

const VENDOR_STATUS: Record<
  VendorStatus,
  { label: string; color: string; bg: string }
> = {
  pending: { label: 'Pendente', color: 'text-gray-600', bg: 'bg-gray-100' },
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

type NewVendorBase = {
  name: string;
  category: string;
  phone: string;
  email: string;
};

type Props<TVendor extends VendorBase, TNewVendor extends NewVendorBase> = {
  newVendor: TNewVendor;
  setNewVendor: React.Dispatch<React.SetStateAction<TNewVendor>>;
  onAdd: () => void | Promise<void>;

  vendors: TVendor[];
  onStatusChange: (id: string, status: VendorStatus) => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
};

export function VendorsTab<
  TVendor extends VendorBase,
  TNewVendor extends NewVendorBase,
>({
  newVendor,
  setNewVendor,
  onAdd,
  vendors,
  onStatusChange,
  onDelete,
}: Props<TVendor, TNewVendor>) {
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
        {vendors.map((v) => (
          <div
            key={v.id}
            className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-gray-800 font-medium">{v.name}</p>
                <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600">
                  {v.category}
                </span>
              </div>

              <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
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
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={v.status}
                onChange={(e) =>
                  onStatusChange(v.id, e.target.value as VendorStatus)
                }
                className={`px-3 py-1 rounded text-sm font-medium ${VENDOR_STATUS[v.status].bg} ${VENDOR_STATUS[v.status].color}`}
                title="Status"
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
        ))}

        {vendors.length === 0 && (
          <p className="text-gray-600 py-8 text-center">
            Nenhum fornecedor cadastrado.
          </p>
        )}
      </div>
    </div>
  );
}
