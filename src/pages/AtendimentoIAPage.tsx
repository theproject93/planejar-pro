import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { trackEvent } from '../lib/telemetry';

type Message = { role: 'assistant' | 'user'; content: string };

function stripInternalActionPayload(text: string): {
  cleanText: string;
  hasCaptureAction: boolean;
} {
  const trimmed = text.trim();
  const directJsonMatch = trimmed.match(/^\{[\s\S]*\}$/);
  const jsonCandidate = directJsonMatch ? trimmed : null;

  function tryParseCaptureAction(raw: string): boolean {
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      return parsed.action === 'capture_lead';
    } catch {
      return false;
    }
  }

  if (jsonCandidate && tryParseCaptureAction(jsonCandidate)) {
    return {
      cleanText:
        'Perfeito, recebi seus dados e vou encaminhar seu atendimento para finalizarmos sua assinatura.',
      hasCaptureAction: true,
    };
  }

  const inlineJsonMatch = text.match(/\{[\s\S]*"action"\s*:\s*"capture_lead"[\s\S]*\}/);
  if (inlineJsonMatch && tryParseCaptureAction(inlineJsonMatch[0])) {
    const withoutJson = text.replace(inlineJsonMatch[0], '').trim();
    return {
      cleanText:
        withoutJson ||
        'Perfeito, recebi seus dados e vou encaminhar seu atendimento para finalizarmos sua assinatura.',
      hasCaptureAction: true,
    };
  }

  return { cleanText: text, hasCaptureAction: false };
}

function sanitizeAssistantCopy(text: string): string {
  let output = text;
  output = output.replace(/\bempres[aá]rio(s)?\b/gi, 'profissional$1');
  output = output.replace(/\baut[oô]nomo(s)?\b/gi, 'profissional$1');
  output = output.replace(/\bele\b/gi, 'ela');
  output = output.replace(/\bdele\b/gi, 'dela');
  output = output.replace(/\bdo cliente\b/gi, 'da cliente');
  output = output.replace(
    /qual [ée] seu perfil profissional\?\s*voc[êe] [ée] (um|uma) [^?]+\?/gi,
    'Qual e seu perfil profissional? Voce atua como assessora, cerimonialista ou organizadora de eventos?'
  );
  return output;
}

function normalizePlan(plan: string | null): string {
  const value = (plan ?? '').toLowerCase().trim();
  if (value.includes('elite')) return 'Elite';
  if (value.includes('essencial')) return 'Essencial';
  return 'Profissional';
}

function getAssistantText(data: unknown): string {
  if (!data || typeof data !== 'object') return '';
  const payload = data as Record<string, unknown>;
  const candidates = [
    payload.reply,
    payload.message,
    payload.assistant,
    payload.output_text,
    payload.text,
  ];

  for (const item of candidates) {
    if (typeof item === 'string' && item.trim()) {
      return item.trim();
    }
  }
  return '';
}

