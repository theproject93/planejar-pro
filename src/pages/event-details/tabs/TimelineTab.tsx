import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

type NewTimelineItem = {
  time: string;
  activity: string;
  assignee: string;
};

type TimelineItem = {
  id: string;
  time: string;
  activity: string;
  assigneename?: string | null;
};

type Props<TItem extends TimelineItem> = {
  newTimelineItem: NewTimelineItem;
  setNewTimelineItem: React.Dispatch<React.SetStateAction<NewTimelineItem>>;
  onAdd: () => void | Promise<void>;

  timeline: TItem[];
  onDelete: (id: string) => void | Promise<void>;
};

export function TimelineTab<TItem extends TimelineItem>({
  newTimelineItem,
  setNewTimelineItem,
  onAdd,
  timeline,
  onDelete,
}: Props<TItem>) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex gap-2 mb-4">
        <input
          type="time"
          value={newTimelineItem.time}
          onChange={(e) =>
            setNewTimelineItem((p) => ({ ...p, time: e.target.value }))
          }
          className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
        />

        <input
          value={newTimelineItem.activity}
          onChange={(e) =>
            setNewTimelineItem((p) => ({ ...p, activity: e.target.value }))
          }
          placeholder="Atividade (ex: Cerimônia)"
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
        />

        <input
          value={newTimelineItem.assignee}
          onChange={(e) =>
            setNewTimelineItem((p) => ({ ...p, assignee: e.target.value }))
          }
          placeholder="Responsável"
          className="w-40 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
        />

        <button
          onClick={() => onAdd()}
          className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors"
          title="Adicionar item"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-3">
        {timeline.map((item) => (
          <div
            key={item.id}
            className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg"
          >
            <div className="flex-shrink-0 w-20 text-center">
              <p className="text-lg font-bold text-pink-600">{item.time}</p>
            </div>

            <div className="flex-1">
              <p className="text-gray-800 font-medium">{item.activity}</p>

              {item.assigneename && (
                <p className="text-sm text-gray-600 mt-1">
                  Responsável: {item.assigneename}
                </p>
              )}
            </div>

            <button
              onClick={() => onDelete(item.id)}
              className="p-1 text-red-600 hover:bg-red-50 rounded"
              title="Remover item"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}

        {timeline.length === 0 && (
          <p className="text-gray-600 py-8 text-center">
            Nenhum item no cronograma ainda.
          </p>
        )}
      </div>
    </div>
  );
}
