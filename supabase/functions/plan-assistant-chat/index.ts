import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type HintInput = {
  id?: unknown;
  title?: unknown;
  ctaLabel?: unknown;
  ctaPath?: unknown;
};

type ChatPayload = {
  message?: unknown;
  current_path?: unknown;
  current_event_id?: unknown;
  hints?: unknown;
  user_name?: unknown;
};

type SuggestedAction = {
  label: string;
  path: string;
};

type EventSnapshot = {
  id: string;
  name: string;
  event_date: string | null;
  location: string | null;
  status: string | null;
  budget_total: number;
  budget_spent: number;
  budget_remaining: number;
  vendors_total: number;
  vendors_without_schedule: number;
  buffet_registered: boolean;
  guests_total: number;
  guests_pending_rsvp: number;
  tasks_open: number;
  tasks_overdue: number;
  receivable_total: number;
  receivable_paid: number;
  receivable_open: number;
};

type FinanceSnapshot = {
  base_balance: number;
  confirmed_in: number;
  planned_in: number;
  confirmed_out: number;
  planned_out: number;
  cash_balance: number;
  entries_count: number;
  expenses_count: number;
};

type HelpDoc = {
  module: string;
  title: string;
  content: string;
  keywords: string[];
};

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function normalizeString(value: unknown, fallback = '') {
  if (typeof value !== 'string') return fallback;
  const clean = value.trim();
  return clean || fallback;
}

function normalizeNumber(value: unknown) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function normalizeName(value: unknown) {
  const raw = normalizeString(value);
  if (!raw) return 'assessora';
  return raw.replace(/[^a-zA-ZÀ-ÿ0-9 _-]/g, '').slice(0, 40) || 'assessora';
}

function normalizeHints(value: unknown): SuggestedAction[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as HintInput;
      const label = normalizeString(row.ctaLabel, normalizeString(row.title));
      const path = normalizeString(row.ctaPath);
      if (!label || !path) return null;
      return { label: label.slice(0, 60), path: path.slice(0, 300) };
    })
    .filter((item): item is SuggestedAction => item !== null);
}

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function extractEventId(path: string, explicitEventId: string) {
  if (explicitEventId) return explicitEventId;
  const match = path.match(/\/dashboard\/eventos\/([0-9a-fA-F-]{8,})/);
  return match?.[1] ?? '';
}

function guestIsPending(row: { confirmed?: unknown; rsvp_status?: unknown }) {
  const status = normalizeString(row.rsvp_status).toLowerCase();
  if (status === 'pending') return true;
  if (status === 'confirmed' || status === 'declined') return false;
  return row.confirmed !== true;
}

function dateIsPast(value: unknown) {
  const text = normalizeString(value);
  if (!text) return false;
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return date.getTime() < today.getTime();
}

function uniqActions(items: SuggestedAction[]) {
  const seen = new Set<string>();
  const output: SuggestedAction[] = [];
  for (const item of items) {
    const key = `${item.label}::${item.path}`;
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(item);
  }
  return output.slice(0, 3);
}

