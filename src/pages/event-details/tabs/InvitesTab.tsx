import React, { useMemo, useState } from 'react';
import { Check, Copy, MessageCircle, Share2 } from 'lucide-react';

type GuestStatus = 'pending' | 'confirmed' | 'declined';

type EventLike = {
  id: string;
  name: string;
  couple?: string | null;
  eventdate?: string | null;
  event_date?: string | null;
  location?: string | null;
  invite_message_template?: string | null;
  invite_dress_code?: string | null;
};

type GuestLike = {
  id: string;
  name: string;
  phone?: string | null;
  invite_token?: string | null;
  rsvp_status?: GuestStatus | null;
  invited_at?: string | null;
  responded_at?: string | null;
};

type Props<TGuest extends GuestLike> = {
  event: EventLike;
  guests: TGuest[];
  baseInviteUrl: string;
  onUpdateInviteSettings: (payload: {
    invite_message_template: string;
    invite_dress_code: string;
  }) => void | Promise<void>;
  onMarkPendingReminderSent: () => void | Promise<void>;
};

const DEFAULT_TEMPLATE =
  'Ola [Nome do Convidado]!\n\nVoce foi convidado(a) para [Evento].\nData: [Data]\nLocal: [Local]\nDress code: [DressCode]\n\nConfirme sua presenca aqui: [LinkRSVP]';

function getEventDateValue(event: EventLike) {
  return event.eventdate ?? event.event_date ?? null;
}

function formatPtBR(date: string | null) {
  if (!date) return 'A definir';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return 'A definir';
  return d.toLocaleDateString('pt-BR');
}

function normalizeStatus(status: string | null | undefined): GuestStatus {
  const normalized = (status ?? '').trim().toLowerCase();
  if (normalized === 'confirmed' || normalized === 'declined' || normalized === 'pending') {
    return normalized;
  }
  return 'pending';
}

function statusLabel(status: GuestStatus) {
  if (status === 'confirmed') return 'Confirmado';
  if (status === 'declined') return 'Recusado';
  return 'Pendente';
}

function statusClass(status: GuestStatus) {
  if (status === 'confirmed') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (status === 'declined') return 'bg-rose-50 text-rose-700 border-rose-200';
  return 'bg-amber-50 text-amber-700 border-amber-200';
}

function fillTemplate(params: {
  template: string;
  guestName: string;
  eventName: string;
  eventDate: string;
  location: string;
  dressCode: string;
  inviteLink: string;
}) {
  return params.template
    .replaceAll('[Nome do Convidado]', params.guestName)
    .replaceAll('[Evento]', params.eventName)
    .replaceAll('[Data]', params.eventDate)
    .replaceAll('[Local]', params.location)
    .replaceAll('[DressCode]', params.dressCode)
    .replaceAll('[LinkRSVP]', params.inviteLink);
}

