import React from 'react';
import { Download, FileText, Trash2, Upload } from 'lucide-react';

type DocumentItem = {
  id: string;
  name: string;
  file_url: string;
  file_type?: string | null;
  category?: string | null;
};

type Props<TDoc extends DocumentItem> = {
  docInputRef: React.RefObject<HTMLInputElement | null>;
  uploadingDoc: boolean;
  onPickFile: (file: File) => void | Promise<void>;

  documents: TDoc[];
  onDelete: (id: string) => void | Promise<void>;
};

export function DocumentsTab<TDoc extends DocumentItem>({
  docInputRef,
  uploadingDoc,
  onPickFile,
  documents,
  onDelete,
}: Props<TDoc>) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
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
        disabled={uploadingDoc}
        className="w-full mb-4 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-pink-500 hover:bg-pink-50 transition-colors flex items-center justify-center gap-2 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Upload className="w-5 h-5" />
        {uploadingDoc
          ? 'Enviando documento...'
          : 'Upload de documento (PDF, DOC, Imagem)'}
      </button>

      <div className="space-y-2">
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg"
          >
            <FileText className="w-8 h-8 text-gray-600" />

            <div className="flex-1">
              <p className="text-gray-800 font-medium">{doc.name}</p>
              <p className="text-xs text-gray-500">
                {doc.category || 'Outros'}
              </p>
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
              onClick={() => onDelete(doc.id)}
              className="p-2 text-red-600 hover:bg-red-50 rounded"
              title="Remover documento"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}

        {documents.length === 0 && (
          <p className="text-gray-600 py-8 text-center">
            Nenhum documento enviado ainda.
          </p>
        )}
      </div>
    </div>
  );
}