async function getEventSnapshot(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  eventId: string
): Promise<EventSnapshot | null> {
  if (!eventId) return null;

  const eventRes = await supabase
    .from('events')
    .select('id, user_id, name, event_date, location, status, budget_total')
    .eq('id', eventId)
    .eq('user_id', userId)
    .maybeSingle();

  if (eventRes.error || !eventRes.data) return null;

  const [vendorsRes, guestsRes, tasksRes, expensesRes, paymentsRes] =
    await Promise.all([
      supabase
        .from('event_vendors')
        .select('id, category, expected_arrival_time, expected_done_time')
        .eq('event_id', eventId),
      supabase
        .from('event_guests')
        .select('id, confirmed, rsvp_status')
        .eq('event_id', eventId),
      supabase
        .from('event_tasks')
        .select('id, completed, due_date')
        .eq('event_id', eventId),
      supabase
        .from('event_expenses')
        .select('id, name, value, status')
        .eq('event_id', eventId),
      supabase
        .from('expense_payments')
        .select('id, expense_id, amount')
        .eq('event_id', eventId),
    ]);

  const vendors = vendorsRes.error ? [] : (vendorsRes.data ?? []);
  const guests = guestsRes.error ? [] : (guestsRes.data ?? []);
  const tasks = tasksRes.error ? [] : (tasksRes.data ?? []);
  const expenses = expensesRes.error ? [] : (expensesRes.data ?? []);
  const payments = paymentsRes.error ? [] : (paymentsRes.data ?? []);

  const budgetTotal = normalizeNumber(eventRes.data.budget_total);
  const budgetSpent = expenses.reduce(
    (sum, row) => sum + normalizeNumber((row as { value?: unknown }).value),
    0
  );

  const receivableTotal = budgetSpent;
  const receivablePaid = payments.reduce(
    (sum, row) => sum + normalizeNumber((row as { amount?: unknown }).amount),
    0
  );

  const vendorsWithoutSchedule = vendors.filter((row) => {
    const vendor = row as {
      expected_arrival_time?: unknown;
      expected_done_time?: unknown;
    };
    return !vendor.expected_arrival_time || !vendor.expected_done_time;
  }).length;

  const buffetRegistered = vendors.some((row) => {
    const category = normalizeText(
      normalizeString((row as { category?: unknown }).category)
    );
    return category.includes('buffet');
  });

  const guestsPending = guests.filter((row) =>
    guestIsPending(row as { confirmed?: unknown; rsvp_status?: unknown })
  ).length;

  const tasksOpen = tasks.filter((row) => (row as { completed?: unknown }).completed !== true)
    .length;
  const tasksOverdue = tasks.filter((row) => {
    const task = row as { completed?: unknown; due_date?: unknown };
    if (task.completed === true) return false;
    return dateIsPast(task.due_date);
  }).length;

  return {
    id: eventRes.data.id,
    name: normalizeString(eventRes.data.name, 'Evento'),
    event_date: eventRes.data.event_date ?? null,
    location: eventRes.data.location ?? null,
    status: eventRes.data.status ?? null,
    budget_total: budgetTotal,
    budget_spent: budgetSpent,
    budget_remaining: budgetTotal - budgetSpent,
    vendors_total: vendors.length,
    vendors_without_schedule: vendorsWithoutSchedule,
    buffet_registered: buffetRegistered,
    guests_total: guests.length,
    guests_pending_rsvp: guestsPending,
    tasks_open: tasksOpen,
    tasks_overdue: tasksOverdue,
    receivable_total: receivableTotal,
    receivable_paid: receivablePaid,
    receivable_open: Math.max(receivableTotal - receivablePaid, 0),
  };
}

