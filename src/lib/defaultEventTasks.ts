export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';
export type EventType = 'wedding' | 'birthday' | 'debutante' | 'corporate';

export type DefaultTaskTemplate = {
  text: string;
  priority: TaskPriority;
};

// Lista antiga usada inicialmente para todos os eventos.
// Mantida para detectar eventos existentes que ainda estejam com esse checklist.
const LEGACY_WEDDING_TASK_TEMPLATES: DefaultTaskTemplate[] = [
  { text: 'Alinhar briefing completo com os noivos', priority: 'urgent' },
  { text: 'Definir cronograma macro do evento', priority: 'high' },
  { text: 'Mapear orçamento por categoria', priority: 'high' },
  { text: 'Contratar e validar local da cerimônia', priority: 'urgent' },
  { text: 'Fechar buffet e cardápio', priority: 'high' },
  { text: 'Fechar foto e filmagem', priority: 'high' },
  { text: 'Fechar decoração e florista', priority: 'high' },
  { text: 'Fechar sonorização e iluminação', priority: 'normal' },
  { text: 'Fechar banda ou DJ', priority: 'normal' },
  { text: 'Fechar celebrante', priority: 'normal' },
  { text: 'Consolidar lista inicial de convidados', priority: 'high' },
  { text: 'Enviar Save the Date', priority: 'normal' },
  { text: 'Enviar convites oficiais', priority: 'high' },
  { text: 'Acompanhar confirmações (RSVP)', priority: 'high' },
  { text: 'Definir mapa de mesas preliminar', priority: 'normal' },
  { text: 'Reunião de alinhamento com fornecedores', priority: 'high' },
  { text: 'Montar roteiro minuto a minuto do grande dia', priority: 'urgent' },
  { text: 'Confirmar equipe e funções do cerimonial', priority: 'high' },
  { text: 'Checklist final de documentos e contratos', priority: 'high' },
  { text: 'Confirmação final D-1 com todos os fornecedores', priority: 'urgent' },
];

const WEDDING_TASK_TEMPLATES: DefaultTaskTemplate[] = [
  { text: 'Alinhar briefing completo com os noivos', priority: 'urgent' },
  { text: 'Definir cronograma macro do casamento', priority: 'high' },
  { text: 'Mapear orçamento por categoria', priority: 'high' },
  { text: 'Contratar e validar local da cerimônia e recepção', priority: 'urgent' },
  { text: 'Fechar buffet e cardápio', priority: 'high' },
  { text: 'Fechar foto e filmagem', priority: 'high' },
  { text: 'Fechar decoração e florista', priority: 'high' },
  { text: 'Fechar sonorização e iluminação', priority: 'normal' },
  { text: 'Fechar banda ou DJ', priority: 'normal' },
  { text: 'Fechar celebrante', priority: 'normal' },
  { text: 'Consolidar lista inicial de convidados', priority: 'high' },
  { text: 'Enviar Save the Date', priority: 'normal' },
  { text: 'Enviar convites oficiais', priority: 'high' },
  { text: 'Acompanhar confirmações (RSVP)', priority: 'high' },
  { text: 'Definir mapa de mesas preliminar', priority: 'normal' },
  { text: 'Reunião de alinhamento com fornecedores', priority: 'high' },
  { text: 'Montar roteiro minuto a minuto do grande dia', priority: 'urgent' },
  { text: 'Confirmar equipe e funções do cerimonial', priority: 'high' },
  { text: 'Checklist final de documentos e contratos', priority: 'high' },
  { text: 'Confirmação final D-1 com todos os fornecedores', priority: 'urgent' },
];

const BIRTHDAY_TASK_TEMPLATES: DefaultTaskTemplate[] = [
  { text: 'Definir tema e estilo da festa', priority: 'high' },
  { text: 'Fechar local da festa', priority: 'urgent' },
  { text: 'Montar lista de convidados', priority: 'high' },
  { text: 'Enviar convites', priority: 'high' },
  { text: 'Acompanhar confirmações (RSVP)', priority: 'high' },
  { text: 'Definir cardápio e bebidas', priority: 'high' },
  { text: 'Contratar bolo e docinhos', priority: 'high' },
  { text: 'Contratar decoração e mesa principal', priority: 'high' },
  { text: 'Contratar foto e filmagem', priority: 'normal' },
  { text: 'Definir playlist, DJ ou som ambiente', priority: 'normal' },
  { text: 'Planejar recepção e credenciamento de convidados', priority: 'normal' },
  { text: 'Definir lembrancinhas', priority: 'low' },
  { text: 'Organizar roteiro de homenagens', priority: 'normal' },
  { text: 'Planejar brincadeiras e momentos especiais', priority: 'normal' },
  { text: 'Montar mapa de mesas', priority: 'normal' },
  { text: 'Reunião de alinhamento com fornecedores', priority: 'high' },
  { text: 'Definir equipe de apoio no dia', priority: 'high' },
  { text: 'Checklist final de materiais da festa', priority: 'high' },
  { text: 'Confirmação final D-1 com fornecedores', priority: 'urgent' },
  { text: 'Conferir montagem e abertura da festa', priority: 'urgent' },
];

