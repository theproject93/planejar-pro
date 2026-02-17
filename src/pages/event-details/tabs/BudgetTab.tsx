import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

type ExpenseStatus = 'pending' | 'confirmed' | 'paid' | 'cancelled';

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

  totalSpent: number;
  toBRL: (value: number) => string;
};

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
}: Props<TExpense, TNewExpense, TVendor>) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-2 mb-4">
        <input
          value={newExpense.name}
          onChange={(e) =>
            setNewExpense((p) => ({
              ...p,
              name: e.target.value,
            }))
          }
          placeholder="Categoria (ex: Buffet)"
          className="md:col-span-4 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          onKeyDown={(e) => {
            if (e.key === 'Enter') addExpense();
          }}
        />

        <select
          value={newExpense.vendor_id ?? ''}
          onChange={(e) =>
            setNewExpense((p) => ({
              ...p,
              vendor_id: e.target.value || '',
            }))
          }
          className="md:col-span-3 px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          title="Fornecedor (opcional)"
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
        >
          <option value="pending">Pendente</option>
          <option value="confirmed">Confirmado</option>
          <option value="paid">Pago</option>
          <option value="cancelled">Cancelado</option>
        </select>

        <input
          value={newExpense.value}
          onChange={(e) =>
            setNewExpense((p) => ({
              ...p,
              value: e.target.value,
            }))
          }
          placeholder="Valor"
          type="number"
          className="md:col-span-2 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          onKeyDown={(e) => {
            if (e.key === 'Enter') addExpense();
          }}
        />

        <button
          onClick={() => addExpense()}
          className="md:col-span-1 px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors"
          title="Adicionar despesa"
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
            {expenses.map((e) => {
              const status = (e.status ?? 'pending') as ExpenseStatus;

              return (
                <tr key={e.id} className="border-b">
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
                        className="w-full bg-transparent focus:outline-none"
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
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium ${STATUS_UI[status].bg} ${STATUS_UI[status].color}`}
                      title="Status"
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
                      className="w-40 text-right bg-transparent focus:outline-none"
                    />
                  </td>

                  <td className="py-2 px-3 text-right">
                    <button
                      onClick={() => deleteExpense(e.id)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                      title="Remover despesa"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}

            {expenses.length === 0 && (
              <tr>
                <td colSpan={5} className="py-4 text-gray-600 text-center">
                  Nenhuma despesa cadastrada.
                </td>
              </tr>
            )}
          </tbody>

          <tfoot>
            <tr>
              <td className="py-2 px-3 font-semibold text-gray-800">Total</td>
              <td />
              <td />
              <td className="py-2 px-3 text-right font-semibold text-gray-800">
                {toBRL(totalSpent)}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
