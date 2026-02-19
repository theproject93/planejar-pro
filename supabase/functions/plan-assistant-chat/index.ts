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

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
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

function extractEventId(path: string, explicitEventId: string) {
  if (explicitEventId) return explicitEventId;
  const match = path.match(/\/dashboard\/eventos\/([0-9a-fA-F-]{8,})/);
  return match?.[1] ?? '';
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

function formatMoney(value: number) {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  });
}

function isSmallTalk(question: string) {
  const q = normalizeText(question);
  return (
    q.includes('obrigad') ||
    q.includes('valeu') ||
    q.includes('show') ||
    q === 'ok' ||
    q === 'blz' ||
    q.includes('entendi') ||
    q.includes('ola') ||
    q.includes('olá')
  );
}

type QuestionTopic =
  | 'smalltalk'
  | 'finance'
  | 'vendors'
  | 'guests'
  | 'timeline'
  | 'documents'
  | 'generic';

function classifyQuestionTopic(question: string): QuestionTopic {
  if (isSmallTalk(question)) return 'smalltalk';
  const q = normalizeText(question);

  if (
    q.includes('financeir') ||
    q.includes('caixa') ||
    q.includes('pagament') ||
    q.includes('receber') ||
    q.includes('saldo') ||
    q.includes('fluxo')
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

  if (q.includes('convidad') || q.includes('rsvp') || q.includes('confirmacao')) {
    return 'guests';
  }

  if (
    q.includes('cronograma') ||
    q.includes('tarefa') ||
    q.includes('checklist') ||
    q.includes('atras')
  ) {
    return 'timeline';
  }

  if (
    q.includes('documento') ||
    q.includes('comprovante') ||
    q.includes('arquivo') ||
    q.includes('anexo')
  ) {
    return 'documents';
  }

  return 'generic';
}

function shouldForceStructuredSections(question: string) {
  const q = normalizeText(question);
  return (
    q.includes('financeir') ||
    q.includes('caixa') ||
    q.includes('saldo') ||
    q.includes('conciliar') ||
    q.includes('card') ||
    q.includes('grafico') ||
    q.includes('erro') ||
    q.includes('validar')
  );
}

function asksNavigationIntent(question: string) {
  const q = normalizeText(question);
  return (
    q.includes('abrir') ||
    q.includes('abra ') ||
    q.includes('ir para') ||
    q.includes('onde fica') ||
    q.includes('qual tela') ||
    q.includes('como acessar') ||
    q.includes('acessar') ||
    q.includes('navegar') ||
    q.includes('me leva')
  );
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

  const [vendorsRes, guestsRes, tasksRes, expensesRes, paymentsRes] = await Promise.all([
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
      .select('id, value')
      .eq('event_id', eventId),
    supabase
      .from('expense_payments')
      .select('id, amount')
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

  const baseBalance = balanceRes.error ? 0 : normalizeNumber(balanceRes.data?.base_balance);
  const entries = entriesRes.error ? [] : (entriesRes.data ?? []);
  const expenses = expensesRes.error ? [] : (expensesRes.data ?? []);

  const confirmedIn = entries
    .filter((row) => {
      const status = normalizeString((row as { status?: unknown }).status).toLowerCase();
      return status === 'confirmado' || status === 'pago';
    })
    .reduce((sum, row) => sum + normalizeNumber((row as { amount?: unknown }).amount), 0);

  const plannedIn = entries
    .filter((row) => {
      const status = normalizeString((row as { status?: unknown }).status).toLowerCase();
      return status === 'pendente' || status === 'previsto' || status === 'parcelado';
    })
    .reduce((sum, row) => sum + normalizeNumber((row as { amount?: unknown }).amount), 0);

  const confirmedOut = expenses
    .filter((row) => {
      const status = normalizeString((row as { status?: unknown }).status).toLowerCase();
      return status === 'confirmado' || status === 'pago' || status === 'parcelado';
    })
    .reduce((sum, row) => sum + normalizeNumber((row as { amount?: unknown }).amount), 0);

  const plannedOut = expenses
    .filter((row) => {
      const status = normalizeString((row as { status?: unknown }).status).toLowerCase();
      return status === 'pendente' || status === 'previsto' || status === 'parcelado';
    })
    .reduce((sum, row) => sum + normalizeNumber((row as { amount?: unknown }).amount), 0);

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

  return docs
    .map((row) => {
      const module = normalizeString(row.module);
      const title = normalizeString(row.title);
      const content = normalizeString(row.content);
      const keywords = Array.isArray(row.keywords)
        ? row.keywords.map((item) => normalizeString(item))
        : [];

      const haystack = normalizeText(`${module} ${title} ${content} ${keywords.join(' ')}`);
      const score = tokens.reduce(
        (sum, token) => (token && haystack.includes(token) ? sum + 1 : sum),
        0
      );

      return { module, title, content, keywords, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((row) => ({
      module: row.module,
      title: row.title,
      content: row.content,
      keywords: row.keywords,
    }));
}

function buildFallbackAnswer(params: {
  userName: string;
  question: string;
  event: EventSnapshot | null;
  finance: FinanceSnapshot;
}): string {
  const { userName, question, event, finance } = params;

  if (isSmallTalk(question)) {
    return `De nada, ${userName}. Se quiser, eu te ajudo no próximo passo agora (financeiro, cronograma, convidados, fornecedores ou torre de comando).`;
  }

  const topic = classifyQuestionTopic(question);
  const lines: string[] = [];

  lines.push(`Olá ${userName}, tudo bem?`);
  lines.push('');
  if (topic === 'vendors') {
    lines.push('Resumo do cenário');
    if (event) {
      lines.push(
        `- No evento "${event.name}", há ${event.vendors_total} fornecedor(es) e ${event.vendors_without_schedule} sem horário definido.`
      );
    } else {
      lines.push(
        '- Não identifiquei um evento aberto agora, então vou te passar um fluxo prático de negociação.'
      );
    }
    lines.push(
      '- Quando um fornecedor não quer assinar contrato, o risco principal é operação sem garantia de escopo, prazo e multa.'
    );

    lines.push('');
    lines.push('Passo a passo recomendado');
    lines.push('1. Descubra a objeção real: prazo, cláusula de multa, forma de pagamento ou exclusividade.');
    lines.push('2. Proponha versão simplificada com escopo fechado, entregáveis, horários, política de cancelamento e reajuste.');
    lines.push('3. Formalize por assinatura eletrônica ou aceite por escrito (e-mail/WhatsApp) com os termos completos.');
    lines.push('4. Defina plano B com fornecedor reserva e prazo limite para decisão.');

    lines.push('');
    lines.push('Como validar se ficou certo');
    lines.push('- O fornecedor confirmou por escrito escopo, valor, datas e responsabilidades.');
    lines.push('- O documento ficou anexado no evento para consulta da equipe.');
    lines.push('- Existe contingência ativa caso o fornecedor recue.');

    lines.push('');
    lines.push('Se der erro');
    lines.push('- Se ele continuar recusando formalização, não confirme reserva sem sinal e sem aceite registrado.');
    lines.push('- Se quiser, te ajudo a montar uma mensagem curta de negociação para enviar agora.');

    return lines.join('\n');
  }

  if (topic !== 'finance') {
    lines.push('Resumo do cenário');
    if (event) {
      lines.push(
        `- Evento atual: "${event.name}" com ${event.tasks_overdue} tarefa(s) atrasada(s), ${event.vendors_without_schedule} fornecedor(es) sem horário e ${event.guests_pending_rsvp} RSVP pendente(s).`
      );
    } else {
      lines.push('- Não identifiquei um evento específico no contexto atual.');
    }
    lines.push('- Posso te orientar melhor se você me disser o módulo exato (fornecedores, convidados, cronograma, documentos ou financeiro).');

    lines.push('');
    lines.push('Passo a passo recomendado');
    lines.push('1. Abra o evento que você quer ajustar.');
    lines.push('2. Diga qual resultado você precisa agora (ex.: negociar fornecedor, confirmar convidados, corrigir atraso).');
    lines.push('3. Eu te devolvo um plano objetivo com os próximos passos.');

    lines.push('');
    lines.push('Como validar se ficou certo');
    lines.push('- A ação definida fica clara, com responsável e prazo.');
    lines.push('- O ajuste aparece no módulo correto dentro do evento.');

    lines.push('');
    lines.push('Se der erro');
    lines.push('- Se a tela não atualizar, recarregue e tente novamente.');
    lines.push('- Se persistir, me diga a rota e o botão clicado para eu te orientar no ajuste exato.');
    return lines.join('\n');
  }

  lines.push('Resumo do cenário');
  lines.push(
    `- No seu financeiro geral: saldo em caixa estimado em ${formatMoney(finance.cash_balance)}, entradas programadas em ${formatMoney(finance.planned_in)} e saídas programadas em ${formatMoney(finance.planned_out)}.`
  );

  if (event) {
    lines.push(
      `- No evento "${event.name}": orçamento ${formatMoney(event.budget_total)}, gasto ${formatMoney(event.budget_spent)} e pendente para receber ${formatMoney(event.receivable_open)}.`
    );
  } else {
    lines.push(
      '- Não identifiquei um evento específico no contexto atual. Se você quiser orientação por evento, abra o evento e me pergunte novamente.'
    );
  }

  lines.push('');
  lines.push('Passo a passo recomendado');
  lines.push('1. Abra o Financeiro Geral e valide os cards principais.');
  if (event) {
    lines.push(`2. Abra o evento "${event.name}" e confira a aba Financeiro.`);
    lines.push('3. Compare lançamentos confirmados e previstos entre evento e financeiro geral.');
  } else {
    lines.push('2. Abra "Eventos" e escolha o evento em que você precisa de apoio.');
    lines.push('3. Revise a aba Financeiro do evento e depois compare com os cards gerais.');
  }
  lines.push('4. Se houver divergência, ajuste o lançamento na origem e salve novamente.');

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

  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;

  const systemPrompt = [
    'Você é a Plan, assistente especialista em operação de eventos dentro da plataforma Planejar Pro.',
    'Fale sempre em português do Brasil, com ortografia correta, tom educado e detalhado para usuário não técnico.',
    'Use os dados do contexto real (evento e financeiro). Não invente números.',
    'Se faltar dado, informe explicitamente que não encontrou.',
    'Se a mensagem for cumprimento, agradecimento ou conversa curta, responda de forma breve e natural (sem relatório).',
    'Para perguntas de diagnóstico da plataforma, use as seções:',
    '1) Resumo do cenário',
    '2) Passo a passo recomendado',
    '3) Como validar se ficou certo',
    '4) Se der erro',
    'Se a pergunta for sobre negociação com fornecedor/contrato, responda focando o tema e não force diagnóstico financeiro.',
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
      max_tokens: 1300,
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`cloudflare_http_${response.status}:${body.slice(0, 220)}`);
  }

  const raw = (await response.json()) as Record<string, unknown>;
  const result = (raw.result ?? {}) as Record<string, unknown>;

  const candidates = [
    result.response,
    result.output_text,
    raw.response,
    raw.output_text,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }

  throw new Error('empty_ai_response');
}

function ensureStructuredAnswer(
  answer: string,
  fallback: string,
  userName: string,
  question: string
) {
  if (isSmallTalk(answer) && answer.trim().length < 360) {
    return answer;
  }

  if (!shouldForceStructuredSections(question)) {
    if (answer.startsWith('Olá')) return answer;
    return `Olá ${userName}, tudo bem?\n\n${answer.trim()}`;
  }

  const requiredSections = [
    'Resumo do cenário',
    'Passo a passo recomendado',
    'Como validar se ficou certo',
    'Se der erro',
  ];

  const normalized = normalizeText(answer);
  const hasAllSections = requiredSections.every((section) =>
    normalized.includes(normalizeText(section))
  );

  if (!hasAllSections) {
    if (answer.trim().length >= 80) {
      return `Olá ${userName}, tudo bem?\n\n${answer.trim()}`;
    }
    return fallback;
  }

  if (answer.startsWith('Olá')) return answer;
  return `Olá ${userName}, tudo bem?\n\n${answer}`;
}

function buildSuggestedActions(params: {
  question: string;
  hints: SuggestedAction[];
  event: EventSnapshot | null;
}) {
  const actions: SuggestedAction[] = [];
  const normalizedQuestion = normalizeText(params.question);

  if (isSmallTalk(params.question)) return [];
  if (!asksNavigationIntent(params.question)) return [];

  const asksAlerts =
    normalizedQuestion.includes('alerta') ||
    normalizedQuestion.includes('pendenc') ||
    normalizedQuestion.includes('prioridad');

  if (asksAlerts && params.hints.length > 0) {
    actions.push(...params.hints.slice(0, 1));
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
    params.event &&
    (
      normalizedQuestion.includes('evento') ||
      normalizedQuestion.includes('fornecedor') ||
      normalizedQuestion.includes('cronograma') ||
      normalizedQuestion.includes('convidad') ||
      normalizedQuestion.includes('buffet') ||
      normalizedQuestion.includes('tarefa')
    )
  ) {
    actions.push({
      label: `Abrir ${params.event.name}`,
      path: `/dashboard/eventos/${params.event.id}`,
    });
  }

  if (
    normalizedQuestion.includes('fornecedor') ||
    normalizedQuestion.includes('cronograma') ||
    normalizedQuestion.includes('rsvp') ||
    normalizedQuestion.includes('convidad')
  ) {
    actions.push({ label: 'Abrir eventos', path: '/dashboard/eventos' });
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
  let aiUsed = false;
  let aiError: string | null = null;

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
    answer = ensureStructuredAnswer(aiAnswer, fallbackAnswer, userName, question);
    aiUsed = true;
  } catch (error) {
    aiError = error instanceof Error ? error.message : 'ai_unknown_error';
    console.error('plan-assistant-chat ai_error', error);
  }

  const suggestedActions = buildSuggestedActions({
    question,
    hints,
    event: eventSnapshot,
  });

  return jsonResponse(200, {
    answer,
    suggested_actions: suggestedActions,
    meta: {
      ai_used: aiUsed,
      ai_error: aiError,
    },
    context: {
      event_id: eventSnapshot?.id ?? null,
    },
  });
});
