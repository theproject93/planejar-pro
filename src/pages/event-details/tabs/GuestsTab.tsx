import React from 'react';
import { Plus, Upload } from 'lucide-react';

type GuestNewBase = {
  name: string;
  phone: string;
};

type Props<TNewGuest extends GuestNewBase> = {
  newGuest: TNewGuest;
  setNewGuest: React.Dispatch<React.SetStateAction<TNewGuest>>;
  addGuest: () => void | Promise<void>;

  fileInputRef: React.RefObject<HTMLInputElement | null>;
  importCSV: (file: File) => void | Promise<void>;
};

export function GuestsTab<TNewGuest extends GuestNewBase>({
  newGuest,
  setNewGuest,
  addGuest,
  fileInputRef,
  importCSV,
}: Props<TNewGuest>) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex flex-col md:flex-row gap-2 mb-4">
        <input
          value={newGuest.name}
          onChange={(e) =>
            setNewGuest((p) => ({
              ...p,
              name: e.target.value,
            }))
          }
          placeholder="Nome"
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
        />

        <input
          value={newGuest.phone}
          onChange={(e) =>
            setNewGuest((p) => ({
              ...p,
              phone: e.target.value,
            }))
          }
          placeholder="Telefone (opcional)"
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
        />

        <button
          onClick={() => addGuest()}
          className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors"
          title="Adicionar convidado"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (f) await importCSV(f);
          e.currentTarget.value = '';
        }}
      />

      <button
        onClick={() => fileInputRef.current?.click()}
        className="w-full mb-4 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-pink-500 hover:bg-pink-50 transition-colors flex items-center justify-center gap-2 text-gray-700"
      >
        <Upload className="w-5 h-5" />
        Importar CSV (Nome,Telefone)
      </button>
    </div>
  );
}