async function getFinanceSnapshot(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<FinanceSnapshot> {
  const [balanceRes, entriesRes, expensesRes] = await Promise.all([
    supabase
      .from('user_finance_balance')
      .select('base_balance')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('user_finance_entries')
      .select('amount, status')
      .eq('user_id', userId)
      .limit(2000),
    supabase
      .from('user_finance_expenses')
      .select('amount, status')
      .eq('user_id', userId)
      .limit(2000),
  ]);

  const baseBalance = balanceRes.error
    ? 0
    : normalizeNumber(balanceRes.data?.base_balance);
  const entries = entriesRes.error ? [] : (entriesRes.data ?? []);
  const expenses = expensesRes.error ? [] : (expensesRes.data ?? []);

  const confirmedIn = entries
    .filter((row) => {
      const status = normalizeString((row as { status?: unknown }).status).toLowerCase();
      return status === 'confirmado' || status === 'pago';
    })
    .reduce(
      (sum, row) => sum + normalizeNumber((row as { amount?: unknown }).amount),
      0
    );

  const plannedIn = entries
    .filter((row) => {
      const status = normalizeString((row as { status?: unknown }).status).toLowerCase();
      return status === 'pendente' || status === 'previsto' || status === 'parcelado';
    })
    .reduce(
      (sum, row) => sum + normalizeNumber((row as { amount?: unknown }).amount),
      0
    );

  const confirmedOut = expenses
    .filter((row) => {
      const status = normalizeString((row as { status?: unknown }).status).toLowerCase();
      return status === 'confirmado' || status === 'pago' || status === 'parcelado';
    })
    .reduce(
      (sum, row) => sum + normalizeNumber((row as { amount?: unknown }).amount),
      0
    );

  const plannedOut = expenses
    .filter((row) => {
      const status = normalizeString((row as { status?: unknown }).status).toLowerCase();
      return status === 'pendente' || status === 'previsto' || status === 'parcelado';
    })
    .reduce(
      (sum, row) => sum + normalizeNumber((row as { amount?: unknown }).amount),
      0
    );

  return {
    base_balance: baseBalance,
    confirmed_in: confirmedIn,
    planned_in: plannedIn,
    confirmed_out: confirmedOut,
    planned_out: plannedOut,
    cash_balance: baseBalance + confirmedIn - confirmedOut,
    entries_count: entries.length,
    expenses_count: expenses.length,
  };
}

async function getHelpDocs(
  supabase: ReturnType<typeof createClient>,
  question: string
): Promise<HelpDoc[]> {
  const docsRes = await supabase
    .from('platform_help_docs')
    .select('module, title, content, keywords')
    .eq('is_active', true)
    .limit(40);

  if (docsRes.error) return [];
  const docs = (docsRes.data ?? []) as {
    module?: unknown;
    title?: unknown;
    content?: unknown;
    keywords?: unknown;
  }[];

  const normalizedQuestion = normalizeText(question);
  const tokens = normalizedQuestion
    .split(/[^a-z0-9]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);

  const scored = docs
    .map((row) => {
      const module = normalizeString(row.module);
      const title = normalizeString(row.title);
      const content = normalizeString(row.content);
      const keywords = Array.isArray(row.keywords)
        ? row.keywords.map((item) => normalizeString(item))
        : [];

      const haystack = normalizeText(
        `${module} ${title} ${content} ${keywords.join(' ')}`
      );

      const score = tokens.reduce((sum, token) => {
        if (!token) return sum;
        return haystack.includes(token) ? sum + 1 : sum;
      }, 0);

      return {
        module,
        title,
        content,
        keywords,
        score,
      };
    })
    .sort((a, b) => b.score - a.score)
    .filter((row) => row.score > 0)
    .slice(0, 5)
    .map((row) => ({
      module: row.module,
      title: row.title,
      content: row.content,
      keywords: row.keywords,
    }));

  if (scored.length > 0) return scored;

  return docs
    .slice(0, 3)
    .map((row) => ({
      module: normalizeString(row.module),
      title: normalizeString(row.title),
      content: normalizeString(row.content),
      keywords: Array.isArray(row.keywords)
        ? row.keywords.map((item) => normalizeString(item))
        : [],
    }));
}

function formatMoney(value: number) {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  });
}

