import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Loader2, Send, Sparkles, X } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

type EventLite = {
  id: string;
  name: string;
  event_date: string | null;
};

type VendorLite = {
  event_id: string;
  category: string | null;
  expected_arrival_time: string | null;
  expected_done_time: string | null;
};

type GuestLite = {
  event_id: string;
  confirmed: boolean | null;
  rsvp_status: string | null;
};

type TaskLite = {
  event_id: string;
  completed: boolean | null;
  due_date: string | null;
};

type PlanHint = {
  id: string;
  severity: 'high' | 'medium' | 'low';
  title: string;
  message: string;
  ctaLabel: string;
  ctaPath: string;
};

type ChatMessage = {
  id: string;
  role: 'bot' | 'user';
  text: string;
  ctaLabel?: string;
  ctaPath?: string;
};

type SuggestedAction = {
  label: string;
  path: string;
};

type HintStateRow = {
  hint_id: string;
  last_action: 'shown' | 'opened' | 'dismissed';
  last_action_at: string;
  last_shown_at: string | null;
  last_opened_at: string | null;
  last_dismissed_at: string | null;
};
type FinanceEntryLite = {
  amount: number | string | null;
  status: string | null;
};

type FinanceExpenseLite = {
  amount: number | string | null;
  status: string | null;
};

type EventLiteData = {
  id: string;
  name: string;
  event_date: string | null;
  budget_total: number | string | null;
};

type EventExpenseLite = {
  value: number | string | null;
};

type EventPaymentLite = {
  amount: number | string | null;
};

const HINT_COOLDOWN_MS = 1000 * 60 * 45;
const OPENED_COOLDOWN_MS = 1000 * 60 * 60 * 2;
const DISMISS_COOLDOWN_MS = 1000 * 60 * 60 * 6;
const PROACTIVE_BUBBLE_MS = 1000 * 12;
const CHAT_PANEL_WIDTH_DESKTOP = 380;
const CHAT_PANEL_WIDTH_MOBILE = 340;
const CHAT_PANEL_HEIGHT = 520;
const CHAT_PANEL_MARGIN = 12;

function normalizeText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

type AssistantTopic = 'finance' | 'vendors' | 'generic';

function classifyAssistantTopic(question: string): AssistantTopic {
  const q = normalizeText(question);
  if (
    q.includes('financeir') ||
    q.includes('caixa') ||
    q.includes('saldo') ||
    q.includes('fluxo') ||
    q.includes('pagament')
  ) {
    return 'finance';
  }
  if (
    q.includes('fornecedor') ||
    q.includes('buffet') ||
    q.includes('contrato') ||
    q.includes('prestador')
  ) {
    return 'vendors';
  }
  return 'generic';
}

function getPendingRsvp(guest: GuestLite) {
  const status = (guest.rsvp_status ?? '').trim().toLowerCase();
  if (status === 'pending') return true;
  if (status === 'confirmed' || status === 'declined') return false;
  return !guest.confirmed;
}

