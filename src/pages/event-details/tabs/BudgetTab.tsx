import React, { useMemo, useState } from 'react';
import { Plus, Trash2, X, AlertTriangle } from 'lucide-react';

export type ExpenseStatus = 'pending' | 'confirmed' | 'paid' | 'cancelled';

const STATUS_UI: Record<
  ExpenseStatus,
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
};

type ExpenseBase = {
  id: string;
  name: string;
  value: number;
  color: string;
  vendor_id?: string | null;
  status?: ExpenseStatus;
};

type NewExpenseBase = {
  name: string;
  value: string;
  vendor_id?: string;
  status?: ExpenseStatus;
};

type Props<
  TExpense extends ExpenseBase,
  TNewExpense extends NewExpenseBase,
  TVendor extends VendorBase,
> = {
  vendors: TVendor[];

  expenses: TExpense[];
  setExpenses: React.Dispatch<React.SetStateAction<TExpense[]>>;

  newExpense: TNewExpense;
  setNewExpense: React.Dispatch<React.SetStateAction<TNewExpense>>;

  addExpense: () => void | Promise<void>;
  updateExpense: (
    expenseId: string,
    patch: {
      name?: string;
      value?: number;
      vendor_id?: string | null;
      status?: ExpenseStatus;
    }
  ) => void | Promise<void>;
  deleteExpense: (expenseId: string) => void | Promise<void>;

  // total global (idealmente já excluindo canceladas no EventDetailsPage)
  totalSpent: number;
  toBRL: (value: number) => string;

  // integração
  vendorFilterId?: string | null;
  onClearVendorFilter?: () => void;

  // UX premium
  isBusy?: boolean;
  busyText?: string;
};

