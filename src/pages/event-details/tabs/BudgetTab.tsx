import React, { useMemo, useState } from 'react';
import {
  Plus,
  Trash2,
  X,
  AlertTriangle,
  CreditCard,
  Banknote,
  Receipt,
  Link2,
} from 'lucide-react';

export type ExpenseStatus = 'pending' | 'confirmed' | 'paid' | 'cancelled';

export type PaymentMethod =
  | 'pix'
  | 'dinheiro'
  | 'debito'
  | 'credito'
  | 'boleto'
  | 'transferencia'
  | 'outro';

const STATUS_UI: Record<
  ExpenseStatus,
  { label: string; color: string; bg: string }
> = {
  pending: { label: 'Pendente', color: 'text-amber-700', bg: 'bg-amber-100' },
  confirmed: { label: 'Parcial', color: 'text-blue-600', bg: 'bg-blue-100' },
  paid: { label: 'Pago', color: 'text-green-600', bg: 'bg-green-100' },
  cancelled: { label: 'Cancelado', color: 'text-red-600', bg: 'bg-red-100' },
};

const METHOD_UI: Record<PaymentMethod, { label: string }> = {
  pix: { label: 'Pix' },
  dinheiro: { label: 'Dinheiro' },
  debito: { label: 'Débito' },
  credito: { label: 'Crédito' },
  boleto: { label: 'Boleto' },
  transferencia: { label: 'Transferência' },
  outro: { label: 'Outro' },
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
  status?: ExpenseStatus; // aqui, usado só p/ "cancelled" na Opção 1
};

type NewExpenseBase = {
  name: string;
  value: string;
  vendor_id?: string;
  status?: ExpenseStatus; // compatibilidade com seu estado atual (vamos ignorar ao criar)
};

type PaymentBase = {
  id: string;
  expense_id: string;
  amount: number;
  method: PaymentMethod;
  paid_at: string; // YYYY-MM-DD
  note?: string | null;
};

type AddPaymentPayload = {
  amount: number;
  method: PaymentMethod;
  paid_at: string;
  note?: string | null;
};

type Props<
  TExpense extends ExpenseBase,
  TNewExpense extends NewExpenseBase,
  TVendor extends VendorBase,
  TPayment extends PaymentBase,
