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

function answerFallback(input: string, hints: PlanHint[]): Omit<ChatMessage, 'id' | 'role'> {
  const text = normalizeText(input);
  if (
    text.includes('alerta') ||
    text.includes('pendenc') ||
    text.includes('dica') ||
    text.includes('prioridade')
  ) {
    if (hints.length === 0) {
      return {
        text:
          'No momento não encontrei alertas críticos.\n\n' +
          'Se você quiser, te ajudo em modo passo a passo:\n' +
          '1. Você me diz o módulo (Eventos, Convidados, Cronograma ou Financeiro).\n' +
          '2. Eu te explico exatamente onde clicar.\n' +
          '3. No final, te digo como validar se ficou certo.',
      };
    }
    return {
      text:
        `Encontrei ${hints.length} alerta(s) priorizados.\n\n` +
        `Prioridade agora: ${hints[0].title}.\n` +
        'Posso te guiar em sequência prática:\n' +
        '1. Abrir a tela correta.\n' +
        '2. Ajustar os campos essenciais.\n' +
        '3. Confirmar no final se o alerta sumiu.',
      ctaLabel: hints[0].ctaLabel,
      ctaPath: hints[0].ctaPath,
    };
  }

  if (text.includes('fornecedor') || text.includes('buffet')) {
    return {
      text:
        'Perfeito, vamos configurar fornecedores de forma correta.\n\n' +
        '1. Acesse o evento e abra a aba "Fornecedores".\n' +
        '2. Verifique se cada fornecedor tem categoria definida (ex.: Buffet, Foto, DJ).\n' +
        '3. Preencha horários de chegada e finalização para cada fornecedor.\n' +
        '4. Atualize o status (pendente, a caminho, chegou, finalizado) quando necessário.\n' +
        '5. Valide na Torre de Comando se os dados apareceram corretamente.',
      ctaLabel: 'Abrir eventos',
      ctaPath: '/dashboard/eventos',
    };
  }

  if (text.includes('convidad') || text.includes('rsvp')) {
    return {
      text:
        'Ótima pergunta. Vamos ajustar RSVP com segurança.\n\n' +
        '1. Abra o evento e entre na aba "Convidados".\n' +
        '2. Verifique a lista de pendentes e confirme se os telefones estão válidos.\n' +
        '3. Faça disparo em massa para os pendentes.\n' +
        '4. Acompanhe os retornos por status: pendente, confirmado ou recusado.\n' +
        '5. Valide no total de confirmações se o número subiu após o disparo.',
      ctaLabel: 'Abrir eventos',
      ctaPath: '/dashboard/eventos',
    };
  }

  if (text.includes('cronograma') || text.includes('timeline') || text.includes('atras')) {
    return {
      text:
        'Perfeito, vamos organizar o cronograma com mais controle.\n\n' +
        '1. Abra o evento e acesse a aba "Cronograma".\n' +
        '2. Clique em "Gerar sugestões IA" para receber recomendações.\n' +
        '3. Aplique as sugestões que fizerem sentido para o seu evento.\n' +
        '4. Resolva primeiro tarefas vencidas e depois as de curto prazo.\n' +
        '5. Valide se a linha do tempo ficou sem lacunas de horários.',
      ctaLabel: 'Abrir eventos',
      ctaPath: '/dashboard/eventos',
    };
  }

  if (text.includes('financeiro') || text.includes('caixa') || text.includes('receber')) {
    return {
      text:
        'Claro, vamos revisar o financeiro sem erro.\n\n' +
        '1. Abra "Financeiro" no menu lateral.\n' +
        '2. Confira os cards: saldo em caixa, entradas confirmadas e programadas.\n' +
        '3. Em cada movimentação, valide valor, data, status e comprovante.\n' +
        '4. Para divergências, edite o lançamento e salve novamente.\n' +
        '5. Valide se os gráficos e cards atualizaram após o salvamento.',
      ctaLabel: 'Abrir financeiro',
      ctaPath: '/dashboard/financeiro',
    };
  }

  return {
    text:
      'Posso te ajudar com eventos, fornecedores, convidados, cronograma, financeiro e Torre de Comando.\n\n' +
      'Me diga em qual etapa você está agora que eu te explico em detalhes:\n' +
      '1. Onde clicar.\n' +
      '2. O que preencher.\n' +
      '3. Como confirmar se ficou certo.',
    ctaLabel: 'Abrir dashboard',
    ctaPath: '/dashboard',
  };
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
    } catch {
      const fallback = answerFallback(text, hints);
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
      text: `${hint.title}: ${hint.message}`,
      ctaLabel: hint.ctaLabel,
      ctaPath: hint.ctaPath,
    });
  }

  function handlePanelPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!panelRef.current) return;
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
          <div className="px-4 py-3 bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white flex items-center justify-between">
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
            <div
              onPointerDown={handlePanelPointerDown}
              onPointerMove={handlePanelPointerMove}
              onPointerUp={handlePanelPointerUp}
              onPointerCancel={handlePanelPointerUp}
              className={`mr-3 flex items-center text-[10px] px-2 py-1 rounded-full bg-white/15 ${isDraggingPanel ? 'cursor-grabbing' : 'cursor-grab'} select-none touch-none`}
              title="Arraste para mover"
            >
              Arrastar
            </div>
            <button
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