function ConfirmDialog({
  open,
  title,
  description,
  confirmText = 'Excluir',
  cancelText = 'Cancelar',
  tone = 'danger',
  onClose,
  onConfirm,
  loading,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  tone?: 'danger' | 'default';
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
}) {
  if (!open) return null;

  const confirmClasses =
    tone === 'danger'
      ? 'bg-red-600 hover:bg-red-700 text-white'
      : 'bg-gray-900 hover:bg-gray-800 text-white';

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
        onClick={() => {
          if (!loading) onClose();
        }}
      />

      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-gray-100 overflow-hidden">
        <div className="p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-700 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900">{title}</h3>
              {description ? (
                <p className="mt-1 text-sm text-gray-600">{description}</p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="px-5 pb-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={!!loading}
            className="px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100 disabled:opacity-60"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!!loading}
            className={`px-4 py-2 rounded-lg font-medium disabled:opacity-60 ${confirmClasses}`}
          >
            {loading ? 'Aguarde…' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export function BudgetTab<
  TExpense extends ExpenseBase,
  TNewExpense extends NewExpenseBase,
  TVendor extends VendorBase,
>({
  vendors,
  expenses,
  setExpenses,
  newExpense,
  setNewExpense,
  addExpense,
  updateExpense,
  deleteExpense,
  totalSpent,
  toBRL,
  vendorFilterId = null,
  onClearVendorFilter,
  isBusy = false,
  busyText = 'Salvando…',
}: Props<TExpense, TNewExpense, TVendor>) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const vendorName = useMemo(() => {
    if (!vendorFilterId) return null;
    return vendors.find((v) => v.id === vendorFilterId)?.name ?? null;
  }, [vendorFilterId, vendors]);

  const visibleExpenses = useMemo(() => {
    if (!vendorFilterId) return expenses;
    return expenses.filter((e) => (e.vendor_id ?? null) === vendorFilterId);
  }, [expenses, vendorFilterId]);

  const visibleSubtotalNonCancelled = useMemo(() => {
    return visibleExpenses
      .filter((e) => (e.status ?? 'pending') !== 'cancelled')
      .reduce((sum, e) => sum + Number(e.value || 0), 0);
  }, [visibleExpenses]);

  const blocking = isBusy || isDeleting;

  async function confirmDelete() {
    if (!confirmTarget) return;
    try {
      setIsDeleting(true);
      await deleteExpense(confirmTarget.id);
      setConfirmOpen(false);
      setConfirmTarget(null);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 relative">
      {/* Overlay de bloqueio */}
      {blocking && (
        <div className="absolute inset-0 z-40 bg-white/60 backdrop-blur-[1px] rounded-xl flex items-center justify-center">
          <div className="px-4 py-3 bg-white border border-gray-200 rounded-lg shadow-sm text-sm text-gray-700">
            {isDeleting ? 'Excluindo…' : busyText}
          </div>
        </div>
      )}

      {/* Chip de filtro por fornecedor */}
      {vendorFilterId && (
        <div className="mb-4 flex items-center justify-between gap-3 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-lg px-3 py-2 text-sm">
          <span className="truncate">
            Filtrando por fornecedor: <b>{vendorName ?? '—'}</b>
          </span>

          {onClearVendorFilter && (
            <button
              onClick={onClearVendorFilter}
              className="inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-indigo-100 transition"
              title="Limpar filtro"
              type="button"
              disabled={blocking}
            >
              <X className="w-4 h-4" />
              Limpar
            </button>
          )}
        </div>
      )}

      {/* Form */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-2 mb-4">
        <input
          value={newExpense.name}
          onChange={(e) =>
            setNewExpense((p) => ({ ...p, name: e.target.value }))
          }
          placeholder="Categoria (ex: Buffet)"
          className="md:col-span-4 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          onKeyDown={(e) => {
            if (e.key === 'Enter') addExpense();
          }}
          disabled={blocking}
        />

        <select
          value={newExpense.vendor_id ?? ''}
          onChange={(e) =>
            setNewExpense((p) => ({ ...p, vendor_id: e.target.value || '' }))
          }
          className="md:col-span-3 px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          title="Fornecedor (opcional)"
          disabled={blocking}
        >
          <option value="">Fornecedor (opcional)</option>
          {vendors.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name} • {v.category}
            </option>
          ))}
        </select>

        <select
          value={(newExpense.status ?? 'pending') as ExpenseStatus}
          onChange={(e) =>
            setNewExpense((p) => ({
              ...p,
              status: e.target.value as ExpenseStatus,
            }))
          }
          className="md:col-span-2 px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          title="Status"
          disabled={blocking}
        >
          <option value="pending">Pendente</option>
          <option value="confirmed">Confirmado</option>
          <option value="paid">Pago</option>
          <option value="cancelled">Cancelado</option>
        </select>

        <input
          value={newExpense.value}
          onChange={(e) =>
            setNewExpense((p) => ({ ...p, value: e.target.value }))
          }
          placeholder="Valor"
          type="number"
          className="md:col-span-2 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          onKeyDown={(e) => {
            if (e.key === 'Enter') addExpense();
          }}
          disabled={blocking}
        />

        <button
          onClick={() => addExpense()}
          disabled={blocking}
          className={`md:col-span-1 px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors ${
            blocking ? 'opacity-60 cursor-not-allowed' : ''
          }`}
          title="Adicionar despesa"
          type="button"
        >
          <Plus className="w-5 h-5 mx-auto" />
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 px-3 text-gray-700">Categoria</th>
              <th className="text-left py-2 px-3 text-gray-700">Fornecedor</th>
              <th className="text-left py-2 px-3 text-gray-700">Status</th>
              <th className="text-right py-2 px-3 text-gray-700">Valor</th>
              <th className="w-16" />
            </tr>
          </thead>

          <tbody>
            {visibleExpenses.map((e) => {
              const status = (e.status ?? 'pending') as ExpenseStatus;
              const isCancelled = status === 'cancelled';

              return (
                <tr
                  key={e.id}
                  className={`border-b ${isCancelled ? 'opacity-60' : ''}`}
                >
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: e.color }}
                      />

                      <input
                        value={e.name}
                        onChange={(ev) =>
                          setExpenses((prev) =>
                            prev.map((x) =>
                              x.id === e.id
                                ? ({ ...x, name: ev.target.value } as TExpense)
                                : x
                            )
                          )
                        }
                        onBlur={(ev) =>
                          updateExpense(e.id, { name: ev.target.value.trim() })
                        }
                        className={`w-full bg-transparent focus:outline-none ${
                          isCancelled ? 'line-through text-gray-600' : ''
                        }`}
                        disabled={blocking}
                      />
                    </div>
                  </td>

                  <td className="py-2 px-3">
                    <select
                      value={e.vendor_id ?? ''}
                      onChange={(ev) => {
                        const vendor_id = ev.target.value || null;

                        setExpenses((prev) =>
                          prev.map((x) =>
                            x.id === e.id
                              ? ({ ...x, vendor_id } as TExpense)
                              : x
                          )
                        );

                        updateExpense(e.id, { vendor_id });
                      }}
                      className="w-full px-3 py-1.5 border border-gray-200 rounded-lg bg-white text-sm"
                      title="Fornecedor"
                      disabled={blocking}
                    >
                      <option value="">—</option>
                      {vendors.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name} • {v.category}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className="py-2 px-3">
                    <select
                      value={status}
                      onChange={(ev) => {
                        const st = ev.target.value as ExpenseStatus;

                        setExpenses((prev) =>
                          prev.map((x) =>
                            x.id === e.id
                              ? ({ ...x, status: st } as TExpense)
                              : x
                          )
                        );

                        updateExpense(e.id, { status: st });
                      }}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium ${STATUS_UI[status].bg} ${
                        STATUS_UI[status].color
                      }`}
                      title="Status"
                      disabled={blocking}
                    >
                      <option value="pending">Pendente</option>
                      <option value="confirmed">Confirmado</option>
                      <option value="paid">Pago</option>
                      <option value="cancelled">Cancelado</option>
                    </select>
                  </td>

                  <td className="py-2 px-3 text-right">
                    <input
                      value={e.value}
                      type="number"
                      onChange={(ev) =>
                        setExpenses((prev) =>
                          prev.map((x) =>
                            x.id === e.id
                              ? ({
                                  ...x,
                                  value: Number(ev.target.value),
                                } as TExpense)
                              : x
                          )
                        )
                      }
                      onBlur={(ev) =>
                        updateExpense(e.id, {
                          value: Number(ev.target.value) || 0,
                        })
                      }
                      className={`w-40 text-right bg-transparent focus:outline-none ${
                        isCancelled ? 'text-gray-600' : ''
                      }`}
                      disabled={blocking}
                    />
                  </td>

                  <td className="py-2 px-3 text-right">
                    <button
                      onClick={() => {
                        setConfirmTarget({ id: e.id, name: e.name });
                        setConfirmOpen(true);
                      }}
                      disabled={blocking}
                      className={`p-1 text-red-600 hover:bg-red-50 rounded ${
                        blocking ? 'opacity-60 cursor-not-allowed' : ''
                      }`}
                      title="Remover despesa"
                      type="button"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}

            {visibleExpenses.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-gray-600 text-center">
                  Nenhuma despesa encontrada.
                </td>
              </tr>
            )}
          </tbody>

          <tfoot>
            {vendorFilterId && (
              <tr className="border-t">
                <td className="py-2 px-3 font-semibold text-gray-700">
                  Subtotal (filtro)
                </td>
                <td />
                <td />
                <td className="py-2 px-3 text-right font-semibold text-gray-800">
                  {toBRL(visibleSubtotalNonCancelled)}
                </td>
                <td />
              </tr>
            )}

            <tr className="border-t">
              <td className="py-2 px-3 font-semibold text-gray-800">Total</td>
              <td />
              <td />
              <td className="py-2 px-3 text-right font-semibold text-gray-800">
                {toBRL(totalSpent)}
              </td>
              <td />
            </tr>

            <tr>
              <td colSpan={5} className="pt-2 px-3 text-xs text-gray-500">
                * Despesas <b>canceladas</b> não devem contar como gasto.
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Excluir despesa?"
        description={
          confirmTarget
            ? `Tem certeza que deseja excluir “${confirmTarget.name}”? Essa ação não pode ser desfeita.`
            : undefined
        }
        confirmText="Excluir"
        cancelText="Cancelar"
        tone="danger"
        loading={isDeleting}
        onClose={() => {
          if (isDeleting) return;
          setConfirmOpen(false);
          setConfirmTarget(null);
        }}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
