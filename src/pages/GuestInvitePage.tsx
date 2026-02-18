import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, Clock3, Loader2, MapPin, Navigation, Users, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

type GuestStatus = 'pending' | 'confirmed' | 'declined';

type GuestInviteData = {
  guest_id: string;
  event_id: string;
  event_name: string;
  event_date: string | null;
  location: string | null;
  couple: string | null;
  guest_name: string;
  rsvp_status: GuestStatus;
  plus_one_count: number | null;
  dietary_restrictions: string | null;
  rsvp_note: string | null;
  invite_message_template: string | null;
  invite_dress_code: string | null;
  table_name: string | null;
};

function normalizeStatus(value: string | null | undefined): GuestStatus {
  const normalized = (value ?? '').trim().toLowerCase();
  if (normalized === 'confirmed' || normalized === 'declined' || normalized === 'pending') {
    return normalized;
  }
  return 'pending';
}

function formatDate(value: string | null) {
  if (!value) return 'A definir';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'A definir';
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function GuestInvitePage() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submissionComplete, setSubmissionComplete] = useState(false);
  const [invite, setInvite] = useState<GuestInviteData | null>(null);
  const [status, setStatus] = useState<GuestStatus>('pending');
  const [plusOneCount, setPlusOneCount] = useState('0');
  const [dietaryRestrictions, setDietaryRestrictions] = useState('');
  const [rsvpNote, setRsvpNote] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadInvite() {
      if (!token) {
        setError('Token de convite invalido.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase
        .rpc('get_guest_invite_by_token', { p_token: token })
        .single();

      if (cancelled) return;

      if (rpcError || !data) {
        setError('Convite nao encontrado ou expirado.');
        setLoading(false);
        return;
      }

      const inviteData = data as GuestInviteData;
      const normalizedStatus = normalizeStatus(inviteData.rsvp_status);
      setInvite({ ...inviteData, rsvp_status: normalizedStatus });
      setStatus(normalizedStatus);
      setPlusOneCount(String(Math.max(Number(inviteData.plus_one_count ?? 0), 0)));
      setDietaryRestrictions(inviteData.dietary_restrictions ?? '');
      setRsvpNote(inviteData.rsvp_note ?? '');
      setLoading(false);
    }

    void loadInvite();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const eventTitle = useMemo(() => {
    if (!invite) return '';
    return invite.couple?.trim() || invite.event_name;
  }, [invite]);

  const mapsLink = !invite?.location
    ? null
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        invite.location
      )}`;

  async function submitRsvp() {
    if (!token || saving) return;

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    const parsedPlusOne = Number.parseInt(plusOneCount, 10);

    const { error: rpcError } = await supabase.rpc('submit_guest_rsvp_by_token', {
      p_token: token,
      p_status: status,
      p_plus_one_count: Number.isFinite(parsedPlusOne) ? Math.max(parsedPlusOne, 0) : 0,
      p_dietary_restrictions: dietaryRestrictions,
      p_rsvp_note: rsvpNote,
    });

    if (rpcError) {
      setError('Nao foi possivel salvar seu RSVP. Tente novamente.');
      setSaving(false);
      return;
    }

    setInvite((prev) =>
      prev
        ? {
            ...prev,
            rsvp_status: status,
            plus_one_count: Number.isFinite(parsedPlusOne)
              ? Math.max(parsedPlusOne, 0)
              : 0,
            dietary_restrictions: dietaryRestrictions.trim() || null,
            rsvp_note: rsvpNote.trim() || null,
          }
        : prev
    );

    setSuccessMessage('RSVP atualizado com sucesso. Obrigado pela confirmacao.');
    setSubmissionComplete(true);
    setSaving(false);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-amber-50 px-4 py-10">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-gray-100 shadow-xl p-6 md:p-8">
        {loading ? (
          <div className="py-20 flex items-center justify-center gap-3 text-gray-600">
            <Loader2 className="w-5 h-5 animate-spin" />
            Carregando convite...
          </div>
        ) : error ? (
          <div className="py-10 text-center">
            <XCircle className="w-10 h-10 mx-auto text-rose-500 mb-3" />
            <p className="text-gray-700">{error}</p>
          </div>
        ) : invite ? (
          <>
            {submissionComplete ? (
              <div className="py-10 text-center">
                <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 mb-3" />
                <p className="text-gray-800 font-semibold">
                  RSVP atualizado com sucesso. Obrigado pela confirmacao.
                </p>
              </div>
            ) : (
              <>
            <p className="text-xs uppercase tracking-wide text-gray-500">Convite digital</p>
            <h1 className="mt-2 text-3xl font-bold text-gray-900">{eventTitle}</h1>
            <p className="mt-2 text-gray-700">Ola, <b>{invite.guest_name}</b>. Confirme sua presenca abaixo.</p>

            <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <InfoChip icon={<Clock3 className="w-4 h-4" />} label={formatDate(invite.event_date)} />
              <InfoChip icon={<MapPin className="w-4 h-4" />} label={invite.location || 'Local a definir'} />
              <InfoChip icon={<Users className="w-4 h-4" />} label={invite.table_name ? `Mesa ${invite.table_name}` : 'Mesa ainda nao definida'} />
            </div>

            {mapsLink ? (
              <a
                href={mapsLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500"
              >
                <Navigation className="w-4 h-4" />
                Abrir rota no Google Maps
              </a>
            ) : null}

            {invite.invite_dress_code ? (
              <div className="mt-4 text-sm rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-amber-800">
                Dress code: <b>{invite.invite_dress_code}</b>
              </div>
            ) : null}

            <div className="mt-6">
              <p className="text-sm font-semibold text-gray-800 mb-2">Sua resposta</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <StatusButton
                  active={status === 'confirmed'}
                  label="Confirmar"
                  className="bg-emerald-500 hover:bg-emerald-600"
                  onClick={() => setStatus('confirmed')}
                />
                <StatusButton
                  active={status === 'pending'}
                  label="Pendente"
                  className="bg-amber-500 hover:bg-amber-600"
                  onClick={() => setStatus('pending')}
                />
                <StatusButton
                  active={status === 'declined'}
                  label="Recusar"
                  className="bg-rose-500 hover:bg-rose-600"
                  onClick={() => setStatus('declined')}
                />
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Acompanhantes</label>
                <input
                  type="number"
                  min={0}
                  value={plusOneCount}
                  onChange={(e) => setPlusOneCount(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Restricoes alimentares</label>
                <input
                  value={dietaryRestrictions}
                  onChange={(e) => setDietaryRestrictions(e.target.value)}
                  placeholder="Ex: vegetariano, lactose"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Observacao (opcional)</label>
              <textarea
                value={rsvpNote}
                onChange={(e) => setRsvpNote(e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            {successMessage ? (
              <div className="mt-4 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-700 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                {successMessage}
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => void submitRsvp()}
              disabled={saving}
              className="mt-5 w-full py-3 rounded-lg bg-gray-900 text-white font-semibold hover:bg-gray-800 disabled:opacity-60"
            >
              {saving ? 'Salvando...' : 'Salvar resposta'}
            </button>
              </>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}

function InfoChip({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 flex items-center gap-2 text-gray-700">
      {icon}
      <span>{label}</span>
    </div>
  );
}

function StatusButton({
  active,
  label,
  className,
  onClick,
}: {
  active: boolean;
  label: string;
  className: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'px-3 py-2 rounded-lg text-sm font-semibold text-white transition-opacity',
        className,
        active ? 'opacity-100 ring-2 ring-offset-2 ring-gray-900' : 'opacity-70',
      ].join(' ')}
    >
      {label}
    </button>
  );
}
