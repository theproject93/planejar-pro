import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

type ExpenseBase = {
  id: string;
  name: string;
  value: number;
  color: string;
};

type NewExpenseBase = {
  name: string;
  value: string; // bate com o seu state (string)
};

type Props<TExpense extends ExpenseBase, TNewExpense extends NewExpenseBase> = {
  expenses: TExpense[];
  setExpenses: React.Dispatch<React.SetStateAction<TExpense[]>>;

  newExpense: TNewExpense;
  setNewExpense: React.Dispatch<React.SetStateAction<TNewExpense>>;

  addExpense: () => void | Promise<void>;
  updateExpense: (
    expenseId: string,
    patch: { name?: string; value?: number }
  ) => void | Promise<void>;
  deleteExpense: (expenseId: string) => void | Promise<void>;

  totalSpent: number;
  toBRL: (value: number) => string;
};

export function BudgetTab<
  TExpense extends ExpenseBase,
  TNewExpense extends NewExpenseBase,
>({
  expenses,
  setExpenses,
  newExpense,
  setNewExpense,
  addExpense,
  updateExpense,
  deleteExpense,
  totalSpent,
  toBRL,
}: Props<TExpense, TNewExpense>) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex gap-2 mb-4">
        <input
          value={newExpense.name}
          onChange={(e) =>
            setNewExpense((p) => ({
              ...p,
              name: e.target.value,
            }))
          }
          placeholder="Categoria (ex: Buffet)"
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
        />

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
          className="w-36 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
        />

        <button
          onClick={() => addExpense()}
          className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors"
          title="Adicionar despesa"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 px-3 text-gray-700">Categoria</th>
              <th className="text-right py-2 px-3 text-gray-700">Valor</th>
              <th className="w-16" />
            </tr>
          </thead>

          <tbody>
            {expenses.map((e) => (
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
            ))}

            {expenses.length === 0 && (
              <tr>
                <td colSpan={3} className="py-4 text-gray-600 text-center">
                  Nenhuma despesa cadastrada.
                </td>
              </tr>
            )}
          </tbody>

          <tfoot>
            <tr>
              <td className="py-2 px-3 font-semibold text-gray-800">Total</td>
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