function buildFallbackAnswer(params: {
  userName: string;
  question: string;
  event: EventSnapshot | null;
  finance: FinanceSnapshot;
}): string {
  const { userName, event, finance } = params;
  const lines: string[] = [];

  lines.push(`Olá ${userName}, tudo bem?`);
  lines.push('');
  lines.push('Resumo do cenário');
  lines.push(
    `- No seu financeiro geral: saldo em caixa estimado em ${formatMoney(finance.cash_balance)}, entradas programadas em ${formatMoney(finance.planned_in)} e saídas programadas em ${formatMoney(finance.planned_out)}.`
  );

  if (event) {
    lines.push(
      `- No evento "${event.name}": orçamento ${formatMoney(event.budget_total)}, gasto ${formatMoney(event.budget_spent)} e pendente para receber ${formatMoney(event.receivable_open)}.`
    );
    lines.push(
      `- Operação do evento: ${event.vendors_total} fornecedor(es), ${event.vendors_without_schedule} sem horário, ${event.guests_pending_rsvp} RSVP pendente(s) e ${event.tasks_overdue} tarefa(s) atrasada(s).`
    );
  } else {
    lines.push(
      '- Não identifiquei um evento específico no contexto atual. Se você quiser orientação por evento, abra o evento e me pergunte novamente.'
    );
  }

  lines.push('');
  lines.push('Passo a passo recomendado');
  lines.push('1. Defina a prioridade principal do momento: receber valores, ajustar fornecedores, confirmar convidados ou destravar cronograma.');
  if (event) {
    lines.push(`2. Abra o evento "${event.name}" e corrija primeiro os itens críticos: tarefas vencidas e fornecedores sem horário.`);
    lines.push('3. Na aba Financeiro do evento, confirme se cada pagamento lançado tem data, valor e método corretos.');
    lines.push('4. Volte ao Financeiro Geral e valide se os cards refletiram os mesmos números do evento.');
  } else {
    lines.push('2. Abra "Eventos" e escolha o evento em que você precisa de apoio.');
    lines.push('3. Revise as abas Fornecedores, Convidados, Cronograma e Financeiro nessa ordem.');
    lines.push('4. Depois valide no Financeiro Geral se os cards consolidaram os números.');
  }

  lines.push('');
  lines.push('Como validar se ficou certo');
  lines.push('- O card de entradas programadas deve bater com o total em aberto dos eventos.');
  lines.push('- O card de entradas confirmadas deve subir quando houver pagamento registrado.');
  lines.push('- O saldo em caixa deve refletir base + entradas confirmadas - saídas confirmadas.');

  lines.push('');
  lines.push('Se der erro');
  lines.push('- Atualize a página e repita a ação uma vez.');
  lines.push('- Se persistir, me diga exatamente em qual tela e qual botão você clicou para eu te orientar com precisão.');

  return lines.join('\n');
}

async function callCloudflareAi(context: {
  userName: string;
  question: string;
  path: string;
  event: EventSnapshot | null;
  finance: FinanceSnapshot;
  docs: HelpDoc[];
  hints: SuggestedAction[];
}) {
  const accountId = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');
  const apiToken = Deno.env.get('CLOUDFLARE_API_TOKEN');
  const model =
    Deno.env.get('CLOUDFLARE_AI_MODEL_PLAN') ??
    Deno.env.get('CLOUDFLARE_AI_MODEL') ??
    '@cf/meta/llama-3.1-8b-instruct';

  if (!accountId || !apiToken) {
    throw new Error('missing_cloudflare_secrets');
  }

  const endpoint =
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;

  const systemPrompt = [
    'Você é a Plan, assistente especialista em operação de eventos dentro da plataforma Planejar Pro.',
    'Fale sempre em português do Brasil, com ortografia correta, tom educado e detalhado para usuário não técnico.',
    'Use os dados do contexto real (evento e financeiro). Não invente números.',
    'Se faltar dado, informe explicitamente que não encontrou.',
    'Resposta obrigatoriamente com as seções abaixo, nessa ordem e com títulos idênticos:',
    '1) Resumo do cenário',
    '2) Passo a passo recomendado',
    '3) Como validar se ficou certo',
    '4) Se der erro',
    'No passo a passo, escreva no mínimo 4 passos numerados.',
    'Quando útil, cite o nome do evento e valores financeiros do contexto.',
  ].join(' ');

  const userPrompt = JSON.stringify(
    {
      usuario: context.userName,
      pergunta: context.question,
      rota_atual: context.path,
      evento_atual: context.event,
      financeiro_usuario: context.finance,
      hints_atuais: context.hints,
      base_conhecimento: context.docs,
    },
    null,
    2
  );

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 1400,
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    throw new Error(`cloudflare_http_${response.status}`);
  }

  const raw = (await response.json()) as Record<string, unknown>;
  const result = (raw.result ?? {}) as Record<string, unknown>;

  const textCandidates = [
    result.response,
    result.output_text,
    raw.response,
    raw.output_text,
  ];

  for (const candidate of textCandidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }

  throw new Error('empty_ai_response');
}