> = {
  vendors: TVendor[];

  expenses: TExpense[];
  setExpenses: React.Dispatch<React.SetStateAction<TExpense[]>>;

  payments: TPayment[];

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

  addPayment: (
    expenseId: string,
    payload: AddPaymentPayload
  ) => void | Promise<void>;
  deletePayment: (paymentId: string) => void | Promise<void>;

  totalSpent: number;
  toBRL: (value: number) => string;

  // integração: filtro vindo da aba Fornecedores
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

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function deriveExpenseStatus(
  storedStatus: ExpenseStatus | undefined,
  paidSum: number,
  value: number
): ExpenseStatus {
  if (storedStatus === 'cancelled') return 'cancelled';
  if (value > 0 && paidSum >= value) return 'paid';
  if (paidSum > 0) return 'confirmed';
  return 'pending';
}

function PaymentMethodIcon({ method }: { method: PaymentMethod }) {
  if (method === 'dinheiro') return <Banknote className="w-3 h-3" />;
  if (method === 'boleto') return <Receipt className="w-3 h-3" />;
  if (method === 'credito' || method === 'debito')
    return <CreditCard className="w-3 h-3" />;
  if (method === 'transferencia') return <Link2 className="w-3 h-3" />;
  return null;
}

export function BudgetTab<
  TExpense extends ExpenseBase,
  TNewExpense extends NewExpenseBase,
  TVendor extends VendorBase,
  TPayment extends PaymentBase,
>({
  vendors,
  expenses,
  setExpenses,
  payments,
  newExpense,
  setNewExpense,
  addExpense,
  updateExpense,
  deleteExpense,
  addPayment,
  deletePayment,
  totalSpent,
  toBRL,
  vendorFilterId,
  onClearVendorFilter,
  isBusy = false,
  busyText = 'Aguarde…',
}: Props<TExpense, TNewExpense, TVendor, TPayment>) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const [confirmPaymentOpen, setConfirmPaymentOpen] = useState(false);
  const [confirmPaymentTarget, setConfirmPaymentTarget] = useState<{
    id: string;
    title: string;
  } | null>(null);

  const [isDeletingExpense, setIsDeletingExpense] = useState(false);
  const [isAddingExpense, setIsAddingExpense] = useState(false);

  const [isAddingPaymentFor, setIsAddingPaymentFor] = useState<string | null>(
    null
  );
  const [isDeletingPayment, setIsDeletingPayment] = useState(false);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [paymentDraft, setPaymentDraft] = useState<
    Record<string, AddPaymentPayload>
  >({});

  const paidByExpenseId = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of payments) {
      m.set(p.expense_id, (m.get(p.expense_id) ?? 0) + Number(p.amount || 0));
    }
    return m;
  }, [payments]);

  const paymentsByExpenseId = useMemo(() => {
    const m = new Map<string, TPayment[]>();
    for (const p of payments) {
      const arr = m.get(p.expense_id) ?? [];
      arr.push(p);
      m.set(p.expense_id, arr);
    }
    for (const [k, arr] of m.entries()) {
      arr.sort((a, b) =>
        String(b.paid_at || '').localeCompare(String(a.paid_at || ''))
      );
      m.set(k, arr);
    }
    return m;
  }, [payments]);

  const visibleExpenses = useMemo(() => {
    return vendorFilterId
      ? expenses.filter((e) => (e.vendor_id ?? null) === vendorFilterId)
      : expenses;
  }, [expenses, vendorFilterId]);

  const visibleSubtotalNonCancelled = useMemo(() => {
    return visibleExpenses.reduce((sum, e) => {
      const st = (e.status ?? 'pending') as ExpenseStatus;
      if (st === 'cancelled') return sum;
      return sum + Number(e.value || 0);
    }, 0);
  }, [visibleExpenses]);

  const blocking =
    isBusy ||
    isDeletingExpense ||
    isAddingExpense ||
    isDeletingPayment ||
    isAddingPaymentFor !== null;

  function getDraft(expenseId: string): AddPaymentPayload {
    return (
      paymentDraft[expenseId] ?? {
        amount: 0,
        method: 'pix',
        paid_at: todayISO(),
        note: '',
      }
    );
  }

  async function addExpenseSafe() {
    if (blocking) return;
    try {
      setIsAddingExpense(true);
      await addExpense();
    } finally {
      setIsAddingExpense(false);
    }
  }

  async function confirmDeleteExpense() {
    if (!confirmTarget) return;
    try {
      setIsDeletingExpense(true);
      await deleteExpense(confirmTarget.id);
      setConfirmOpen(false);
      setConfirmTarget(null);
    } finally {
      setIsDeletingExpense(false);
    }
  }

  async function addPaymentSafe(expenseId: string) {
    if (blocking) return;

    const d = getDraft(expenseId);
    const amount = Number(d.amount);

    if (!Number.isFinite(amount) || amount <= 0) return;

    try {
      setIsAddingPaymentFor(expenseId);
      await addPayment(expenseId, {
        amount,
        method: d.method,
        paid_at: d.paid_at || todayISO(),
        note: (d.note ?? '').trim() || null,
      });

      setPaymentDraft((prev) => ({
        ...prev,
        [expenseId]: {
          amount: 0,
          method: d.method,
          paid_at: d.paid_at || todayISO(),
          note: '',
        },
      }));
    } finally {
      setIsAddingPaymentFor(null);
    }
  }

  async function confirmDeletePayment() {
    if (!confirmPaymentTarget) return;
    try {
      setIsDeletingPayment(true);
      await deletePayment(confirmPaymentTarget.id);
      setConfirmPaymentOpen(false);
      setConfirmPaymentTarget(null);
    } finally {
      setIsDeletingPayment(false);
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 relative">
      {blocking && (
        <div className="absolute inset-0 z-40 bg-white/60 backdrop-blur-[1px] rounded-xl flex items-center justify-center">
          <div className="px-4 py-3 bg-white border border-gray-200 rounded-lg shadow-sm text-sm text-gray-700">
            {isDeletingExpense
              ? 'Excluindo…'
              : isAddingExpense
                ? 'Salvando…'
                : isDeletingPayment
                  ? 'Excluindo pagamento…'
                  : isAddingPaymentFor
                    ? 'Salvando pagamento…'
                    : busyText}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-800">Despesas</h3>
          <p className="text-xs text-gray-500">
            Status é calculado pelos <b>pagamentos</b>. Você só marca
            manualmente quando <b>cancelar</b>.
          </p>
        </div>

        {vendorFilterId && onClearVendorFilter && (
          <button
            type="button"
            onClick={onClearVendorFilter}
            disabled={blocking}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-100 disabled:opacity-60"
            title="Limpar filtro do fornecedor"
          >
            <X className="w-4 h-4" />
            Limpar filtro
          </button>
        )}
      </div>

      {/* Form adicionar despesa */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-2 mb-4">
        <input
          value={newExpense.name}
          onChange={(e) =>
            setNewExpense((p) => ({ ...p, name: e.target.value }))
          }
          placeholder="Categoria (ex: DJ, Buffet, Foto)"
          className="md:col-span-4 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          disabled={blocking}
        />

        <select
          value={newExpense.vendor_id ?? ''}
          onChange={(e) =>
            setNewExpense((p) => ({ ...p, vendor_id: e.target.value }))
          }
          className="md:col-span-4 px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-pink-500 focus:border-transparent"
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

        <input
          value={newExpense.value}
          onChange={(e) =>
            setNewExpense((p) => ({ ...p, value: e.target.value }))
          }
          placeholder="Valor"
          type="number"
          className="md:col-span-3 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          onKeyDown={(e) => {
            if (e.key === 'Enter') addExpenseSafe();
          }}
          disabled={blocking}
        />

        <button
          onClick={addExpenseSafe}
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
              <th className="text-right py-2 px-3 text-gray-700">Pago</th>
              <th className="w-24" />
            </tr>
          </thead>

          <tbody>
            {visibleExpenses.map((e) => {
              const storedStatus = (e.status ?? 'pending') as ExpenseStatus;
              const isCancelled = storedStatus === 'cancelled';

              const paid = paidByExpenseId.get(e.id) ?? 0;
              const value = Number(e.value || 0);
              const derived = deriveExpenseStatus(storedStatus, paid, value);

              const remaining = clamp(value - paid, 0, value);

              const vendorName =
                e.vendor_id && vendors.find((v) => v.id === e.vendor_id)
                  ? vendors.find((v) => v.id === e.vendor_id)!.name
                  : null;

              const isExpanded = !!expanded[e.id];
              const pList = paymentsByExpenseId.get(e.id) ?? [];

              return (
                <React.Fragment key={e.id}>
                  <tr className={`border-b ${isCancelled ? 'opacity-60' : ''}`}>
                    <td className="py-2 px-3 align-top">
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
                                  ? ({
                                      ...x,
                                      name: ev.target.value,
                                    } as TExpense)
                                  : x
                              )
                            )
                          }
                          onBlur={(ev) =>
                            updateExpense(e.id, {
                              name: ev.target.value.trim(),
                            })
                          }
                          className={`w-full bg-transparent focus:outline-none ${
                            isCancelled ? 'line-through text-gray-600' : ''
                          }`}
                          disabled={blocking}
                        />
                      </div>

                      {vendorName && (
                        <div className="text-xs text-gray-500 mt-1">
                          <span className="inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                            {vendorName}
                          </span>
                        </div>
                      )}
                    </td>

                    <td className="py-2 px-3 align-top">
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

                    <td className="py-2 px-3 align-top">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium ${STATUS_UI[derived].bg} ${STATUS_UI[derived].color}`}
                          title="Derivado pelos pagamentos (cancelamento é manual)"
                        >
                          {STATUS_UI[derived].label}
                        </span>

                        <select
                          value={isCancelled ? 'cancelled' : 'active'}
                          onChange={(ev) => {
                            const v = ev.target.value;
                            const next =
                              v === 'cancelled'
                                ? ('cancelled' as ExpenseStatus)
                                : ('pending' as ExpenseStatus);

                            setExpenses((prev) =>
                              prev.map((x) =>
                                x.id === e.id
                                  ? ({ ...x, status: next } as TExpense)
                                  : x
                              )
                            );

                            updateExpense(e.id, { status: next });
                          }}
                          disabled={blocking}
                          className="px-2 py-1.5 border border-gray-200 rounded-lg bg-white text-sm"
                          title="Ativar / cancelar despesa"
                        >
                          <option value="active">Ativa</option>
                          <option value="cancelled">Cancelada</option>
                        </select>
                      </div>
                    </td>

                    <td className="py-2 px-3 text-right align-top">
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

                    <td className="py-2 px-3 text-right align-top">
                      <div className="text-sm font-medium text-gray-800">
                        {toBRL(paid)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {isCancelled ? '—' : `aberto: ${toBRL(remaining)}`}
                      </div>
                    </td>

                    <td className="py-2 px-3 text-right align-top">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            setExpanded((p) => ({ ...p, [e.id]: !p[e.id] }))
                          }
                          disabled={blocking}
                          className={`px-2 py-1 rounded-lg text-xs border ${
                            isExpanded
                              ? 'bg-gray-900 text-white border-gray-900'
                              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                          } ${blocking ? 'opacity-60 cursor-not-allowed' : ''}`}
                          title="Ver / adicionar pagamentos"
                        >
                          Pagamentos
                        </button>

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
                      </div>
                    </td>
                  </tr>

                  {isExpanded && (
                    <tr className="border-b bg-gray-50/60">
                      <td colSpan={6} className="px-3 py-3">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
                          <div className="lg:col-span-3">
                            <label className="block text-xs text-gray-600 mb-1">
                              Valor pago
                            </label>
                            <input
                              type="number"
                              value={getDraft(e.id).amount || ''}
                              onChange={(ev) =>
                                setPaymentDraft((prev) => ({
                                  ...prev,
                                  [e.id]: {
                                    ...getDraft(e.id),
                                    amount: Number(ev.target.value),
                                  },
                                }))
                              }
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm"
                              placeholder="Ex: 500"
                              disabled={blocking || isCancelled}
                            />
                          </div>

                          <div className="lg:col-span-3">
                            <label className="block text-xs text-gray-600 mb-1">
                              Método
                            </label>
                            <select
                              value={getDraft(e.id).method}
                              onChange={(ev) =>
                                setPaymentDraft((prev) => ({
                                  ...prev,
                                  [e.id]: {
                                    ...getDraft(e.id),
                                    method: ev.target.value as PaymentMethod,
                                  },
                                }))
                              }
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm"
                              disabled={blocking || isCancelled}
                            >
                              {Object.keys(METHOD_UI).map((k) => (
                                <option key={k} value={k}>
                                  {METHOD_UI[k as PaymentMethod].label}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="lg:col-span-3">
                            <label className="block text-xs text-gray-600 mb-1">
                              Data
                            </label>
                            <input
                              type="date"
                              value={getDraft(e.id).paid_at}
                              onChange={(ev) =>
                                setPaymentDraft((prev) => ({
                                  ...prev,
                                  [e.id]: {
                                    ...getDraft(e.id),
                                    paid_at: ev.target.value,
                                  },
                                }))
                              }
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm"
                              disabled={blocking || isCancelled}
                            />
                          </div>

                          <div className="lg:col-span-2">
                            <button
                              type="button"
                              onClick={() => addPaymentSafe(e.id)}
                              disabled={blocking || isCancelled}
                              className={`w-full px-3 py-2 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white ${
                                blocking || isCancelled
                                  ? 'opacity-60 cursor-not-allowed'
                                  : ''
                              }`}
                              title={
                                isCancelled
                                  ? 'Despesa cancelada não recebe pagamentos'
                                  : 'Adicionar pagamento'
                              }
                            >
                              Adicionar
                            </button>
                          </div>

                          <div className="lg:col-span-12">
                            <label className="block text-xs text-gray-600 mb-1">
                              Observação (opcional)
                            </label>
                            <input
                              value={getDraft(e.id).note ?? ''}
                              onChange={(ev) =>
                                setPaymentDraft((prev) => ({
                                  ...prev,
                                  [e.id]: {
                                    ...getDraft(e.id),
                                    note: ev.target.value,
                                  },
                                }))
                              }
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm"
                              placeholder="Ex: sinal / entrada / 2ª parcela"
                              disabled={blocking || isCancelled}
                            />
                          </div>
                        </div>

                        <div className="mt-3">
                          {pList.length === 0 ? (
                            <p className="text-sm text-gray-600">
                              Nenhum pagamento registrado ainda.
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {pList.map((p) => (
                                <div
                                  key={p.id}
                                  className="flex items-center gap-3 p-3 rounded-lg bg-white border border-gray-200"
                                >
                                  <div className="text-sm font-semibold text-gray-900">
                                    {toBRL(Number(p.amount || 0))}
                                  </div>

                                  <span className="text-xs text-gray-500">
                                    •
                                  </span>

                                  <div className="text-sm text-gray-700">
                                    {p.paid_at}
                                  </div>

                                  <span className="text-xs text-gray-500">
                                    •
                                  </span>

                                  <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">
                                    <PaymentMethodIcon method={p.method} />
                                    {METHOD_UI[p.method].label}
                                  </span>

                                  {p.note ? (
                                    <>
                                      <span className="text-xs text-gray-500">
                                        •
                                      </span>
                                      <div
                                        className="text-sm text-gray-600 truncate max-w-[420px]"
                                        title={p.note}
                                      >
                                        {p.note}
                                      </div>
                                    </>
                                  ) : null}

                                  <div className="flex-1" />

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setConfirmPaymentTarget({
                                        id: p.id,
                                        title: `${toBRL(Number(p.amount || 0))} • ${
                                          METHOD_UI[p.method].label
                                        } • ${p.paid_at}`,
                                      });
                                      setConfirmPaymentOpen(true);
                                    }}
                                    disabled={blocking}
                                    className={`p-1 text-red-600 hover:bg-red-50 rounded ${
                                      blocking
                                        ? 'opacity-60 cursor-not-allowed'
                                        : ''
                                    }`}
                                    title="Remover pagamento"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}

            {visibleExpenses.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-gray-600 text-center">
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
              <td />
            </tr>

            <tr>
              <td colSpan={6} className="pt-2 px-3 text-xs text-gray-500">
                * Despesas <b>canceladas</b> não contam como gasto. Status{' '}
                <b>Parcial/Pago</b> é derivado dos pagamentos.
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
        loading={isDeletingExpense}
        onClose={() => {
          if (isDeletingExpense) return;
          setConfirmOpen(false);
          setConfirmTarget(null);
        }}
        onConfirm={confirmDeleteExpense}
      />

      <ConfirmDialog
        open={confirmPaymentOpen}
        title="Excluir pagamento?"
        description={
          confirmPaymentTarget
            ? `Remover este pagamento: ${confirmPaymentTarget.title}?`
            : undefined
        }
        confirmText="Excluir"
        cancelText="Cancelar"
        tone="danger"
        loading={isDeletingPayment}
        onClose={() => {
          if (isDeletingPayment) return;
          setConfirmPaymentOpen(false);
          setConfirmPaymentTarget(null);
        }}
        onConfirm={confirmDeletePayment}
      />
    </div>
  );
}
