import React from 'react';
import { Calendar, GripVertical, Plus, Trash2 } from 'lucide-react';

type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';

type TaskLike = {
  id: string;
  text: string;
  completed: boolean;
  due_date?: string | null;
  duedate?: string | null;
  priority?: TaskPriority;
  assignee_name?: string | null;
  assigneename?: string | null;

  // Importante: o componente NÃO usa eventid, então deixamos opcional
  // para evitar conflito com outros tipos TaskRow do projeto.
  eventid?: string;
};

type PriorityConfigItem = {
  label: string;
  color: string;
  bg: string;
  icon: React.ComponentType<{ className?: string }> | null;
};

type PriorityConfigMap = Record<TaskPriority, PriorityConfigItem>;

type Props = {
  tasks: TaskLike[];

  newTaskText: string;
  setNewTaskText: (v: string) => void;

  newTaskDueDate: string;
  setNewTaskDueDate: (v: string) => void;

  newTaskPriority: TaskPriority;
  setNewTaskPriority: (v: TaskPriority) => void;

  newTaskAssignee: string;
  setNewTaskAssignee: (v: string) => void;

  addTask: () => void | Promise<void>;
  toggleTask: (taskId: string) => void | Promise<void>;
  deleteTask: (taskId: string) => void | Promise<void>;
  updateTaskPriority: (
    taskId: string,
    priority: TaskPriority
  ) => void | Promise<void>;

  onTaskDragStart: (index: number) => void;
  onTaskDragOver: (e: React.DragEvent, overIndex: number) => void;
  onTaskDragEnd: () => void | Promise<void>;

  formatDate: (date?: string | null) => string;
  isOverdue: (dueDate?: string | null) => boolean;

  priorityConfig: PriorityConfigMap;
};

export function TasksTab({
  tasks,
  newTaskText,
  setNewTaskText,
  newTaskDueDate,
  setNewTaskDueDate,
  newTaskPriority,
  setNewTaskPriority,
  newTaskAssignee,
  setNewTaskAssignee,
  addTask,
  toggleTask,
  deleteTask,
  updateTaskPriority,
  onTaskDragStart,
  onTaskDragOver,
  onTaskDragEnd,
  formatDate,
  isOverdue,
  priorityConfig,
}: Props) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-2 mb-4">
        <input
          value={newTaskText}
          onChange={(e) => setNewTaskText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addTask()}
          placeholder="Nova tarefa..."
          className="md:col-span-4 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
        />

        <input
          type="date"
          value={newTaskDueDate}
          onChange={(e) => setNewTaskDueDate(e.target.value)}
          className="md:col-span-2 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
        />

        <select
          value={newTaskPriority}
          onChange={(e) => setNewTaskPriority(e.target.value as TaskPriority)}
          className="md:col-span-2 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
        >
          <option value="low">Baixa</option>
          <option value="normal">Normal</option>
          <option value="high">Alta</option>
          <option value="urgent">Urgente</option>
        </select>

        <input
          value={newTaskAssignee}
          onChange={(e) => setNewTaskAssignee(e.target.value)}
          placeholder="Responsável"
          className="md:col-span-3 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
        />

        <button
          onClick={() => addTask()}
          className="md:col-span-1 px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors"
          title="Adicionar tarefa"
        >
          <Plus className="w-5 h-5 mx-auto" />
        </button>
      </div>

      <div className="space-y-2">
        {tasks.map((t, idx) => {
          const taskDueDate = t.due_date ?? t.duedate;
          const taskAssignee = t.assignee_name ?? t.assigneename;
          return (
          <div
            key={t.id}
            draggable
            onDragStart={() => onTaskDragStart(idx)}
            onDragOver={(e) => onTaskDragOver(e, idx)}
            onDragEnd={() => onTaskDragEnd()}
            className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
          >
            <GripVertical className="w-5 h-5 text-gray-400" />

            <input
              type="checkbox"
              checked={t.completed}
              onChange={() => toggleTask(t.id)}
              className="w-5 h-5"
            />

            <div className="flex-1">
              <span
                className={`block ${
                  t.completed ? 'line-through text-gray-500' : 'text-gray-800'
                }`}
              >
                {t.text}
              </span>

              <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                {taskDueDate && (
                  <span
                    className={`inline-flex items-center gap-1 ${
                      isOverdue(taskDueDate) && !t.completed
                        ? 'text-red-600 font-medium'
                        : ''
                    }`}
                  >
                    <Calendar className="w-3 h-3" />
                    {formatDate(taskDueDate)}
                  </span>
                )}

                {t.priority && t.priority !== 'normal' && (
                  <span
                    className={`inline-flex items-center gap-1 ${
                      priorityConfig[t.priority].color
                    }`}
                  >
                    {(() => {
                      const Icon = priorityConfig[t.priority].icon;
                      return Icon ? <Icon className="w-3 h-3" /> : null;
                    })()}
                    {priorityConfig[t.priority].label}
                  </span>
                )}

                {taskAssignee && <span>{taskAssignee}</span>}

                <select
                  value={t.priority ?? 'normal'}
                  onChange={(e) =>
                    updateTaskPriority(t.id, e.target.value as TaskPriority)
                  }
                  className="ml-auto px-2 py-1 border border-gray-200 rounded-md text-xs bg-white text-gray-700"
                  title="Alterar urgencia"
                >
                  <option value="low">Baixa</option>
                  <option value="normal">Normal</option>
                  <option value="high">Alta</option>
                  <option value="urgent">Urgente</option>
                </select>
              </div>
            </div>

            <button
              onClick={() => deleteTask(t.id)}
              className="p-1 text-red-600 hover:bg-red-50 rounded"
              title="Remover tarefa"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          );
        })}

        {tasks.length === 0 && (
          <p className="text-gray-600 py-8 text-center">
            Nenhuma tarefa cadastrada.
          </p>
        )}
      </div>
    </div>
  );
}