export function AtendimentoIAPage() {
  const [searchParams] = useSearchParams();
  const defaultPlan = useMemo(
    () => normalizePlan(searchParams.get('plano')),
    [searchParams]
  );
  const origem = searchParams.get('origem') ?? 'landing';
  const [currentInput, setCurrentInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [leadCaptured, setLeadCaptured] = useState(false);
  const [error, setError] = useState('');
  const leadTrackedRef = useRef(false);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        `Oi! Eu sou a Plan, a IA de vendas da Planejar Pro. Vou te ajudar a escolher o plano ideal para sua operação.` +
        `\n\nJá vi que voce chegou com interesse no plano ${defaultPlan}.` +
        `\nPara começar: qual seu nome e WhatsApp?`,
    },
  ]);

  useEffect(() => {
    void trackEvent({
      eventName: 'chat_started',
      page: 'atendimento-ia',
      metadata: { origin: origem, plan_hint: defaultPlan },
    });
  }, [origem, defaultPlan]);

  useEffect(() => {
    if (!leadCaptured || leadTrackedRef.current) return;
    leadTrackedRef.current = true;
    void trackEvent({
      eventName: 'lead_captured',
      page: 'atendimento-ia',
      metadata: {
        origin: origem,
        plan_hint: defaultPlan,
        message_count: messages.length,
      },
    });
  }, [leadCaptured, origem, defaultPlan, messages.length]);

  useEffect(() => {
    const el = chatContainerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length, loading]);

  async function sendToSalesAI(nextMessages: Message[]) {
    setLoading(true);
    setError('');
    const conversationWindow = nextMessages.slice(-8);
    const timeoutMs = 12000;

    try {
      const invokePromise = supabase.functions.invoke('sales-ai', {
        body: {
          conversation: conversationWindow.map((message) => ({
            role: message.role,
            content: message.content,
          })),
          metadata: {
            source: 'landing-atendimento-ia',
            origin: origem,
            plan_hint: defaultPlan,
          },
        },
      });

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('timeout')), timeoutMs);
      });

      const { data, error: functionError } = await Promise.race([
        invokePromise,
        timeoutPromise,
      ]);

      if (functionError) {
        console.error('sales-ai functionError', functionError);
        setError(
          'A IA demorou para responder. Continue no WhatsApp para atendimento imediato.'
        );
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content:
              'Estou com alta demanda agora. Se preferir, toque em "Continuar no WhatsApp" e finalizamos seu plano mais rapido.',
          },
        ]);
        return;
      }

      const assistantTextRaw = sanitizeAssistantCopy(getAssistantText(data));
      const { cleanText: assistantText, hasCaptureAction } =
        stripInternalActionPayload(assistantTextRaw);
      const payload = (data ?? {}) as Record<string, unknown>;
      const captured = Boolean(
        payload.lead_captured ?? payload.leadCaptured ?? payload.captured
      );

      setLeadCaptured(captured || hasCaptureAction);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            assistantText ||
            'Perfeito. Continue com mais detalhes para eu fechar sua assinatura.',
        },
      ]);
    } catch (err) {
      console.error('sales-ai invoke catch', err);
      setError(
        'A IA demorou para responder. Continue no WhatsApp para atendimento imediato.'
      );
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            'Nosso atendimento IA esta mais lento no momento. Clique em "Continuar no WhatsApp" para ser atendida agora.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleFormSubmit(event: FormEvent) {
    event.preventDefault();
    const text = currentInput.trim();
    if (!text || loading) return;
    const nextMessages = [
      ...messages,
      { role: 'user', content: text } as Message,
    ];
    setMessages(nextMessages);
    setCurrentInput('');
    void sendToSalesAI(nextMessages);
  }

  function handleQuickAnswer(text: string) {
    if (loading) return;
    if (text.toLowerCase().includes('falar com humano')) {
      void trackEvent({
        eventName: 'handoff_requested',
        page: 'atendimento-ia',
        metadata: { channel: 'chat', origin: origem, plan_hint: defaultPlan },
      });
    }
    const nextMessages = [
      ...messages,
      { role: 'user', content: text } as Message,
    ];
    setMessages(nextMessages);
    void sendToSalesAI(nextMessages);
  }

  function handleWhatsappClick() {
    void trackEvent({
      eventName: 'handoff_requested',
      page: 'atendimento-ia',
      metadata: { channel: 'whatsapp', origin: origem, plan_hint: defaultPlan },
    });
  }

  const whatsappMessage = encodeURIComponent(
    `Oi, quero assinar o Planejar Pro. Vim da landing (${origem}) com interesse no plano ${defaultPlan}.`
  );

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="mx-auto max-w-6xl">
        <Link
          to="/"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gold-600 mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para a landing
        </Link>

        <div className="grid lg:grid-cols-[minmax(0,1fr)_340px] gap-6 items-start">
          <div className="rounded-3xl border border-gray-200 bg-white shadow-xl overflow-hidden">
            <div className="bg-black text-white p-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-wide">
                <img
                  src="/images/plan-face-real.png"
                  alt="Rosto da Plan IA"
                  className="h-5 w-5 rounded-full object-cover border border-white/40"
                />
                Plan IA
              </div>
              <h1 className="mt-3 text-2xl font-bold">
                Atendimento comercial inteligente
              </h1>
              <p className="mt-1 text-sm text-gray-300">
                A IA entende seu perfil e acelera sua assinatura.
              </p>
            </div>

            <div
              ref={chatContainerRef}
              className="p-6 space-y-4 max-h-[55vh] overflow-y-auto bg-gray-50"
            >
              {messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                    message.role === 'assistant'
                      ? 'bg-white border border-gray-200 text-gray-700'
                      : 'ml-auto bg-black text-white'
                  }`}
                >
                  {message.content}
                </div>
              ))}
              {loading && (
                <div className="max-w-[85%] rounded-2xl px-4 py-3 text-sm bg-white border border-gray-200 text-gray-500 italic">
                  Plan esta digitando...
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-100">
              {error && (
                <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                  {error}
                </p>
              )}

              <div className="mb-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() =>
                    handleQuickAnswer(`Quero o plano ${defaultPlan}.`)
                  }
                  className="rounded-full border border-gray-300 px-3 py-1.5 text-xs hover:border-gold-500 hover:text-gold-700 transition-colors disabled:opacity-60"
                >
                  Quero plano {defaultPlan}
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() =>
                    handleQuickAnswer('Sou assessora de casamentos.')
                  }
                  className="rounded-full border border-gray-300 px-3 py-1.5 text-xs hover:border-gold-500 hover:text-gold-700 transition-colors disabled:opacity-60"
                >
                  Sou assessora
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() =>
                    handleQuickAnswer('Quero falar com humano para fechar agora.')
                  }
                  className="rounded-full border border-gray-300 px-3 py-1.5 text-xs hover:border-gold-500 hover:text-gold-700 transition-colors disabled:opacity-60"
                >
                  Falar com humano
                </button>
              </div>
              <form onSubmit={handleFormSubmit} className="flex gap-3">
                <input
                  value={currentInput}
                  onChange={(e) => setCurrentInput(e.target.value)}
                  placeholder="Digite sua resposta..."
                  className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-gold-400"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center justify-center rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white hover:bg-gray-800 transition-colors disabled:opacity-70"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Enviando
                    </>
                  ) : (
                    'Enviar'
                  )}
                </button>
              </form>

              {leadCaptured && (
                <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                  Lead capturado com sucesso. A equipe comercial pode continuar
                  seu atendimento.
                </div>
              )}

              <div className="mt-4 flex flex-col sm:flex-row gap-3">
                <a
                  target="_blank"
                  rel="noreferrer"
                  href={`https://wa.me/?text=${whatsappMessage}`}
                  onClick={handleWhatsappClick}
                  className="inline-flex items-center justify-center rounded-xl border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 hover:border-gray-400 transition-colors"
                >
                  Continuar no WhatsApp
                </a>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center rounded-xl border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 hover:border-gray-400 transition-colors"
                >
                  Ja sou cliente
                </Link>
              </div>
            </div>
          </div>

          <aside className="hidden lg:block">
            <div className="sticky top-8 rounded-3xl border border-gold-200 bg-white p-4 shadow-xl">
              <img
                src="/images/plan-full-real.png"
                alt="Plan IA sorrindo e pronta para ajudar"
                className="w-full h-auto rounded-2xl"
                loading="lazy"
              />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