export function InvitesTab<TGuest extends GuestLike>({
  event,
  guests,
  baseInviteUrl,
  onUpdateInviteSettings,
  onMarkPendingReminderSent,
}: Props<TGuest>) {
  const eventTitle = useMemo(() => event.couple || event.name, [event.couple, event.name]);

  const dateLabel = useMemo(() => {
    const v = getEventDateValue(event);
    return formatPtBR(v);
  }, [event]);

  const locationLabel = useMemo(() => event.location || 'A definir', [event.location]);

  const [template, setTemplate] = useState(
    (event.invite_message_template ?? '').trim() || DEFAULT_TEMPLATE
  );
  const [dressCode, setDressCode] = useState((event.invite_dress_code ?? '').trim());
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isMarkingReminder, setIsMarkingReminder] = useState(false);
  const [copiedGuestId, setCopiedGuestId] = useState<string | null>(null);
  const [copiedReport, setCopiedReport] = useState(false);

  const summary = useMemo(() => {
    let confirmed = 0;
    let declined = 0;
    let pending = 0;
    let pendingWithoutPhone = 0;
    let lastReminderAt: string | null = null;

    for (const guest of guests) {
      const status = normalizeStatus(guest.rsvp_status);
      if (status === 'confirmed') confirmed += 1;
      else if (status === 'declined') declined += 1;
      else {
        pending += 1;
        const phone = (guest.phone ?? '').replace(/\D/g, '');
        if (phone.length < 10) pendingWithoutPhone += 1;
      }

      if (guest.invited_at) {
        if (!lastReminderAt || new Date(guest.invited_at) > new Date(lastReminderAt)) {
          lastReminderAt = guest.invited_at;
        }
      }
    }

    return { confirmed, declined, pending, pendingWithoutPhone, lastReminderAt };
  }, [guests]);

  const responseRate = useMemo(() => {
    if (guests.length === 0) return 0;
    return Math.round(((summary.confirmed + summary.declined) / guests.length) * 100);
  }, [guests.length, summary.confirmed, summary.declined]);

  async function handleSaveSettings() {
    if (isSavingSettings) return;
    setIsSavingSettings(true);
    try {
      await onUpdateInviteSettings({
        invite_message_template: template,
        invite_dress_code: dressCode,
      });
    } finally {
      setIsSavingSettings(false);
    }
  }

  async function copyInviteLink(guest: TGuest) {
    if (!guest.invite_token) return;
    await navigator.clipboard.writeText(`${baseInviteUrl}/${guest.invite_token}`);
    setCopiedGuestId(guest.id);
    window.setTimeout(() => setCopiedGuestId((prev) => (prev === guest.id ? null : prev)), 1500);
  }

  async function copyRsvpReport() {
    const lines = [
      `RSVP - ${eventTitle}`,
      `Total convidados: ${guests.length}`,
      `Confirmados: ${summary.confirmed}`,
      `Pendentes: ${summary.pending}`,
      `Recusados: ${summary.declined}`,
      `Taxa de resposta: ${responseRate}%`,
    ];

    if (summary.pending > 0) {
      const pendingNames = guests
        .filter((guest) => normalizeStatus(guest.rsvp_status) === 'pending')
        .map((guest) => guest.name)
        .slice(0, 15);
      lines.push(`Pendentes (amostra): ${pendingNames.join(', ')}`);
    }

    await navigator.clipboard.writeText(lines.join('\n'));
    setCopiedReport(true);
    window.setTimeout(() => setCopiedReport(false), 1500);
  }

  async function handleMarkReminder() {
    if (isMarkingReminder) return;
    setIsMarkingReminder(true);
    try {
      await onMarkPendingReminderSent();
    } finally {
      setIsMarkingReminder(false);
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
        <Share2 className="w-5 h-5 text-green-500" />
        Convites Digitais + RSVP
      </h3>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-xs px-2 py-1 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
          Confirmados: {summary.confirmed}
        </span>
        <span className="text-xs px-2 py-1 rounded-full border bg-amber-50 text-amber-700 border-amber-200">
          Pendentes: {summary.pending}
        </span>
        <span className="text-xs px-2 py-1 rounded-full border bg-rose-50 text-rose-700 border-rose-200">
          Recusados: {summary.declined}
        </span>
        <span className="text-xs px-2 py-1 rounded-full border bg-blue-50 text-blue-700 border-blue-200">
          Taxa de resposta: {responseRate}%
        </span>
      </div>

      <div className="mb-6 p-3 rounded-lg border border-gray-200 bg-gray-50 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void handleMarkReminder()}
          disabled={isMarkingReminder || summary.pending === 0}
          className="px-3 py-2 rounded-lg bg-gray-900 text-white text-xs font-semibold hover:bg-gray-800 disabled:opacity-60"
        >
          {isMarkingReminder ? 'Registrando...' : 'Registrar lembrete para pendentes'}
        </button>
        <button
          type="button"
          onClick={() => void copyRsvpReport()}
          className="px-3 py-2 rounded-lg border border-gray-300 text-xs font-semibold hover:bg-white"
        >
          {copiedReport ? 'Relatório copiado' : 'Copiar relatório RSVP'}
        </button>
        <span className="text-xs text-gray-600">
          Pendentes sem telefone: <b>{summary.pendingWithoutPhone}</b>
        </span>
        {summary.lastReminderAt ? (
          <span className="text-xs text-gray-500">
            Último lembrete: {new Date(summary.lastReminderAt).toLocaleString('pt-BR')}
          </span>
        ) : (
          <span className="text-xs text-gray-400">Nenhum lembrete registrado</span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Modelo da mensagem
          </label>
          <textarea
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            rows={8}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm"
          />

          <label className="block text-sm font-medium text-gray-700 mt-4 mb-2">
            Dress code (opcional)
          </label>
          <input
            value={dressCode}
            onChange={(e) => setDressCode(e.target.value)}
            placeholder="Ex: Esporte fino"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm"
          />

          <button
            type="button"
            onClick={() => void handleSaveSettings()}
            disabled={isSavingSettings}
            className="mt-4 px-4 py-2 rounded-lg bg-pink-500 text-white text-sm font-semibold hover:bg-pink-600 disabled:opacity-60"
          >
            {isSavingSettings ? 'Salvando...' : 'Salvar modelo'}
          </button>

          <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-100 text-gray-800 text-sm whitespace-pre-line">
            {fillTemplate({
              template,
              guestName: '[Nome do Convidado]',
              eventName: eventTitle,
              eventDate: dateLabel,
              location: locationLabel,
              dressCode: dressCode || 'A definir',
              inviteLink: `${baseInviteUrl}/[token]`,
            })}
          </div>
        </div>

        <div>
          <h4 className="font-bold text-gray-700 mb-4">Disparo por convidado</h4>

          <div className="border border-gray-200 rounded-lg overflow-hidden max-h-[560px] overflow-y-auto">
            {guests.map((guest) => {
              const inviteLink = guest.invite_token
                ? `${baseInviteUrl}/${guest.invite_token}`
                : '';

              const message = fillTemplate({
                template,
                guestName: guest.name,
                eventName: eventTitle,
                eventDate: dateLabel,
                location: locationLabel,
                dressCode: dressCode || 'A definir',
                inviteLink,
              });

              const encodedMsg = encodeURIComponent(message);
              const phone = guest.phone ? guest.phone.replace(/\D/g, '') : '';
              const hasPhone = phone.length >= 10;
              const status = normalizeStatus(guest.rsvp_status);

              return (
                <div
                  key={guest.id}
                  className="p-3 border-b last:border-0 hover:bg-gray-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-gray-800 font-medium">{guest.name}</p>
                      <p className="text-xs text-gray-500">
                        {guest.phone || 'Sem telefone'}
                      </p>
                    </div>
                    <span className={`text-[11px] px-2 py-1 rounded-full border ${statusClass(status)}`}>
                      {statusLabel(status)}
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {hasPhone ? (
                      <a
                        href={`https://wa.me/55${phone}?text=${encodedMsg}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-3 py-1.5 bg-green-500 text-white text-xs font-bold rounded hover:bg-green-600 transition-colors"
                      >
                        <MessageCircle className="w-3 h-3" />
                        WhatsApp
                      </a>
                    ) : (
                      <span className="text-xs text-gray-400 italic">Add telefone</span>
                    )}

                    {guest.invite_token ? (
                      <button
                        type="button"
                        onClick={() => void copyInviteLink(guest)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 text-xs font-semibold rounded hover:bg-gray-100"
                      >
                        {copiedGuestId === guest.id ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        {copiedGuestId === guest.id ? 'Copiado' : 'Copiar link'}
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400 italic">Sem token</span>
                    )}
                  </div>

                  {guest.responded_at ? (
                    <p className="mt-2 text-[11px] text-gray-500">
                      Respondeu em: {new Date(guest.responded_at).toLocaleString('pt-BR')}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