const DEBUTANTE_TASK_TEMPLATES: DefaultTaskTemplate[] = [
  { text: 'Alinhar briefing com a debutante e família', priority: 'urgent' },
  { text: 'Definir tema e identidade visual da festa', priority: 'high' },
  { text: 'Fechar local da festa', priority: 'urgent' },
  { text: 'Montar lista de convidados', priority: 'high' },
  { text: 'Enviar convites', priority: 'high' },
  { text: 'Acompanhar confirmações (RSVP)', priority: 'high' },
  { text: 'Definir vestido(s), beleza e acessórios', priority: 'high' },
  { text: 'Definir cerimonial de entrada e protocolo', priority: 'high' },
  { text: 'Organizar valsa e coreografias', priority: 'high' },
  { text: 'Contratar DJ, som e iluminação', priority: 'high' },
  { text: 'Contratar decoração e cenografia', priority: 'high' },
  { text: 'Definir buffet, bolo e doces', priority: 'high' },
  { text: 'Contratar foto e filmagem', priority: 'normal' },
  { text: 'Definir lembrancinhas e brindes', priority: 'normal' },
  { text: 'Montar mapa de mesas', priority: 'normal' },
  { text: 'Reunião de alinhamento com fornecedores', priority: 'high' },
  { text: 'Definir equipe de cerimonial no dia', priority: 'high' },
  { text: 'Checklist final de figurinos e materiais', priority: 'high' },
  { text: 'Confirmação final D-1 com fornecedores', priority: 'urgent' },
  { text: 'Conferir montagem e cronograma no dia', priority: 'urgent' },
];

const CORPORATE_TASK_TEMPLATES: DefaultTaskTemplate[] = [
  { text: 'Definir objetivo da confraternização e público', priority: 'urgent' },
  { text: 'Aprovar escopo com liderança e RH', priority: 'high' },
  { text: 'Definir data, horário e formato do evento', priority: 'high' },
  { text: 'Fechar local e infraestrutura', priority: 'urgent' },
  { text: 'Mapear orçamento por categoria', priority: 'high' },
  { text: 'Definir lista de participantes', priority: 'high' },
  { text: 'Disparar convite interno e comunicação oficial', priority: 'high' },
  { text: 'Acompanhar confirmações (RSVP)', priority: 'high' },
  { text: 'Definir buffet e bebidas', priority: 'high' },
  { text: 'Fechar sonorização, iluminação e A/V', priority: 'high' },
  { text: 'Definir mestre de cerimônias e roteiro de palco', priority: 'normal' },
  { text: 'Planejar brindes e ação de engajamento', priority: 'normal' },
  { text: 'Contratar foto e filmagem', priority: 'normal' },
  { text: 'Planejar sinalização e recepção', priority: 'normal' },
  { text: 'Definir segurança e controle de acesso', priority: 'normal' },
  { text: 'Reunião de alinhamento com fornecedores', priority: 'high' },
  { text: 'Definir equipe de apoio operacional', priority: 'high' },
  { text: 'Checklist final de materiais e contratos', priority: 'high' },
  { text: 'Confirmação final D-1 com fornecedores', priority: 'urgent' },
  { text: 'Conferir montagem e operação de abertura', priority: 'urgent' },
];

const TASK_TEMPLATES_BY_EVENT_TYPE: Record<EventType, DefaultTaskTemplate[]> = {
  wedding: WEDDING_TASK_TEMPLATES,
  birthday: BIRTHDAY_TASK_TEMPLATES,
  debutante: DEBUTANTE_TASK_TEMPLATES,
  corporate: CORPORATE_TASK_TEMPLATES,
};

function normalizeEventType(eventType?: string | null): EventType {
  const raw = (eventType ?? '').toLowerCase();
  if (raw === 'birthday' || raw === 'debutante' || raw === 'corporate') {
    return raw;
  }
  return 'wedding';
}

export function getDefaultEventTaskTemplates(
  eventType?: string | null
): DefaultTaskTemplate[] {
  return TASK_TEMPLATES_BY_EVENT_TYPE[normalizeEventType(eventType)];
}

export function buildDefaultEventTasksPayload(
  eventId: string,
  eventType?: string | null
) {
  return getDefaultEventTaskTemplates(eventType).map((task, index) => ({
    event_id: eventId,
    text: task.text,
    completed: false,
    position: index,
    priority: task.priority,
  }));
}

export function isLegacyWeddingChecklist(
  tasks: Array<{ text: string; completed: boolean }>
) {
  if (tasks.length !== LEGACY_WEDDING_TASK_TEMPLATES.length) return false;
  if (tasks.some((task) => task.completed)) return false;

  return tasks.every(
    (task, idx) =>
      task.text.trim() === LEGACY_WEDDING_TASK_TEMPLATES[idx].text.trim()
  );
}