function ensureStructuredAnswer(answer: string, fallback: string, userName: string) {
  const requiredSections = [
    'Resumo do cenário',
    'Passo a passo recomendado',
    'Como validar se ficou certo',
    'Se der erro',
  ];

  const hasAllSections = requiredSections.every((section) =>
    answer.toLowerCase().includes(section.toLowerCase())
  );

  if (!hasAllSections) return fallback;

  const safeAnswer = answer.startsWith('Olá')
    ? answer
    : `Olá ${userName}, tudo bem?\n\n${answer}`;

  return safeAnswer;
}

function buildSuggestedActions(params: {
  question: string;
  path: string;
  hints: SuggestedAction[];
  event: EventSnapshot | null;
}) {
  const actions: SuggestedAction[] = [...params.hints];
  const normalizedQuestion = normalizeText(params.question);

  if (params.event) {
    actions.push({
      label: `Abrir ${params.event.name}`,
      path: `/dashboard/eventos/${params.event.id}`,
    });
  }

  if (
    normalizedQuestion.includes('financeir') ||
    normalizedQuestion.includes('caixa') ||
    normalizedQuestion.includes('pagament') ||
    normalizedQuestion.includes('receber')
  ) {
    actions.push({ label: 'Abrir financeiro', path: '/dashboard/financeiro' });
  }

  if (
    normalizedQuestion.includes('rsvp') ||
    normalizedQuestion.includes('convidad')
  ) {
    actions.push({ label: 'Abrir eventos', path: '/dashboard/eventos' });
  }

  if (
    normalizedQuestion.includes('fornecedor') ||
    normalizedQuestion.includes('cronograma') ||
    normalizedQuestion.includes('torre')
  ) {
    actions.push({ label: 'Abrir eventos', path: '/dashboard/eventos' });
  }

  if (actions.length === 0) {
    actions.push({
      label: 'Abrir dashboard',
      path: params.path.startsWith('/dashboard') ? params.path : '/dashboard',
    });
  }

  return uniqActions(actions);
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse(405, { error: 'method_not_allowed' });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !supabaseAnonKey) {
    return jsonResponse(500, { error: 'server_misconfigured' });
  }

  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return jsonResponse(401, {
      code: 401,
      message: 'Missing authorization header',
    });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData?.user) {
    return jsonResponse(401, { error: 'unauthorized' });
  }

  let payload: ChatPayload;
  try {
    payload = (await request.json()) as ChatPayload;
  } catch {
    return jsonResponse(400, { error: 'invalid_json' });
  }

  const question = normalizeString(payload.message);
  if (!question) {
    return jsonResponse(400, { error: 'message_required' });
  }

  const userName = normalizeName(payload.user_name);
  const currentPath = normalizeString(payload.current_path, '/dashboard');
  const explicitEventId = normalizeString(payload.current_event_id);
  const eventId = extractEventId(currentPath, explicitEventId);
  const hints = normalizeHints(payload.hints);

  const [eventSnapshot, financeSnapshot, helpDocs] = await Promise.all([
    getEventSnapshot(supabase, authData.user.id, eventId),
    getFinanceSnapshot(supabase, authData.user.id),
    getHelpDocs(supabase, question),
  ]);

  const fallbackAnswer = buildFallbackAnswer({
    userName,
    question,
    event: eventSnapshot,
    finance: financeSnapshot,
  });

  let answer = fallbackAnswer;
  try {
    const aiAnswer = await callCloudflareAi({
      userName,
      question,
      path: currentPath,
      event: eventSnapshot,
      finance: financeSnapshot,
      docs: helpDocs,
      hints,
    });
    answer = ensureStructuredAnswer(aiAnswer, fallbackAnswer, userName);
  } catch (error) {
    console.error('plan-assistant-chat ai_error', error);
  }

  const suggestedActions = buildSuggestedActions({
    question,
    path: currentPath,
    hints,
    event: eventSnapshot,
  });

  return jsonResponse(200, {
    answer,
    suggested_actions: suggestedActions,
    context: {
      event_id: eventSnapshot?.id ?? null,
    },
  });
});

