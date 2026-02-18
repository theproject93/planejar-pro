import React, { useMemo, useState } from 'react';
import {
  Download,
  FileText,
  Trash2,
  Upload,
  Link2,
  X,
  AlertTriangle,
} from 'lucide-react';

type VendorItem = {
  id: string;
  name: string;
  category: string;
};

type DocumentItem = {
  id: string;
  name: string;
  file_url: string;
  file_type?: string | null;
  category?: string | null;
  vendor_id?: string | null; // 🔥 novo
};

type Props<TDoc extends DocumentItem, TVendor extends VendorItem> = {
  docInputRef: React.RefObject<HTMLInputElement | null>;
  uploadingDoc: boolean;
  onPickFile: (file: File) => void | Promise<void>;

  documents: TDoc[];
  onDelete: (id: string) => void | Promise<void>;

  // 🔥 novos
  vendors: TVendor[];
  onUpdateDocument: (
    id: string,
    patch: Partial<Pick<TDoc, 'vendor_id' | 'category' | 'name'>>
  ) => void | Promise<void>;

  // filtro (para vir da aba fornecedores)
  vendorFilterId?: string | null;
  onClearVendorFilter?: () => void;
  paymentReceiptDocumentId?: string | null;
  onClearPaymentReceiptFilter?: () => void;
};

function ConfirmDialog({
  open,
  title,
  description,
  confirmText = 'Excluir',
  cancelText = 'Cancelar',
  onClose,
  onConfirm,
  loading,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
}) {
  if (!open) return null;

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
            className="px-4 py-2 rounded-lg font-medium bg-red-600 hover:bg-red-700 text-white disabled:opacity-60"
          >
            {loading ? 'Aguarde…' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export function DocumentsTab<
  TDoc extends DocumentItem,
  TVendor extends VendorItem,
>({
  docInputRef,
  uploadingDoc,
  onPickFile,
  documents,
  onDelete,
  vendors,
  onUpdateDocument,
  vendorFilterId = null,
  onClearVendorFilter,
  paymentReceiptDocumentId = null,
  onClearPaymentReceiptFilter,
}: Props<TDoc, TVendor>) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<TDoc | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const vendorName = useMemo(() => {
    if (!vendorFilterId) return null;
    return vendors.find((v) => v.id === vendorFilterId)?.name ?? null;
  }, [vendorFilterId, vendors]);

  const visibleDocs = useMemo(() => {
    let filtered = documents;
    if (vendorFilterId) {
      filtered = filtered.filter((d) => (d.vendor_id ?? null) === vendorFilterId);
    }
    if (paymentReceiptDocumentId) {
      filtered = filtered.filter((d) => d.id === paymentReceiptDocumentId);
    }
    return filtered;
  }, [documents, vendorFilterId, paymentReceiptDocumentId]);

  const blocking = uploadingDoc || isDeleting;

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
            {isDeleting ? 'Excluindo…' : 'Enviando documento…'}
          </div>
        </div>
      )}

      {paymentReceiptDocumentId && (
        <div className="mb-4 flex items-center justify-between gap-3 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-lg px-3 py-2 text-sm">
          <span className="truncate inline-flex items-center gap-2">
            <Link2 className="w-4 h-4" />
            Comprovante de pagamento vinculado
          </span>

          {onClearPaymentReceiptFilter && (
            <button
              onClick={onClearPaymentReceiptFilter}
              className="inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-emerald-100 transition"
              title="Limpar filtro de comprovante"
              type="button"
              disabled={blocking}
            >
              <X className="w-4 h-4" />
              Limpar
            </button>
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Excluir documento?"
        description={
          confirmTarget
            ? `Tem certeza que deseja excluir “${confirmTarget.name}”? Essa ação não pode ser desfeita.`
            : undefined
        }
        confirmText="Excluir"
        cancelText="Cancelar"
        loading={isDeleting}
        onClose={() => {
          if (isDeleting) return;
          setConfirmOpen(false);
          setConfirmTarget(null);
        }}
        onConfirm={confirmDelete}
      />

      {/* Chip filtro */}
      {vendorFilterId && (
        <div className="mb-4 flex items-center justify-between gap-3 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-lg px-3 py-2 text-sm">
          <span className="truncate inline-flex items-center gap-2">
            <Link2 className="w-4 h-4" />
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

      <input
        ref={docInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPickFile(f);
          e.currentTarget.value = '';
        }}
      />

      <button
        onClick={() => docInputRef.current?.click()}
        disabled={blocking}
        className="w-full mb-4 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-pink-500 hover:bg-pink-50 transition-colors flex items-center justify-center gap-2 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Upload className="w-5 h-5" />
        {uploadingDoc
          ? 'Enviando documento...'
          : 'Upload de documento (PDF, DOC, Imagem)'}
      </button>

      <div className="space-y-2">
        {visibleDocs.map((doc) => (
          <div
            key={doc.id}
            className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg"
          >
            <FileText className="w-8 h-8 text-gray-600" />

            <div className="flex-1 min-w-0">
              <p className="text-gray-800 font-medium truncate">{doc.name}</p>

              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600">
                  {doc.category || 'Outros'}
                </span>

                <select
                  value={doc.vendor_id ?? ''}
                  disabled={blocking}
                  onChange={(e) => {
                    const vendor_id = e.target.value || null;
                    onUpdateDocument(doc.id, { vendor_id });
                  }}
                  className="text-xs px-2 py-1 rounded border border-gray-200 bg-white text-gray-700"
                  title="Vincular a fornecedor"
                >
                  <option value="">Fornecedor (nenhum)</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} • {v.category}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <a
              href={doc.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-blue-600 hover:bg-blue-50 rounded"
              title="Baixar / abrir"
            >
              <Download className="w-4 h-4" />
            </a>

            <button
              onClick={() => {
                setConfirmTarget(doc);
                setConfirmOpen(true);
              }}
              disabled={blocking}
              className="p-2 text-red-600 hover:bg-red-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              title="Remover documento"
              type="button"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}

        {visibleDocs.length === 0 && (
          <p className="text-gray-600 py-8 text-center">
            Nenhum documento {vendorFilterId ? 'desse fornecedor' : 'enviado'}{' '}
            ainda.
          </p>
        )}
      </div>
    </div>
  );
}
