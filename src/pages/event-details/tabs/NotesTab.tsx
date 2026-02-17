import React from 'react';
import { Plus, X } from 'lucide-react';

type NoteItem = {
  id: string;
  content: string;
  color: string;
  created_at?: string | null;
  createdat?: string | null; // fallback se seu type antigo ainda usa esse nome
};

type Props<TNote extends NoteItem> = {
  newNote: string;
  setNewNote: (v: string) => void;
  onAdd: () => void | Promise<void>;

  notes: TNote[];
  onDelete: (id: string) => void | Promise<void>;
};

export function NotesTab<TNote extends NoteItem>({
  newNote,
  setNewNote,
  onAdd,
  notes,
  onDelete,
}: Props<TNote>) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex gap-2 mb-4">
        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Nova nota/lembrete..."
          rows={2}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none"
        />
        <button
          onClick={onAdd}
          className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors self-start"
          title="Adicionar nota"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {notes.map((note) => {
          const created = note.created_at ?? note.createdat ?? null;

          return (
            <div
              key={note.id}
              className="p-4 rounded-lg shadow-sm relative"
              style={{ backgroundColor: note.color }}
            >
              <button
                onClick={() => onDelete(note.id)}
                className="absolute top-2 right-2 p-1 text-gray-600 hover:text-red-600"
                title="Remover nota"
              >
                <X className="w-4 h-4" />
              </button>

              <p className="text-gray-800 text-sm whitespace-pre-wrap pr-8">
                {note.content}
              </p>

              {created && (
                <p className="text-xs text-gray-500 mt-2">
                  {new Date(created).toLocaleString('pt-BR')}
                </p>
              )}
            </div>
          );
        })}

        {notes.length === 0 && (
          <p className="text-gray-600 py-8 text-center col-span-full">
            Nenhuma nota criada ainda.
          </p>
        )}
      </div>
    </div>
  );
}
