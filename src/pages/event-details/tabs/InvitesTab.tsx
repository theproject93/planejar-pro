import React, { useMemo } from 'react';
import { MessageCircle, Share2 } from 'lucide-react';

type EventLike = {
  name: string;
  couple?: string | null;
  // compat: hoje seu type EventRow usa eventdate; trecho antigo usava event_date
  eventdate?: string | null;
  event_date?: string | null;
  location?: string | null;
};

type GuestLike = {
  id: string;
  name: string;
  phone?: string | null;
};

type Props<TGuest extends GuestLike> = {
  event: EventLike;
  guests: TGuest[];
};

function getEventDateValue(event: EventLike) {
  return event.eventdate ?? event.event_date ?? null;
}

function formatPtBR(date: string | null) {
  if (!date) return 'A definir';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return 'A definir';
  return d.toLocaleDateString('pt-BR');
}

export function InvitesTab<TGuest extends GuestLike>({
  event,
  guests,
}: Props<TGuest>) {
  const eventTitle = useMemo(
    () => event.couple || event.name,
    [event.couple, event.name]
  );

  const dateLabel = useMemo(() => {
    const v = getEventDateValue(event);
    return formatPtBR(v);
  }, [event]);

  const locationLabel = useMemo(
    () => event.location || 'A definir',
    [event.location]
  );

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
        <Share2 className="w-5 h-5 text-green-500" />
        Envio de Convites Digitais
      </h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Configuração da Mensagem */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Modelo da Mensagem (WhatsApp)
          </label>

          <div className="p-4 bg-green-50 rounded-lg border border-green-100 text-gray-800 text-sm whitespace-pre-line">
            Olá <strong>[Nome do Convidado]</strong>! 👋
            <br />
            <br />
            Você foi convidado(a) com muito carinho para{' '}
            <strong>{eventTitle}</strong>!
            <br />
            <br />
            📅 Data: {dateLabel}
            <br />
            📍 Local: {locationLabel}
            <br />
            <br />
            Por favor, confirme sua presença respondendo esta mensagem.
          </div>

          <p className="text-xs text-gray-500 mt-2">
            * Dica: Futuramente teremos um link de confirmação automática aqui.
          </p>
        </div>

        {/* Lista de Envios */}
        <div>
          <h4 className="font-bold text-gray-700 mb-4">
            Enviar para convidados
          </h4>

          <div className="border border-gray-200 rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
            {guests.map((guest) => {
              // Gera o link do WhatsApp
              const message =
                `Olá ${guest.name}! 👋\n\n` +
                `Você foi convidado(a) com muito carinho para ${eventTitle}!\n\n` +
                `📅 Data: ${dateLabel}\n` +
                `📍 Local: ${locationLabel}\n\n` +
                `Por favor, confirme sua presença!`;

              const encodedMsg = encodeURIComponent(message);
              const phone = guest.phone ? guest.phone.replace(/\D/g, '') : '';
              const hasPhone = phone.length >= 10;

              return (
                <div
                  key={guest.id}
                  className="flex justify-between items-center p-3 border-b last:border-0 hover:bg-gray-50"
                >
                  <div>
                    <p className="text-gray-800 font-medium">{guest.name}</p>
                    <p className="text-xs text-gray-500">
                      {guest.phone || 'Sem telefone'}
                    </p>
                  </div>

                  {hasPhone ? (
                    <a
                      href={`https://wa.me/55${phone}?text=${encodedMsg}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-3 py-1.5 bg-green-500 text-white text-xs font-bold rounded hover:bg-green-600 transition-colors"
                    >
                      <MessageCircle className="w-3 h-3" />
                      Enviar
                    </a>
                  ) : (
                    <span className="text-xs text-gray-400 italic">
                      Add telefone
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