function getDaysUntil(dateText: string | null) {
  if (!dateText) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateText);
  target.setHours(0, 0, 0, 0);
  return Math.floor((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toBRL(value: number) {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function isConfirmedEntryStatus(status: string | null | undefined) {
  const normalized = normalizeText(status ?? '');
  return normalized === 'confirmado' || normalized === 'pago' || normalized === 'parcelado';
}

function isPlannedStatus(status: string | null | undefined) {
  const normalized = normalizeText(status ?? '');
  return normalized === 'pendente' || normalized === 'previsto' || normalized === 'parcelado';
}

function isConfirmedExpenseStatus(status: string | null | undefined) {
  const normalized = normalizeText(status ?? '');
  return normalized === 'confirmado' || normalized === 'pago' || normalized === 'parcelado';
}

async function buildContextAwareFallback(params: {
  question: string;
  userId: string | null;
  userName: string;
  currentEventId: string | null;
  hints: PlanHint[];
}): Promise<Omit<ChatMessage, 'id' | 'role'>> {
  const { question, userId, userName, currentEventId, hints } = params;
  const normalizedQuestion = normalizeText(question);
  const topic = classifyAssistantTopic(question);
  const isSmallTalk =
    normalizedQuestion.includes('obrigad') ||
    normalizedQuestion.includes('valeu') ||
    normalizedQuestion.includes('entendi') ||
    normalizedQuestion === 'ok' ||
    normalizedQuestion === 'blz';

  if (isSmallTalk) {
    return {
      text: `De nada, ${userName || 'assessora'}! Quando quiser, te ajudo no próximo passo da operação.`,
    };
  }

  if (!userId) {
    return {
      text:
        `Olá ${userName || 'assessora'}, tudo bem?\n\n` +
        'Resumo do cenário\n' +
        '- Não consegui validar sua sessão para ler seus dados agora.\n\n' +
        'Passo a passo recomendado\n' +
        '1. Atualize a página e faça login novamente.\n' +
        '2. Abra o módulo que você quer analisar.\n' +
        '3. Me envie a pergunta novamente.\n' +
        '4. Se continuar, me avise a rota atual para eu te orientar melhor.\n\n' +
        'Como validar se ficou certo\n' +
        '- Sua pergunta deve retornar com números reais da sua base.\n\n' +
        'Se der erro\n' +
        '- Recarregue com Ctrl+F5 e tente novamente.',
      ctaLabel: 'Abrir dashboard',
      ctaPath: '/dashboard',
    };
  }

  if (topic === 'vendors') {
    return {
      text:
        `Olá ${userName || 'assessora'}, tudo bem?\n\n` +
        'Resumo do cenário\n' +
        '- Para fornecedor sem assinatura, o risco é seguir sem garantia de escopo, prazo e cancelamento.\n\n' +
        'Passo a passo recomendado\n' +
        '1. Identifique a objeção principal (multa, pagamento, prazo ou cláusula).\n' +
        '2. Proponha um contrato simplificado com entregáveis, horários, valor e política de cancelamento.\n' +
        '3. Formalize por assinatura eletrônica ou aceite por escrito (e-mail/WhatsApp).\n' +
        '4. Defina fornecedor reserva e prazo limite para decisão.\n\n' +
        'Como validar se ficou certo\n' +
        '- Escopo, valor e datas ficaram formalizados por escrito.\n' +
        '- O documento foi anexado no evento para consulta da equipe.\n\n' +
        'Se der erro\n' +
        '- Se o fornecedor mantiver recusa, não confirme reserva sem sinal e sem aceite formal.',
    };
  }

  if (topic === 'generic') {
    return {
      text:
        `Olá ${userName || 'assessora'}, tudo bem?\n\n` +
        'Consigo te orientar melhor se você me disser o módulo e o objetivo agora.\n' +
        'Exemplos: "fornecedores", "cronograma", "convidados", "documentos" ou "financeiro".',
    };
  }

  const [balanceRes, entriesRes, expensesRes, eventRes, eventExpensesRes, eventPaymentsRes] =
    await Promise.all([
      supabase
        .from('user_finance_balance')
        .select('base_balance')
        .eq('user_id', userId)
        .maybeSingle(),
      supabase
        .from('user_finance_entries')
        .select('amount,status')
        .eq('user_id', userId)
        .limit(2000),
      supabase
        .from('user_finance_expenses')
        .select('amount,status')
        .eq('user_id', userId)
        .limit(2000),
      currentEventId
        ? supabase
            .from('events')
            .select('id,name,event_date,budget_total')
            .eq('id', currentEventId)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null } as any),
      currentEventId
        ? supabase
            .from('event_expenses')
            .select('value')
            .eq('event_id', currentEventId)
            .limit(2000)
        : Promise.resolve({ data: [], error: null } as any),
      currentEventId
        ? supabase
            .from('expense_payments')
            .select('amount')
            .eq('event_id', currentEventId)
            .limit(2000)
        : Promise.resolve({ data: [], error: null } as any),
    ]);

  const entries = (entriesRes.data ?? []) as FinanceEntryLite[];
  const expenses = (expensesRes.data ?? []) as FinanceExpenseLite[];
  const baseBalance = toNumber((balanceRes.data as { base_balance?: unknown } | null)?.base_balance);
  const confirmedIn = entries
    .filter((entry) => isConfirmedEntryStatus(entry.status))
    .reduce((sum, entry) => sum + toNumber(entry.amount), 0);
  const plannedIn = entries
    .filter((entry) => isPlannedStatus(entry.status))
    .reduce((sum, entry) => sum + toNumber(entry.amount), 0);
  const confirmedOut = expenses
    .filter((expense) => isConfirmedExpenseStatus(expense.status))
    .reduce((sum, expense) => sum + toNumber(expense.amount), 0);
  const plannedOut = expenses
    .filter((expense) => isPlannedStatus(expense.status))
    .reduce((sum, expense) => sum + toNumber(expense.amount), 0);
  const cashBalance = baseBalance + confirmedIn - confirmedOut;

  const eventData = (eventRes.data as EventLiteData | null) ?? null;
  const eventSpent = ((eventExpensesRes.data ?? []) as EventExpenseLite[]).reduce(
    (sum, row) => sum + toNumber(row.value),
    0
  );
  const eventPaid = ((eventPaymentsRes.data ?? []) as EventPaymentLite[]).reduce(
    (sum, row) => sum + toNumber(row.amount),
    0
  );
  const eventOpen = Math.max(eventSpent - eventPaid, 0);

  const asksCash =
    normalizedQuestion.includes('saldo') ||
    normalizedQuestion.includes('caixa') ||
    normalizedQuestion.includes('fluxo');

  const lines: string[] = [];
  lines.push(`Olá ${userName || 'assessora'}, tudo bem?`);
  lines.push('');
  lines.push('Resumo do cenário');
  lines.push(`- Seu saldo em caixa atual está em ${toBRL(cashBalance)}.`);
  lines.push(`- Entradas confirmadas: ${toBRL(confirmedIn)}. Entradas programadas: ${toBRL(plannedIn)}.`);
  lines.push(`- Saídas confirmadas: ${toBRL(confirmedOut)}. Saídas programadas: ${toBRL(plannedOut)}.`);
  if (eventData) {
    lines.push(
      `- No evento "${eventData.name}", o total lançado é ${toBRL(eventSpent)}, já pago ${toBRL(eventPaid)} e em aberto ${toBRL(eventOpen)}.`
    );
  }

  lines.push('');
  lines.push('Passo a passo recomendado');
  lines.push('1. Abra o Financeiro Geral e confirme se os cards estão com os mesmos valores acima.');
  lines.push('2. Valide se as últimas movimentações mostram os lançamentos mais recentes.');
  if (eventData) {
    lines.push(`3. Abra o evento "${eventData.name}" na aba Financeiro e confira pagamentos/abertos para garantir sincronização.`);
  } else {
    lines.push('3. Abra o evento principal e revise a aba Financeiro para validar pagamentos em aberto.');
  }
  lines.push('4. Se houver divergência, edite o lançamento na origem (evento ou financeiro geral) e salve novamente.');

  lines.push('');
  lines.push('Como validar se ficou certo');
  if (asksCash) {
    lines.push(`- O saldo em caixa precisa permanecer em ${toBRL(cashBalance)} até que um novo lançamento seja salvo.`);
  } else {
    lines.push('- O card consultado deve bater com os valores dos lançamentos de origem.');
  }
  lines.push('- Após salvar, o card, gráfico e lista de movimentações devem atualizar juntos.');

  lines.push('');
  lines.push('Se der erro');
  lines.push('- Atualize a página e tente novamente uma vez.');
  lines.push('- Se persistir, me diga qual tela e ação você executou para eu te orientar no ajuste exato.');

  const action = hints[0] ?? {
    id: 'finance',
    severity: 'medium',
    title: 'Abrir financeiro',
    message: '',
    ctaLabel: 'Abrir financeiro',
    ctaPath: '/dashboard/financeiro',
  };

  return {
    text: lines.join('\n'),
    ctaLabel: asksCash ? 'Abrir financeiro' : action.ctaLabel,
    ctaPath: asksCash ? '/dashboard/financeiro' : action.ctaPath,
  };
}

function buildHintMessage(hint: PlanHint, userName: string) {
  const normalizedTitle = normalizeText(hint.title);
  const greeting = `Olá ${userName || 'assessora'}, por gentileza verifique esta pendência:`;

  if (normalizedTitle.includes('buffet')) {
    return (
      `${greeting}\n\n` +
      `- ${hint.title}.\n` +
      '- Não encontrei fornecedor com categoria "Buffet" nesse evento.\n' +
      '- Isso pode gerar atraso na operação e no checklist final.\n\n' +
      'Como resolver agora:\n' +
      '1. Abra o evento indicado.\n' +
      '2. Vá para a aba Fornecedores.\n' +
      '3. Cadastre ou ajuste um fornecedor na categoria Buffet.\n' +
      '4. Se já existir, valide nome, contato e status.'
    );
  }

  if (normalizedTitle.includes('convidado')) {
    return (
      `${greeting}\n\n` +
      `- ${hint.title}.\n` +
      '- Ainda existem confirmações de presença pendentes para esse evento.\n\n' +
      'Como resolver agora:\n' +
      '1. Abra o evento indicado.\n' +
      '2. Vá para a aba Convidados.\n' +
      '3. Filtre pendentes e revise contatos.\n' +
      '4. Envie ou reenvie o convite para destravar as confirmações.'
    );
  }

  if (normalizedTitle.includes('tarefa') || normalizedTitle.includes('atras')) {
    return (
      `${greeting}\n\n` +
      `- ${hint.title}.\n` +
      '- Há tarefas vencidas e isso pode impactar o cronograma do evento.\n\n' +
      'Como resolver agora:\n' +
      '1. Abra o evento indicado.\n' +
      '2. Vá para Cronograma ou Checklist.\n' +
      '3. Conclua primeiro as tarefas vencidas.\n' +
      '4. Reordene prioridades para as próximas 24 horas.'
    );
  }

  return (
    `${greeting}\n\n` +
    `- ${hint.title}.\n` +
    `- ${hint.message}\n\n` +
    'Como resolver agora:\n' +
    '1. Abra o evento indicado.\n' +
    '2. Revise a aba relacionada à pendência.\n' +
    '3. Aplique o ajuste necessário.\n' +
    '4. Volte aqui e me diga se a pendência foi resolvida.'
  );
}

function shouldTemporarilyHideHint(state: HintStateRow | undefined, nowMs: number) {
  if (!state) return false;

  if (state.last_opened_at) {
    const openedMs = new Date(state.last_opened_at).getTime();
    if (nowMs - openedMs < OPENED_COOLDOWN_MS) return true;
  }

  if (state.last_dismissed_at) {
    const dismissedMs = new Date(state.last_dismissed_at).getTime();
    if (nowMs - dismissedMs < DISMISS_COOLDOWN_MS) return true;
  }

  return false;
}

export function PlanAssistantWidget() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const listRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ pointerId: number; offsetX: number; offsetY: number } | null>(
    null
  );

  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [hints, setHints] = useState<PlanHint[]>([]);
  const [loadingHints, setLoadingHints] = useState(false);
  const [proactiveHint, setProactiveHint] = useState<PlanHint | null>(null);
  const [showProactiveBubble, setShowProactiveBubble] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'bot',
      text: 'Olá! Eu sou a Plan. Posso responder suas dúvidas da plataforma e te ajudar com prioridades sem complicação.',
    },
  ]);
  const [isReplying, setIsReplying] = useState(false);
  const [hintStateMap, setHintStateMap] = useState<Record<string, HintStateRow>>({});
  const [panelPosition, setPanelPosition] = useState<{ x: number; y: number } | null>(
    null
  );
  const [isDraggingPanel, setIsDraggingPanel] = useState(false);

  const userId = user?.id ?? null;

  const getPanelWidth = useCallback(() => {
    return window.innerWidth >= 768
      ? CHAT_PANEL_WIDTH_DESKTOP
      : CHAT_PANEL_WIDTH_MOBILE;
  }, []);

  const clampPanelPosition = useCallback((x: number, y: number) => {
    const panelWidth = getPanelWidth();
    const panelHeight = panelRef.current?.offsetHeight ?? CHAT_PANEL_HEIGHT;
    const maxX = Math.max(CHAT_PANEL_MARGIN, window.innerWidth - panelWidth - CHAT_PANEL_MARGIN);
    const maxY = Math.max(CHAT_PANEL_MARGIN, window.innerHeight - panelHeight - CHAT_PANEL_MARGIN);
    return {
      x: Math.min(Math.max(CHAT_PANEL_MARGIN, x), maxX),
      y: Math.min(Math.max(CHAT_PANEL_MARGIN, y), maxY),
    };
  }, [getPanelWidth]);

  const setDefaultPanelPosition = useCallback(() => {
    const panelWidth = getPanelWidth();
    const panelHeight = panelRef.current?.offsetHeight ?? CHAT_PANEL_HEIGHT;
    const defaultX = window.innerWidth - panelWidth - 24;
    const defaultY = window.innerHeight - panelHeight - 90;
    setPanelPosition(clampPanelPosition(defaultX, defaultY));
  }, [clampPanelPosition, getPanelWidth]);

  const topHintPayload = useMemo(
    () =>
      hints.slice(0, 5).map((hint) => ({
        id: hint.id,
        title: hint.title,
        ctaLabel: hint.ctaLabel,
        ctaPath: hint.ctaPath,
      })),
    [hints]
  );

  const currentEventId = useMemo(() => {
    const match = location.pathname.match(
      /\/dashboard\/eventos\/([0-9a-fA-F-]{8,})/
    );
    return match?.[1] ?? null;
  }, [location.pathname]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, isOpen, isReplying]);

  useEffect(() => {
    if (!isOpen) return;
    if (panelPosition) return;
    setDefaultPanelPosition();
  }, [isOpen, panelPosition, setDefaultPanelPosition]);

  useEffect(() => {
    if (!isOpen) return;
    function handleResize() {
      setPanelPosition((previous) => {
        if (!previous) return previous;
        return clampPanelPosition(previous.x, previous.y);
      });
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [clampPanelPosition, isOpen]);

  useEffect(() => {
    if (!showProactiveBubble) return;
    const timer = window.setTimeout(() => setShowProactiveBubble(false), PROACTIVE_BUBBLE_MS);
    return () => window.clearTimeout(timer);
  }, [showProactiveBubble]);

  const registerHintAction = useCallback(async (
    hint: PlanHint,
    action: 'shown' | 'opened' | 'dismissed'
  ) => {
    if (!userId) return;
    const nowIso = new Date().toISOString();
    const current = hintStateMap[hint.id];
    const payload = {
      user_id: userId,
      hint_id: hint.id,
      last_action: action,
      last_action_at: nowIso,
      last_shown_at: action === 'shown' ? nowIso : current?.last_shown_at ?? null,
      last_opened_at: action === 'opened' ? nowIso : current?.last_opened_at ?? null,
      last_dismissed_at:
        action === 'dismissed' ? nowIso : current?.last_dismissed_at ?? null,
      updated_at: nowIso,
    };

    const { error } = await supabase
      .from('user_plan_assistant_hint_state')
      .upsert(payload, { onConflict: 'user_id,hint_id' });

    if (error) return;

    setHintStateMap((prev) => {
      const previous = prev[hint.id];
      return {
        ...prev,
        [hint.id]: {
          hint_id: hint.id,
          last_action: action,
          last_action_at: nowIso,
          last_shown_at: action === 'shown' ? nowIso : previous?.last_shown_at ?? null,
          last_opened_at: action === 'opened' ? nowIso : previous?.last_opened_at ?? null,
          last_dismissed_at:
            action === 'dismissed' ? nowIso : previous?.last_dismissed_at ?? null,
        },
      };
    });
  }, [hintStateMap, userId]);

  useEffect(() => {
    if (!userId) return;
    let isMounted = true;

    async function loadHints() {
      setLoadingHints(true);
      try {
        const eventsRes = await supabase
          .from('events')
          .select('id, name, event_date')
          .eq('user_id', userId)
          .or('status.is.null,status.neq.deleted')
          .order('event_date', { ascending: true })
          .limit(8);

        if (eventsRes.error) throw eventsRes.error;
        const events = (eventsRes.data as EventLite[]) ?? [];

        if (events.length === 0) {
          if (isMounted) {
            setHints([]);
            setHintStateMap({});
          }
          return;
        }

        const eventIds = events.map((event) => event.id);
        const [vendorsRes, guestsRes, tasksRes] = await Promise.all([
          supabase
            .from('event_vendors')
            .select('event_id, category, expected_arrival_time, expected_done_time')
            .in('event_id', eventIds),
          supabase
            .from('event_guests')
            .select('event_id, confirmed, rsvp_status')
            .in('event_id', eventIds),
          supabase
            .from('event_tasks')
            .select('event_id, completed, due_date')
            .in('event_id', eventIds),
        ]);

        if (vendorsRes.error) throw vendorsRes.error;
        if (guestsRes.error) throw guestsRes.error;
        if (tasksRes.error) throw tasksRes.error;

        const vendors = (vendorsRes.data as VendorLite[]) ?? [];
        const guests = (guestsRes.data as GuestLite[]) ?? [];
        const tasks = (tasksRes.data as TaskLite[]) ?? [];

        const nextHints: PlanHint[] = [];
        for (const event of events) {
          const eventVendors = vendors.filter((vendor) => vendor.event_id === event.id);
          const eventGuests = guests.filter((guest) => guest.event_id === event.id);
          const eventTasks = tasks.filter((task) => task.event_id === event.id);
          const daysToEvent = getDaysUntil(event.event_date);

          const hasBuffet = eventVendors.some((vendor) =>
            normalizeText(vendor.category ?? '').includes('buffet')
          );
          if (!hasBuffet) {
            nextHints.push({
              id: `missing-buffet-${event.id}`,
              severity: 'high',
              title: `Evento ${event.name} sem buffet`,
              message: 'Não encontrei fornecedor de buffet nesse evento.',
              ctaLabel: 'Abrir evento',
              ctaPath: `/dashboard/eventos/${event.id}`,
            });
          }

          const withoutSchedule = eventVendors.filter(
            (vendor) => !vendor.expected_arrival_time || !vendor.expected_done_time
          ).length;
          if (withoutSchedule >= 1) {
            nextHints.push({
              id: `vendor-schedule-${event.id}`,
              severity: daysToEvent !== null && daysToEvent <= 30 ? 'high' : 'medium',
              title: `${withoutSchedule} fornecedor(es) sem horario`,
              message: `No evento ${event.name}, faltam horarios de chegada/finalizacao.`,
              ctaLabel: 'Ajustar fornecedores',
              ctaPath: `/dashboard/eventos/${event.id}`,
            });
          }

          if (eventGuests.length >= 8) {
            const pendingGuests = eventGuests.filter((guest) => getPendingRsvp(guest)).length;
            const pendingRate = pendingGuests / eventGuests.length;
            if (pendingGuests >= 8 && pendingRate >= 0.4) {
              nextHints.push({
                id: `pending-guests-${event.id}`,
                severity: daysToEvent !== null && daysToEvent <= 21 ? 'high' : 'medium',
                title: `${pendingGuests} convidados pendentes`,
                message: `No evento ${event.name}, ainda ha muitas respostas RSVP pendentes.`,
                ctaLabel: 'Ver convidados',
                ctaPath: `/dashboard/eventos/${event.id}`,
              });
            }
          }

          const overdueTasks = eventTasks.filter((task) => {
            if (task.completed) return false;
            if (!task.due_date) return false;
            return new Date(task.due_date) < new Date(new Date().setHours(0, 0, 0, 0));
          }).length;

          if (overdueTasks > 0 && (daysToEvent === null || daysToEvent <= 45)) {
            nextHints.push({
              id: `overdue-tasks-${event.id}`,
              severity: 'high',
              title: `${overdueTasks} tarefa(s) atrasada(s)`,
              message: `Evento ${event.name} tem tarefas vencidas perto da data.`,
              ctaLabel: 'Ver cronograma',
              ctaPath: `/dashboard/eventos/${event.id}`,
            });
          }
        }

        const severityRank: Record<PlanHint['severity'], number> = {
          high: 0,
          medium: 1,
          low: 2,
        };
        nextHints.sort((a, b) => {
          const severityDiff = severityRank[a.severity] - severityRank[b.severity];
          if (severityDiff !== 0) return severityDiff;
          return a.title.localeCompare(b.title);
        });

        const selected = nextHints.slice(0, 6);
        if (selected.length === 0) {
          if (isMounted) {
            setHints([]);
            setHintStateMap({});
          }
          return;
        }

        const stateRes = await supabase
          .from('user_plan_assistant_hint_state')
          .select(
            'hint_id, last_action, last_action_at, last_shown_at, last_opened_at, last_dismissed_at'
          )
          .eq('user_id', userId)
          .in(
            'hint_id',
            selected.map((hint) => hint.id)
          );

        if (stateRes.error) throw stateRes.error;

        const stateRows = (stateRes.data as HintStateRow[]) ?? [];
        const nextMap = stateRows.reduce<Record<string, HintStateRow>>((acc, row) => {
          acc[row.hint_id] = row;
          return acc;
        }, {});

        if (isMounted) {
          const nowMs = Date.now();
          const visibleHints = selected.filter(
            (hint) => !shouldTemporarilyHideHint(nextMap[hint.id], nowMs)
          );
          setHints(visibleHints);
          setHintStateMap(nextMap);
          setProactiveHint((previous) => {
            if (!previous) return previous;
            const stillVisible = visibleHints.some((hint) => hint.id === previous.id);
            return stillVisible ? previous : null;
          });
          setShowProactiveBubble((previous) =>
            previous && visibleHints.length > 0
          );
        }
      } catch {
        if (isMounted) {
          setHints([]);
          setHintStateMap({});
        }
      } finally {
        if (isMounted) setLoadingHints(false);
      }
    }

    loadHints();
    const interval = window.setInterval(loadHints, 1000 * 60 * 3);
    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, [location.pathname, userId]);

  useEffect(() => {
    if (!userId || isOpen || hints.length === 0) return;
    const top = hints[0];
    const state = hintStateMap[top.id];
    const now = Date.now();
    const lastShown = state?.last_shown_at ? new Date(state.last_shown_at).getTime() : 0;
    const lastDismissed = state?.last_dismissed_at
      ? new Date(state.last_dismissed_at).getTime()
      : 0;

    if (now - lastShown < HINT_COOLDOWN_MS) return;
    if (now - lastDismissed < DISMISS_COOLDOWN_MS) return;

    setProactiveHint(top);
    setShowProactiveBubble(true);
    void registerHintAction(top, 'shown');
  }, [hints, hintStateMap, isOpen, registerHintAction, userId]);

  function pushBotMessage(message: Omit<ChatMessage, 'id' | 'role'>) {
    setMessages((prev) => [
      ...prev,
      { id: `bot-${Date.now()}`, role: 'bot', ...message },
    ]);
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || isReplying) return;

    setMessages((prev) => [...prev, { id: `user-${Date.now()}`, role: 'user', text }]);
    setInput('');
    setIsReplying(true);

    try {
      const { data, error } = await supabase.functions.invoke('plan-assistant-chat', {
        body: {
          message: text,
          current_path: location.pathname,
          current_event_id: currentEventId,
          hints: topHintPayload,
          user_name: user?.email?.split('@')[0] ?? '',
        },
      });

      if (error) throw error;
      const answer = typeof data?.answer === 'string' ? data.answer : '';
      const actions = Array.isArray(data?.suggested_actions)
        ? (data.suggested_actions as SuggestedAction[])
        : [];

      if (!answer) throw new Error('empty_answer');

      pushBotMessage({
        text: answer,
        ctaLabel: actions[0]?.label,
        ctaPath: actions[0]?.path,
      });
    } catch (error) {
      console.error('plan-assistant-chat invoke failed', error);
      const fallback = await buildContextAwareFallback({
        question: text,
        userId,
        userName: user?.email?.split('@')[0] ?? 'assessora',
        currentEventId,
        hints,
      });
      pushBotMessage(fallback);
    } finally {
      setIsReplying(false);
    }
  }

  async function openHintInChat(hint: PlanHint) {
    setIsOpen(true);
    if (!panelPosition) setDefaultPanelPosition();
    setShowProactiveBubble(false);
    await registerHintAction(hint, 'opened');
    setHints((prev) => prev.filter((item) => item.id !== hint.id));
    setProactiveHint((prev) => (prev?.id === hint.id ? null : prev));
    pushBotMessage({
      text: buildHintMessage(hint, user?.email?.split('@')[0] ?? 'assessora'),
      ctaLabel: hint.ctaLabel,
      ctaPath: hint.ctaPath,
    });
  }

  function handlePanelPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!panelRef.current) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest('[data-plan-no-drag="true"]')) return;
    const rect = panelRef.current.getBoundingClientRect();
    dragRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    };
    setIsDraggingPanel(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePanelPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!dragRef.current) return;
    if (dragRef.current.pointerId !== event.pointerId) return;
    const nextX = event.clientX - dragRef.current.offsetX;
    const nextY = event.clientY - dragRef.current.offsetY;
    setPanelPosition(clampPanelPosition(nextX, nextY));
  }

  function handlePanelPointerUp(event: PointerEvent<HTMLDivElement>) {
    if (!dragRef.current) return;
    if (dragRef.current.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;
    setIsDraggingPanel(false);
  }

  return (
    <div className="fixed right-4 bottom-4 md:right-8 md:bottom-8 z-[70]">
      {showProactiveBubble && proactiveHint && !isOpen && (
        <div className="mb-3 w-[300px] rounded-2xl border border-fuchsia-200 bg-white shadow-xl p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-fuchsia-600 uppercase tracking-wide">
                Plan dica rápida
              </p>
              <p className="text-sm font-semibold text-gray-900 mt-1">
                {proactiveHint.title}
              </p>
              <p className="text-xs text-gray-600 mt-1">{proactiveHint.message}</p>
            </div>
            <button
              onClick={async () => {
                setShowProactiveBubble(false);
                await registerHintAction(proactiveHint, 'dismissed');
                setHints((prev) => prev.filter((item) => item.id !== proactiveHint.id));
                setProactiveHint((prev) => (prev?.id === proactiveHint.id ? null : prev));
              }}
              className="text-gray-400 hover:text-gray-700"
              aria-label="Fechar dica"
            >
              <X size={16} />
            </button>
          </div>
          <button
            onClick={() => void openHintInChat(proactiveHint)}
            className="mt-3 text-xs font-semibold text-fuchsia-700 hover:text-fuchsia-800"
          >
            Resolver agora
          </button>
        </div>
      )}

      {isOpen && (
        <div
          ref={panelRef}
          style={
            panelPosition
              ? { left: panelPosition.x, top: panelPosition.y }
              : undefined
          }
          className="fixed w-[340px] md:w-[380px] h-[520px] max-h-[75vh] rounded-3xl border border-gray-200 bg-white shadow-2xl overflow-hidden flex flex-col"
        >
          <div
            onPointerDown={handlePanelPointerDown}
            onPointerMove={handlePanelPointerMove}
            onPointerUp={handlePanelPointerUp}
            onPointerCancel={handlePanelPointerUp}
            className={`px-4 py-3 bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white flex items-center justify-between select-none touch-none ${isDraggingPanel ? 'cursor-grabbing' : 'cursor-grab'}`}
            title="Arraste para mover"
          >
            <div className="flex items-center gap-2">
              <img
                src="/images/plan-face-real.png"
                alt="Plan IA"
                className="h-8 w-8 rounded-full border border-white/30 object-cover"
              />
              <div>
                <p className="text-sm font-semibold">Plan</p>
                <p className="text-[11px] text-white/80">Assistente da plataforma</p>
              </div>
            </div>
            <button
              data-plan-no-drag="true"
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white"
              aria-label="Fechar chat"
            >
              <X size={18} />
            </button>
          </div>

          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-[11px] font-semibold text-gray-600 uppercase tracking-wide">
              Alertas proativos
            </p>
            {loadingHints && (
              <p className="text-xs text-gray-500 mt-1">Analisando operação...</p>
            )}
            {!loadingHints && hints.length === 0 && (
              <p className="text-xs text-gray-500 mt-1">Sem pendências urgentes agora.</p>
            )}
            {!loadingHints && hints.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {hints.slice(0, 3).map((hint) => (
                  <button
                    key={hint.id}
                    onClick={() => void openHintInChat(hint)}
                    className="text-[11px] rounded-full border border-fuchsia-200 bg-white text-fuchsia-700 px-3 py-1 hover:bg-fuchsia-50"
                  >
                    {hint.title}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[90%] rounded-2xl px-3 py-2 text-sm ${
                    message.role === 'user'
                      ? 'bg-violet-600 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  <p className="whitespace-pre-line">{message.text}</p>
                  {message.role === 'bot' && message.ctaPath && (
                    <button
                      onClick={() => navigate(message.ctaPath!)}
                      className="mt-2 text-xs font-semibold text-violet-700 hover:text-violet-800"
                    >
                      {message.ctaLabel ?? 'Abrir módulo'}
                    </button>
                  )}
                </div>
              </div>
            ))}

            {isReplying && (
              <div className="flex justify-start">
                <div className="max-w-[90%] rounded-2xl px-3 py-2 text-sm bg-gray-100 text-gray-800 inline-flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin text-violet-600" />
                  Plan está analisando...
                </div>
              </div>
            )}
          </div>

          <div className="p-3 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') void sendMessage();
                }}
                placeholder="Pergunte sobre uso da plataforma..."
                className="flex-1 h-10 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200"
              />
              <button
                onClick={() => void sendMessage()}
                disabled={isReplying}
                className="h-10 w-10 rounded-xl bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-60 flex items-center justify-center"
                aria-label="Enviar mensagem"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => {
          setIsOpen((prev) => {
            const next = !prev;
            if (next && !panelPosition) setDefaultPanelPosition();
            return next;
          });
          setShowProactiveBubble(false);
        }}
        className="h-14 w-14 rounded-full bg-gradient-to-br from-fuchsia-600 to-violet-700 text-white shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all flex items-center justify-center"
        aria-label="Abrir assistente Plan"
      >
        {isOpen ? (
          <X size={20} />
        ) : (
          <img
            src="/images/plan-face-real.png"
            alt="Plan IA"
            className="h-11 w-11 rounded-full border-2 border-white/70 object-cover"
          />
        )}
      </button>

      {!isOpen && (
        <div className="pointer-events-none absolute -top-1 -left-1">
          <div className="h-6 w-6 rounded-full bg-white shadow-md flex items-center justify-center">
            <Sparkles size={12} className="text-fuchsia-600" />
          </div>
        </div>
      )}
    </div>
  );
}



