const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type Suggestion = {
  title: string;
  reason: string;
  activity: string;
  time: string;
  assignee: string;
  priority: 'high' | 'medium' | 'low';
};

type TimelinePayload = {
  event?: Record<string, unknown>;
  metrics?: Record<string, unknown>;
  timeline?: unknown[];
  tasks?: unknown[];
  vendors?: unknown[];
  rules_suggestions?: unknown[];
};

function errorResponse(code: number, error: string) {
  return new Response(JSON.stringify({ error }), {
    status: code,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function normalizeString(value: unknown, fallback = ''): string {
  if (typeof value !== 'string') return fallback;
  const clean = value.trim();
  return clean || fallback;
}

function normalizePriority(value: unknown): 'high' | 'medium' | 'low' {
  if (value === 'high' || value === 'medium' || value === 'low') return value;
  return 'medium';
}

function normalizeSuggestion(item: unknown, index: number): Suggestion | null {
  if (!item || typeof item !== 'object') return null;
  const row = item as Record<string, unknown>;

  const activity = normalizeString(row.activity);
  const time = normalizeString(row.time);
  if (!activity || !time) return null;

  return {
    title: normalizeString(row.title, `Sugestao ${index + 1}`),
    reason: normalizeString(row.reason, 'Recomendacao automatica da IA.'),
    activity,
    time,
    assignee: normalizeString(row.assignee),
    priority: normalizePriority(row.priority),
  };
}

function extractJsonFromText(text: string): unknown[] {
  const trimmed = text.trim();
  const codeBlock = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const maybeJson = codeBlock?.[1] ?? trimmed;

  try {
    const parsed = JSON.parse(maybeJson);
    if (Array.isArray(parsed)) return parsed;
    if (
      parsed &&
      typeof parsed === 'object' &&
      Array.isArray((parsed as Record<string, unknown>).suggestions)
    ) {
      return (parsed as Record<string, unknown>).suggestions as unknown[];
    }
  } catch {
    return [];
  }

  return [];
}

async function runCloudflareAi(payload: TimelinePayload): Promise<Suggestion[]> {
  const accountId = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');
  const apiToken = Deno.env.get('CLOUDFLARE_API_TOKEN');
  const model =
    Deno.env.get('CLOUDFLARE_AI_MODEL') ??
    '@cf/meta/llama-3.1-8b-instruct';

  if (!accountId || !apiToken) {
    throw new Error('missing_cloudflare_secrets');
  }

  const endpoint =
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;

  const systemPrompt =
    'Voce e um assistente de cronograma do DIA do evento. Sugira apenas atividades operacionais do proprio dia (montagem, check-in de fornecedores, cerimonia, recepcao, transicoes e encerramento). Nao sugira planejamento de semanas anteriores, reunioes pre-evento ou tarefas administrativas gerais. Retorne apenas JSON valido com uma lista "suggestions". Cada item precisa ter: title, reason, activity, time (HH:mm), assignee, priority (high|medium|low). Limite de 5 itens e sem texto extra.';

  const userPrompt = JSON.stringify(
    {
      instruction:
        'Analise o contexto e proponha proximas atividades praticas para o cronograma do dia do evento.',
      context: payload,
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
      max_tokens: 900,
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    throw new Error(`cloudflare_http_${response.status}`);
  }

  const raw = (await response.json()) as Record<string, unknown>;
  const result = raw.result as Record<string, unknown> | undefined;
  const resultText =
    normalizeString(result?.response) ||
    normalizeString(result?.output_text) ||
    normalizeString(raw.response) ||
    '';

  const suggestionsRaw = extractJsonFromText(resultText);
  return suggestionsRaw
    .map((item, index) => normalizeSuggestion(item, index))
    .filter((item): item is Suggestion => item !== null)
    .slice(0, 5);
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return errorResponse(405, 'method_not_allowed');
  }

  try {
    const payload = (await request.json()) as TimelinePayload;
    const suggestions = await runCloudflareAi(payload);
    return new Response(JSON.stringify({ suggestions }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('timeline-ai error', error);
    return errorResponse(500, 'timeline_ai_failed');
  }
});
