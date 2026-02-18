import React, { useMemo, useState } from 'react';
import {
  Mail,
  Phone,
  Plus,
  Trash2,
  Link2,
  AlertTriangle,
  FileText,
} from 'lucide-react';
import type { ExpenseStatus } from './BudgetTab';

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
  status?: ExpenseStatus; // aqui, usado só p/ cancelled na Opção 1
};

type PaymentBase = {
  id: string;
  expense_id: string;
  amount: number;
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
  TPayment extends PaymentBase,
> = {
  newVendor: TNewVendor;
  setNewVendor: React.Dispatch<React.SetStateAction<TNewVendor>>;
  onAdd: () => void | Promise<void>;

  vendors: TVendor[];
  expenses: TExpense[];
  payments: TPayment[];

  onStatusChange: (id: string, status: VendorStatus) => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;

  // integração
  onGoToVendorExpenses: (vendorId: string) => void;
  onGoToVendorDocuments?: (vendorId: string) => void;
  paymentReceiptCountByVendor?: ReadonlyMap<string, number>;

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

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function deriveExpenseStatus(
  storedStatus: ExpenseStatus | undefined,
  paidSum: number,
  value: number
): VendorStatus {
  if (storedStatus === 'cancelled') return 'cancelled';
  if (value > 0 && paidSum >= value) return 'paid';
  if (paidSum > 0) return 'confirmed';
  return 'pending';
}

function computeAggregateStatus(statuses: VendorStatus[]): VendorStatus {
  if (statuses.length === 0) return 'pending';

  const nonCancelled = statuses.filter((s) => s !== 'cancelled');

  if (nonCancelled.length === 0) return 'cancelled';
  if (nonCancelled.every((s) => s === 'paid')) return 'paid';

  if (nonCancelled.includes('pending')) return 'pending';
  if (nonCancelled.includes('confirmed')) return 'confirmed';

  return 'pending';
}

function formatPct(n: number) {
  if (!Number.isFinite(n)) return '0%';
  return `${Math.round(n)}%`;
}

export function VendorsTab<
  TVendor extends VendorBase,
  TNewVendor extends NewVendorBase,
  TExpense extends ExpenseBase,
  TPayment extends PaymentBase,
>({
  newVendor,
  setNewVendor,
  onAdd,
  vendors,
  expenses,
  payments,
  onStatusChange,
  onDelete,
  onGoToVendorExpenses,
  onGoToVendorDocuments,
  paymentReceiptCountByVendor,
  isBusy = false,
  busyText = 'Aguarde…',
}: Props<TVendor, TNewVendor, TExpense, TPayment>) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const paidByExpenseId = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of payments) {
      m.set(p.expense_id, (m.get(p.expense_id) ?? 0) + Number(p.amount || 0));
    }
    return m;
  }, [payments]);

  const statsByVendor = useMemo(() => {
    const map = new Map<
      string,
      {
        countAll: number;
        countActive: number;
        totalActive: number;
        paidActive: number;
        statuses: VendorStatus[];
      }
    >();

    for (const e of expenses) {
      const vid = e.vendor_id ?? null;
      if (!vid) continue;

      const value = Number(e.value || 0);
      const paid = paidByExpenseId.get(e.id) ?? 0;

      const st = deriveExpenseStatus(
        e.status ?? 'pending',
        paid,
        value
      );

      const cur = map.get(vid) ?? {
        countAll: 0,
        countActive: 0,
        totalActive: 0,
        paidActive: 0,
        statuses: [] as VendorStatus[],
      };

      cur.countAll += 1;
      cur.statuses.push(st);

      if (st !== 'cancelled') {
        cur.countActive += 1;
        cur.totalActive += value;
        cur.paidActive += clamp(paid, 0, value);
      }

      map.set(vid, cur);
    }

    return map;
  }, [expenses, paidByExpenseId]);

  const blocking = isBusy || isDeleting || isAdding;

  async function addVendorSafe() {
    if (blocking) return;
    try {
      setIsAdding(true);
      await onAdd();
    } finally {
      setIsAdding(false);
    }
  }

  async function confirmDelete() {
    if (!confirmTarget) return;
    try {
      setIsDeleting(true);
      await onDelete(confirmTarget.id);
      setConfirmOpen(false);
      setConfirmTarget(null);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 relative">
      {blocking && (
        <div className="absolute inset-0 z-40 bg-white/60 backdrop-blur-[1px] rounded-xl flex items-center justify-center">
          <div className="px-4 py-3 bg-white border border-gray-200 rounded-lg shadow-sm text-sm text-gray-700">
            {isDeleting ? 'Excluindo…' : isAdding ? 'Salvando…' : busyText}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-2 mb-4">
        <input
          value={newVendor.name}
          onChange={(e) =>
            setNewVendor((p) => ({ ...p, name: e.target.value }))
          }
          placeholder="Nome do fornecedor"
          className="md:col-span-3 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          disabled={blocking}
        />

        <input
          value={newVendor.category}
          onChange={(e) =>
            setNewVendor((p) => ({ ...p, category: e.target.value }))
          }
          placeholder="Categoria (ex: Fotografia)"
          className="md:col-span-3 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          disabled={blocking}
        />

        <input
          value={newVendor.phone}
          onChange={(e) =>
            setNewVendor((p) => ({ ...p, phone: e.target.value }))
          }
          placeholder="Telefone"
          className="md:col-span-2 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          disabled={blocking}
        />

        <input
          value={newVendor.email}
          onChange={(e) =>
            setNewVendor((p) => ({ ...p, email: e.target.value }))
          }
          placeholder="Email"
          className="md:col-span-3 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          disabled={blocking}
        />

        <button
          onClick={addVendorSafe}
          disabled={blocking}
          className={`md:col-span-1 px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors ${
            blocking ? 'opacity-60 cursor-not-allowed' : ''
          }`}
          title="Adicionar fornecedor"
          type="button"
        >
          <Plus className="w-5 h-5 mx-auto" />
        </button>
      </div>

      <div className="space-y-2">
        {vendors.map((v) => {
          const linked = statsByVendor.get(v.id);
          const countAll = linked?.countAll ?? 0;
          const countActive = linked?.countActive ?? 0;
          const totalActive = linked?.totalActive ?? 0;
          const paidActive = linked?.paidActive ?? 0;

          const computedStatus =
            countAll > 0 ? computeAggregateStatus(linked!.statuses) : v.status;
          const isAuto = countAll > 0;
          const receiptCount = paymentReceiptCountByVendor?.get(v.id) ?? 0;

          const badgeText =
            countAll === 1
              ? 'Vinculado (1 despesa)'
              : `Vinculado (${countAll} despesas)`;
          const receiptBadgeText =
            receiptCount === 1
              ? 'Vinculado (1 comprovante de pagamento)'
              : `Vinculado (${receiptCount} comprovantes de pagamento)`;

          const pct = totalActive > 0 ? (paidActive / totalActive) * 100 : 0;

          return (
            <div
              key={v.id}
              className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-gray-800 font-medium truncate">{v.name}</p>
                  <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600">
                    {v.category}
                  </span>

                  {countAll > 0 && (
                    <button
                      type="button"
                      onClick={() => onGoToVendorExpenses(v.id)}
                      disabled={blocking}
                      className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-100 transition ${
                        blocking ? 'opacity-60 cursor-not-allowed' : ''
                      }`}
                      title="Ver despesas desse fornecedor no Financeiro"
                    >
                      <Link2 className="w-3 h-3" />
                      {badgeText}
                    </button>
                  )}
                  {receiptCount > 0 && onGoToVendorDocuments && (
                    <button
                      type="button"
                      onClick={() => onGoToVendorDocuments(v.id)}
                      disabled={blocking}
                      className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100 transition ${
                        blocking ? 'opacity-60 cursor-not-allowed' : ''
                      }`}
                      title="Ver comprovantes desse fornecedor em Documentos"
                    >
                      <FileText className="w-3 h-3" />
                      {receiptBadgeText}
                    </button>
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
                </div>

                {countAll > 0 && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs text-gray-600">
                      <span>
                        Pago: <b>R$ {paidActive.toFixed(2)}</b> / Total:{' '}
                        <b>R$ {totalActive.toFixed(2)}</b>
                      </span>
                      <span className="text-gray-700 font-medium">
                        {formatPct(pct)}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full mt-1 overflow-hidden">
                      <div
                        className="h-2 bg-green-500 rounded-full"
                        style={{ width: `${clamp(pct, 0, 100)}%` }}
                      />
                    </div>
                    {countAll !== countActive && (
                      <div className="mt-1 text-xs text-gray-500">
                        Canceladas: {countAll - countActive}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={computedStatus}
                  disabled={isAuto || blocking}
                  onChange={(e) =>
                    onStatusChange(v.id, e.target.value as VendorStatus)
                  }
                  className={`px-3 py-1 rounded text-sm font-medium ${VENDOR_STATUS[computedStatus].bg} ${
                    VENDOR_STATUS[computedStatus].color
                  } ${isAuto || blocking ? 'opacity-90 cursor-not-allowed' : ''}`}
                  title={
                    isAuto
                      ? 'Status vindo dos pagamentos (Financeiro)'
                      : 'Status'
                  }
                >
                  <option value="pending">Pendente</option>
                  <option value="confirmed">Confirmado</option>
                  <option value="paid">Pago</option>
                  <option value="cancelled">Cancelado</option>
                </select>

                <button
                  onClick={() => {
                    setConfirmTarget({ id: v.id, name: v.name });
                    setConfirmOpen(true);
                  }}
                  disabled={blocking}
                  className={`p-1 text-red-600 hover:bg-red-50 rounded ${
                    blocking ? 'opacity-60 cursor-not-allowed' : ''
                  }`}
                  title="Remover fornecedor"
                  type="button"
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

      <ConfirmDialog
        open={confirmOpen}
        title="Excluir fornecedor?"
        description={
          confirmTarget
            ? `Tem certeza que deseja excluir “${confirmTarget.name}”? Se houver despesas vinculadas, elas continuarão existindo (mas podem perder o vínculo, dependendo do seu banco).`
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
