import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCopy,
  Clock,
  Loader2,
  MapPin,
  Rocket,
  ShieldAlert,
  ShieldCheck,
  Users,
  Wrench,
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

type EventRow = {
  id: string;
  name: string;
  event_date: string;
  location: string | null;
};

type VendorRow = {
  id: string;
  name: string;
  category: string;
  control_token: string | null;
  expected_arrival_time: string | null;
  expected_done_time: string | null;
};

type StatusRow = {
  vendor_id: string;
  status: 'pending' | 'en_route' | 'arrived' | 'done';
  created_at: string;
  updated_by: 'assessoria' | 'fornecedor';
  note: string | null;
};

type AlertRow = {
  id: string;
  vendor_id: string;
  alert_type: 'arrival_pre_alert' | 'arrival_late' | 'done_late';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  dedupe_key: string;
  created_at: string;
};

type IncidentRow = {
  id: string;
  event_id: string;
  vendor_id: string | null;
  severity: 'warning' | 'critical';
  status: 'open' | 'resolved';
  title: string;
  note: string | null;
  action_plan: string | null;
  created_at: string;
  resolved_at: string | null;
  vendor:
    | {
        name: string;
        category: string;
      }
    | {
        name: string;
        category: string;
      }[]
    | null;
};

type CoupleUpdateRow = {
  id: string;
  event_id: string;
  kind: 'info' | 'milestone' | 'celebration';
  title: string;
  message: string;
  created_at: string;
};

type CommandConfig = {
  lead_minutes: number[];
  late_grace_minutes: number;
};

type ComputedAlert = {
  vendor_id: string;
  alert_type: 'arrival_pre_alert' | 'arrival_late' | 'done_late';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  dedupe_key: string;
  triggered_for: string | null;
};

const STATUS_LABEL: Record<StatusRow['status'], string> = {
  pending: 'Aguardando',
  en_route: 'A caminho',
  arrived: 'Chegou',
  done: 'Finalizado',
};

const STATUS_COLOR: Record<StatusRow['status'], string> = {
  pending: 'bg-amber-100 text-amber-700',
  en_route: 'bg-blue-100 text-blue-700',
  arrived: 'bg-emerald-100 text-emerald-700',
  done: 'bg-gray-100 text-gray-600',
};

const ALERT_COLOR: Record<ComputedAlert['severity'], string> = {
  info: 'border-blue-200 bg-blue-50 text-blue-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  critical: 'border-red-200 bg-red-50 text-red-800',
};

function combineDateTime(dateStr: string, timeStr: string | null) {
  if (!timeStr) return null;
  const [hour, minute] = timeStr.split(':').map((v) => Number(v));
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  const base = new Date(dateStr);
  base.setHours(hour, minute, 0, 0);
  return base;
}

function toIsoOrNull(value: Date | null) {
  return value ? value.toISOString() : null;
}

export function EventCommandCenterPage() {
  const { id } = useParams<{ id: string }>();
  const eventId = id ?? '';
  const { user } = useAuth();

  const [event, setEvent] = useState<EventRow | null>(null);
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [statusRows, setStatusRows] = useState<StatusRow[]>([]);
  const [storedAlerts, setStoredAlerts] = useState<AlertRow[]>([]);
  const [incidents, setIncidents] = useState<IncidentRow[]>([]);
  const [coupleUpdates, setCoupleUpdates] = useState<CoupleUpdateRow[]>([]);
  const [config, setConfig] = useState<CommandConfig>({
    lead_minutes: [60, 30, 15],
    late_grace_minutes: 10,
  });
  const [leadMinutesInput, setLeadMinutesInput] = useState('60,30,15');
  const [lateGraceInput, setLateGraceInput] = useState('10');
  const [savingConfig, setSavingConfig] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'assessoria' | 'noivos'>('assessoria');
  const [tourStep, setTourStep] = useState(0);
  const [tourOpen, setTourOpen] = useState(false);
  const [savingIncident, setSavingIncident] = useState(false);
  const [resolvingIncidentId, setResolvingIncidentId] = useState<string | null>(null);
  const [savingCoupleUpdate, setSavingCoupleUpdate] = useState(false);
  const [incidentForm, setIncidentForm] = useState({
    vendor_id: '',
    severity: 'warning' as 'warning' | 'critical',
    title: '',
    action_plan: '',
    note: '',
  });
  const [coupleUpdateForm, setCoupleUpdateForm] = useState({
    kind: 'info' as 'info' | 'milestone' | 'celebration',
    title: '',
    message: '',
  });

  const loadData = useCallback(async () => {
    if (!eventId || !user) return;
    setLoading(true);

    const [
      eventRes,
      vendorRes,
      statusRes,
      configRes,
      alertsRes,
      incidentsRes,
      coupleUpdatesRes,
    ] =
      await Promise.all([
      supabase
        .from('events')
        .select('id, name, event_date, location')
        .eq('id', eventId)
        .eq('user_id', user.id)
        .single(),
      supabase
        .from('event_vendors')
        .select(
          'id, name, category, control_token, expected_arrival_time, expected_done_time'
        )
        .eq('event_id', eventId)
        .order('created_at', { ascending: true }),
      supabase
        .from('event_vendor_status')
        .select('vendor_id, status, created_at, updated_by, note')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false }),
      supabase
        .from('event_command_config')
        .select('lead_minutes, late_grace_minutes')
        .eq('event_id', eventId)
        .maybeSingle(),
      supabase
        .from('event_command_alerts')
        .select('id, vendor_id, alert_type, severity, message, dedupe_key, created_at')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('event_command_incidents')
        .select(
          'id, event_id, vendor_id, severity, status, title, note, action_plan, created_at, resolved_at, vendor:event_vendors(name, category)'
        )
        .eq('event_id', eventId)
        .order('created_at', { ascending: false })
        .limit(30),
      supabase
        .from('event_couple_updates')
        .select('id, event_id, kind, title, message, created_at')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

    if (!eventRes.error) setEvent(eventRes.data as EventRow);
    if (!vendorRes.error) setVendors((vendorRes.data as VendorRow[]) ?? []);
    if (!statusRes.error) setStatusRows((statusRes.data as StatusRow[]) ?? []);
    if (!alertsRes.error) setStoredAlerts((alertsRes.data as AlertRow[]) ?? []);
    if (!incidentsRes.error) setIncidents((incidentsRes.data as IncidentRow[]) ?? []);
    if (!coupleUpdatesRes.error) {
      setCoupleUpdates((coupleUpdatesRes.data as CoupleUpdateRow[]) ?? []);
    }

    if (!configRes.error && configRes.data) {
      const loaded = configRes.data as CommandConfig;
      setConfig(loaded);
      setLeadMinutesInput((loaded.lead_minutes ?? [60, 30, 15]).join(','));
      setLateGraceInput(String(loaded.late_grace_minutes ?? 10));
    } else {
      setConfig({ lead_minutes: [60, 30, 15], late_grace_minutes: 10 });
      setLeadMinutesInput('60,30,15');
      setLateGraceInput('10');
    }

    setLoading(false);
    const key = `pp_torre_onboarding_${eventId}`;
    if (!localStorage.getItem(key)) {
      setTourOpen(true);
      setTourStep(0);
      localStorage.setItem(key, 'seen');
    }
  }, [eventId, user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadData();
  }, [loadData]);

  const latestStatus = useMemo(() => {
    const map = new Map<string, StatusRow>();
    statusRows.forEach((row) => {
      if (!map.has(row.vendor_id)) {
        map.set(row.vendor_id, row);
      }
    });
    return map;
  }, [statusRows]);

  const statusHistoryByVendor = useMemo(() => {
    const map = new Map<string, StatusRow[]>();
    statusRows.forEach((row) => {
      const current = map.get(row.vendor_id) ?? [];
      current.push(row);
      map.set(row.vendor_id, current);
    });
    return map;
  }, [statusRows]);

  const computedAlerts = useMemo(() => {
    if (!event?.event_date) return [] as ComputedAlert[];
    const now = new Date();
    const leadMinutes = (config.lead_minutes ?? [60, 30, 15])
      .map((n) => Number(n))
      .filter((n) => Number.isFinite(n) && n >= 0)
      .sort((a, b) => b - a);
    const lateGrace = Number(config.late_grace_minutes ?? 10);

    const out: ComputedAlert[] = [];
    vendors.forEach((vendor) => {
      const currentStatus = latestStatus.get(vendor.id)?.status ?? 'pending';
      const expectedArrival = combineDateTime(event.event_date, vendor.expected_arrival_time);
      const expectedDone = combineDateTime(event.event_date, vendor.expected_done_time);

      if (expectedArrival && currentStatus !== 'arrived' && currentStatus !== 'done') {
        leadMinutes.forEach((minutes) => {
          const triggerAt = new Date(expectedArrival.getTime() - minutes * 60 * 1000);
          if (now >= triggerAt && now < expectedArrival) {
            const sev: ComputedAlert['severity'] =
              minutes <= 15 ? 'critical' : minutes <= 30 ? 'warning' : 'info';
            out.push({
              vendor_id: vendor.id,
              alert_type: 'arrival_pre_alert',
              severity: sev,
              message: `${vendor.name}: faltam ${minutes} min para a chegada prevista.`,
              dedupe_key: `${event.id}:${vendor.id}:arrival_pre:${minutes}`,
              triggered_for: toIsoOrNull(triggerAt),
            });
          }
        });

        const lateAt = new Date(expectedArrival.getTime() + lateGrace * 60 * 1000);
        if (now >= lateAt) {
          out.push({
            vendor_id: vendor.id,
            alert_type: 'arrival_late',
            severity: 'critical',
            message: `${vendor.name}: chegada atrasada (previsto ${vendor.expected_arrival_time}).`,
            dedupe_key: `${event.id}:${vendor.id}:arrival_late`,
            triggered_for: toIsoOrNull(lateAt),
          });
        }
      }

      if (expectedDone && currentStatus !== 'done') {
        const lateDoneAt = new Date(expectedDone.getTime() + lateGrace * 60 * 1000);
        if (now >= lateDoneAt) {
          out.push({
            vendor_id: vendor.id,
            alert_type: 'done_late',
            severity: 'warning',
            message: `${vendor.name}: finalizacao atrasada (previsto ${vendor.expected_done_time}).`,
            dedupe_key: `${event.id}:${vendor.id}:done_late`,
            triggered_for: toIsoOrNull(lateDoneAt),
          });
        }
      }
    });
    return out;
  }, [event, vendors, latestStatus, config]);

  const alertsForView = useMemo(() => {
    const seen = new Set<string>();
    const merged: ComputedAlert[] = [];
    computedAlerts.forEach((alert) => {
      if (!seen.has(alert.dedupe_key)) {
        seen.add(alert.dedupe_key);
        merged.push(alert);
      }
    });
    return merged;
  }, [computedAlerts]);

  const incidentStats = useMemo(() => {
    const open = incidents.filter((incident) => incident.status === 'open').length;
    const resolved = incidents.filter((incident) => incident.status === 'resolved').length;
    return { open, resolved };
  }, [incidents]);

  const tranquilidadeMensagem = useMemo(() => {
    const criticalOpen = incidents.filter(
      (incident) => incident.status === 'open' && incident.severity === 'critical'
    ).length;
    if (criticalOpen > 0) {
      return 'A assessoria esta conduzindo ajustes internos e mantendo tudo sob controle.';
    }
    return 'Operacao fluindo conforme o planejado. Aproveitem cada momento.';
  }, [incidents]);

  const noivosFeed = useMemo(() => {
    if (coupleUpdates.length > 0) return coupleUpdates.slice(0, 5);
    return [
      {
        id: 'fallback-1',
        event_id: eventId,
        kind: 'milestone' as const,
        title: 'Equipe em operacao',
        message:
          'Todos os fornecedores estao sendo acompanhados em tempo real pela assessoria.',
        created_at: new Date().toISOString(),
      },
    ];
  }, [coupleUpdates, eventId]);

  useEffect(() => {
    async function persistAlerts() {
      if (!eventId || alertsForView.length === 0) return;
      const existing = new Set(storedAlerts.map((a) => a.dedupe_key));
      const toInsert = alertsForView.filter((a) => !existing.has(a.dedupe_key));
      if (toInsert.length === 0) return;
      await supabase.from('event_command_alerts').insert(
        toInsert.map((a) => ({
          event_id: eventId,
          vendor_id: a.vendor_id,
          alert_type: a.alert_type,
          severity: a.severity,
          message: a.message,
          dedupe_key: a.dedupe_key,
          triggered_for: a.triggered_for,
        }))
      );
      const { data } = await supabase
        .from('event_command_alerts')
        .select('id, vendor_id, alert_type, severity, message, dedupe_key, created_at')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false })
        .limit(20);
      setStoredAlerts((data as AlertRow[]) ?? []);
    }
    persistAlerts();
  }, [alertsForView, storedAlerts, eventId]);

  const noivosStats = useMemo(() => {
    const total = vendors.length;
    const arrivedOrDone = vendors.filter((vendor) => {
      const st = latestStatus.get(vendor.id)?.status ?? 'pending';
      return st === 'arrived' || st === 'done';
    }).length;
    const done = vendors.filter((vendor) => {
      const st = latestStatus.get(vendor.id)?.status ?? 'pending';
      return st === 'done';
    }).length;
    const pct = total > 0 ? Math.round((arrivedOrDone / total) * 100) : 100;
    return { total, arrivedOrDone, done, pct };
  }, [vendors, latestStatus]);

  async function updateStatus(vendorId: string, status: StatusRow['status']) {
    if (!eventId) return;
    await supabase.from('event_vendor_status').insert({
      event_id: eventId,
      vendor_id: vendorId,
      status,
      updated_by: 'assessoria',
    });
    const { data } = await supabase
      .from('event_vendor_status')
      .select('vendor_id, status, created_at, updated_by, note')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });
    setStatusRows((data as StatusRow[]) ?? []);
  }

  async function saveConfig() {
    if (!eventId) return;
    setSavingConfig(true);
    const parsedLead = leadMinutesInput
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n) && n >= 0);
    const uniqueLead = Array.from(new Set(parsedLead)).sort((a, b) => b - a);
    const grace = Number(lateGraceInput);
    const safeGrace = Number.isFinite(grace) && grace >= 0 ? grace : 10;

    await supabase.from('event_command_config').upsert({
      event_id: eventId,
      lead_minutes: uniqueLead.length > 0 ? uniqueLead : [60, 30, 15],
      late_grace_minutes: safeGrace,
      updated_at: new Date().toISOString(),
    });

    setConfig({
      lead_minutes: uniqueLead.length > 0 ? uniqueLead : [60, 30, 15],
      late_grace_minutes: safeGrace,
    });
    setSavingConfig(false);
  }

  async function refreshIncidents() {
    if (!eventId) return;
    const { data } = await supabase
      .from('event_command_incidents')
      .select(
        'id, event_id, vendor_id, severity, status, title, note, action_plan, created_at, resolved_at, vendor:event_vendors(name, category)'
      )
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })
      .limit(30);
    setIncidents((data as IncidentRow[]) ?? []);
  }

  async function refreshCoupleUpdates() {
    if (!eventId) return;
    const { data } = await supabase
      .from('event_couple_updates')
      .select('id, event_id, kind, title, message, created_at')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })
      .limit(20);
    setCoupleUpdates((data as CoupleUpdateRow[]) ?? []);
  }

  async function createIncident() {
    if (!eventId || !user) return;
    const title = incidentForm.title.trim();
    if (!title) return;

    setSavingIncident(true);
    await supabase.from('event_command_incidents').insert({
      event_id: eventId,
      vendor_id: incidentForm.vendor_id || null,
      severity: incidentForm.severity,
      title,
      action_plan: incidentForm.action_plan.trim() || null,
      note: incidentForm.note.trim() || null,
      created_by: user.id,
    });

    setIncidentForm({
      vendor_id: '',
      severity: 'warning',
      title: '',
      action_plan: '',
      note: '',
    });
    setSavingIncident(false);
    await refreshIncidents();
  }

  async function resolveIncident(incidentId: string) {
    if (!user) return;
    setResolvingIncidentId(incidentId);
    await supabase
      .from('event_command_incidents')
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString(),
        resolved_by: user.id,
      })
      .eq('id', incidentId);
    setResolvingIncidentId(null);
    await refreshIncidents();
  }

  async function createCoupleUpdate() {
    if (!eventId || !user) return;
    const title = coupleUpdateForm.title.trim();
    const message = coupleUpdateForm.message.trim();
    if (!title || !message) return;

    setSavingCoupleUpdate(true);
    await supabase.from('event_couple_updates').insert({
      event_id: eventId,
      user_id: user.id,
      kind: coupleUpdateForm.kind,
      title,
      message,
    });

    setCoupleUpdateForm({
      kind: 'info',
      title: '',
      message: '',
    });
    setSavingCoupleUpdate(false);
    await refreshCoupleUpdates();
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gold-500" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Evento nao encontrado.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 text-sm text-gray-500 mb-2">
              <Link to={`/dashboard/eventos/${event.id}`} className="hover:text-gray-700">
                Voltar ao evento
              </Link>
              <span>•</span>
              <span>Torre de Controle</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Central do Evento</h1>
            <div className="flex flex-wrap gap-4 text-sm text-gray-600 mt-2">
              <span className="inline-flex items-center gap-1">
                <Users className="w-4 h-4" />
                {event.name}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {new Date(event.event_date).toLocaleDateString('pt-BR')}
              </span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {event.location ?? 'Sem local'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMode('assessoria')}
              className={`px-4 py-2 rounded-full text-sm font-semibold ${
                mode === 'assessoria'
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              Modo Assessoria
            </button>
            <button
              type="button"
              onClick={() => setMode('noivos')}
              className={`px-4 py-2 rounded-full text-sm font-semibold ${
                mode === 'noivos'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              Modo Noivos
            </button>
          </div>
        </div>

        {mode === 'assessoria' && (
          <>
            <div className="mb-8 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-900">Regras de alerta (SLA)</h2>
              <p className="text-sm text-gray-500 mt-1">
                Configure janelas antes do horario previsto e tolerancia de atraso.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                <div>
                  <label className="text-xs text-gray-500">Pre-alerta (min)</label>
                  <input
                    value={leadMinutesInput}
                    onChange={(e) => setLeadMinutesInput(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="60,30,15"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Tolerancia (min)</label>
                  <input
                    value={lateGraceInput}
                    onChange={(e) => setLateGraceInput(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="10"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={saveConfig}
                    disabled={savingConfig}
                    className="px-4 py-2 bg-gray-900 text-white rounded-lg"
                  >
                    {savingConfig ? 'Salvando...' : 'Salvar regras'}
                  </button>
                </div>
              </div>
            </div>

            {alertsForView.length > 0 && (
              <div className="mb-6 space-y-2">
                {alertsForView.map((alert) => (
                  <div
                    key={alert.dedupe_key}
                    className={`flex items-center gap-2 px-4 py-3 rounded-xl border ${ALERT_COLOR[alert.severity]}`}
                  >
                    <AlertTriangle className="w-4 h-4" />
                    {alert.message}
                  </div>
                ))}
              </div>
            )}

            <div className="mb-8 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">SOS da Assessoria</h2>
                  <p className="text-sm text-gray-500">
                    Registre incidentes e plano de acao para resolver rapido.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-3 py-1 rounded-full bg-red-100 text-red-700 font-semibold">
                    {incidentStats.open} abertos
                  </span>
                  <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 font-semibold">
                    {incidentStats.resolved} resolvidos
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <select
                      value={incidentForm.vendor_id}
                      onChange={(e) =>
                        setIncidentForm((prev) => ({ ...prev, vendor_id: e.target.value }))
                      }
                      className="px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">Fornecedor (opcional)</option>
                      {vendors.map((vendor) => (
                        <option key={vendor.id} value={vendor.id}>
                          {vendor.name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={incidentForm.severity}
                      onChange={(e) =>
                        setIncidentForm((prev) => ({
                          ...prev,
                          severity: e.target.value as 'warning' | 'critical',
                        }))
                      }
                      className="px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="warning">Warning</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                  <input
                    value={incidentForm.title}
                    onChange={(e) =>
                      setIncidentForm((prev) => ({ ...prev, title: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Titulo do incidente"
                  />
                  <input
                    value={incidentForm.action_plan}
                    onChange={(e) =>
                      setIncidentForm((prev) => ({ ...prev, action_plan: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Plano B / acao imediata"
                  />
                  <textarea
                    value={incidentForm.note}
                    onChange={(e) =>
                      setIncidentForm((prev) => ({ ...prev, note: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    rows={3}
                    placeholder="Detalhes e contexto"
                  />
                  <button
                    type="button"
                    onClick={createIncident}
                    disabled={savingIncident || !incidentForm.title.trim()}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg disabled:opacity-60"
                  >
                    <ShieldAlert className="w-4 h-4" />
                    {savingIncident ? 'Registrando...' : 'Acionar SOS'}
                  </button>
                </div>

                <div className="space-y-3 max-h-72 overflow-auto pr-1">
                  {incidents.length === 0 && (
                    <p className="text-sm text-gray-400">Nenhum incidente registrado.</p>
                  )}
                  {incidents.map((incident) => {
                    const vendorInfo = Array.isArray(incident.vendor)
                      ? incident.vendor[0]
                      : incident.vendor;
                    return (
                      <div
                        key={incident.id}
                        className={`rounded-xl border p-3 ${
                          incident.status === 'open'
                            ? 'border-red-200 bg-red-50/40'
                            : 'border-emerald-200 bg-emerald-50/40'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-gray-900">{incident.title}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {vendorInfo?.name ?? 'Sem fornecedor'} •{' '}
                              {new Date(incident.created_at).toLocaleString('pt-BR')}
                            </p>
                          </div>
                          <span className="text-[11px] px-2 py-1 rounded-full bg-white border border-gray-200 text-gray-700 font-semibold">
                            {incident.severity}
                          </span>
                        </div>
                        {incident.action_plan && (
                          <p className="text-sm text-gray-700 mt-2 inline-flex items-center gap-1">
                            <Wrench className="w-3.5 h-3.5" />
                            {incident.action_plan}
                          </p>
                        )}
                        {incident.note && (
                          <p className="text-sm text-gray-600 mt-1">{incident.note}</p>
                        )}
                        {incident.status === 'open' ? (
                          <button
                            type="button"
                            onClick={() => resolveIncident(incident.id)}
                            disabled={resolvingIncidentId === incident.id}
                            className="mt-3 px-3 py-1.5 text-xs rounded-lg bg-emerald-600 text-white disabled:opacity-60"
                          >
                            {resolvingIncidentId === incident.id
                              ? 'Resolvendo...'
                              : 'Marcar como resolvido'}
                          </button>
                        ) : (
                          <p className="mt-3 text-xs text-emerald-700 font-semibold">
                            Resolvido
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mb-8 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-900">Comunicados para os noivos</h2>
              <p className="text-sm text-gray-500 mt-1">
                Publique atualizacoes positivas para o Modo Tranquilidade.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4">
                <select
                  value={coupleUpdateForm.kind}
                  onChange={(e) =>
                    setCoupleUpdateForm((prev) => ({
                      ...prev,
                      kind: e.target.value as 'info' | 'milestone' | 'celebration',
                    }))
                  }
                  className="px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="info">Info</option>
                  <option value="milestone">Marco</option>
                  <option value="celebration">Celebracao</option>
                </select>
                <input
                  value={coupleUpdateForm.title}
                  onChange={(e) =>
                    setCoupleUpdateForm((prev) => ({ ...prev, title: e.target.value }))
                  }
                  className="md:col-span-3 px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Titulo da atualizacao"
                />
                <textarea
                  value={coupleUpdateForm.message}
                  onChange={(e) =>
                    setCoupleUpdateForm((prev) => ({ ...prev, message: e.target.value }))
                  }
                  className="md:col-span-4 px-3 py-2 border border-gray-300 rounded-lg"
                  rows={3}
                  placeholder="Mensagem para tranquilizar os noivos"
                />
              </div>
              <button
                type="button"
                onClick={createCoupleUpdate}
                disabled={
                  savingCoupleUpdate ||
                  !coupleUpdateForm.title.trim() ||
                  !coupleUpdateForm.message.trim()
                }
                className="mt-3 px-4 py-2 rounded-lg bg-emerald-600 text-white disabled:opacity-60"
              >
                {savingCoupleUpdate ? 'Publicando...' : 'Publicar no modo noivos'}
              </button>

              <div className="mt-4 space-y-2 max-h-56 overflow-auto pr-1">
                {coupleUpdates.length === 0 && (
                  <p className="text-sm text-gray-400">Nenhum comunicado publicado.</p>
                )}
                {coupleUpdates.slice(0, 6).map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2"
                  >
                    <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                    <p className="text-sm text-gray-600 mt-1">{item.message}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {item.kind} • {new Date(item.created_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        <div className="mb-8 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Checklist automatico</h2>
              <p className="text-sm text-gray-500">
                Horarios previstos e status atual de cada fornecedor.
              </p>
            </div>
          </div>
          <div className="space-y-3">
            {vendors.map((vendor) => {
              const st = latestStatus.get(vendor.id)?.status ?? 'pending';
              return (
                <div
                  key={vendor.id}
                  className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded-xl bg-gray-50"
                >
                  <div>
                    <p className="font-semibold text-gray-900">{vendor.name}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Chegada: {vendor.expected_arrival_time ?? '--'} • Finalizacao:{' '}
                      {vendor.expected_done_time ?? '--'}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLOR[st]}`}
                  >
                    {STATUS_LABEL[st]}
                  </span>
                </div>
              );
            })}
            {vendors.length === 0 && (
              <p className="text-sm text-gray-400">Nenhum fornecedor cadastrado.</p>
            )}
          </div>
        </div>

        {mode === 'assessoria' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {vendors.map((vendor, index) => {
              const latestUpdate = latestStatus.get(vendor.id);
              const history = (statusHistoryByVendor.get(vendor.id) ?? []).slice(0, 6);
              const current = latestUpdate?.status ?? 'pending';
              const shareUrl = vendor.control_token
                ? `${window.location.origin}/torre/${vendor.control_token}`
                : '';
              const highlightButtons =
                tourOpen && tourStep === 0 && index === 0
                  ? 'relative z-50 ring-4 ring-red-500 ring-offset-4'
                  : '';
              const highlightShare =
                tourOpen && tourStep === 1 && index === 0
                  ? 'relative z-50 ring-4 ring-red-500 ring-offset-4'
                  : '';

              return (
                <div
                  key={vendor.id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{vendor.name}</h3>
                      <p className="text-sm text-gray-500">{vendor.category}</p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLOR[current]}`}
                    >
                      {STATUS_LABEL[current]}
                    </span>
                  </div>
                  {latestUpdate && (
                    <p className="mt-2 text-xs text-gray-500">
                      Ultima atualizacao:{' '}
                      {new Date(latestUpdate.created_at).toLocaleTimeString('pt-BR')}
                      {latestUpdate.note ? ` • ${latestUpdate.note}` : ''}
                    </p>
                  )}

                  <div className={`mt-4 grid grid-cols-2 gap-2 ${highlightButtons}`}>
                    {(['en_route', 'arrived', 'done'] as StatusRow['status'][]).map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => updateStatus(vendor.id, status)}
                        className={`px-3 py-2 rounded-lg text-xs font-semibold border ${
                          current === status
                            ? 'bg-gray-900 text-white border-gray-900'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                        }`}
                      >
                        {STATUS_LABEL[status]}
                      </button>
                    ))}
                  </div>

                  <div className="mt-4">
                    <p className="text-xs font-semibold text-gray-700 mb-2">
                      Historico de atualizacoes
                    </p>
                    <div className="space-y-1.5 max-h-40 overflow-auto pr-1">
                      {history.length === 0 && (
                        <p className="text-xs text-gray-400">Sem atualizacoes ainda.</p>
                      )}
                      {history.map((row, idx) => (
                        <div
                          key={`${row.vendor_id}-${row.created_at}-${idx}`}
                          className="text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded-lg px-2 py-1.5"
                        >
                          <span className="font-semibold text-gray-800">
                            {STATUS_LABEL[row.status]}
                          </span>{' '}
                          • {new Date(row.created_at).toLocaleTimeString('pt-BR')}
                          {' • '}
                          {row.updated_by === 'fornecedor' ? 'fornecedor' : 'assessoria'}
                          {row.note ? ` • ${row.note}` : ''}
                        </div>
                      ))}
                    </div>
                  </div>

                  {shareUrl && (
                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={() => navigator.clipboard.writeText(shareUrl)}
                        className={`inline-flex items-center gap-2 text-xs font-semibold text-gray-600 hover:text-gray-900 ${highlightShare}`}
                      >
                        <ClipboardCopy className="w-4 h-4" />
                        Copiar link do fornecedor
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {mode === 'noivos' && (
          <div className="space-y-6">
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 text-emerald-800">
              <div className="flex items-center gap-2 text-lg font-semibold">
                <ShieldCheck className="w-5 h-5" />
                Tudo sob controle
              </div>
              <p className="text-sm mt-2">
                {tranquilidadeMensagem}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white border border-gray-100 rounded-2xl p-5">
                <p className="text-xs text-gray-500">Fornecedores ativos</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{noivosStats.total}</p>
              </div>
              <div className="bg-white border border-gray-100 rounded-2xl p-5">
                <p className="text-xs text-gray-500">Ja chegaram</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {noivosStats.arrivedOrDone}
                </p>
              </div>
              <div className="bg-white border border-gray-100 rounded-2xl p-5">
                <p className="text-xs text-gray-500">Progresso operacional</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{noivosStats.pct}%</p>
              </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-2xl p-6">
              <div className="flex items-center gap-2 text-gray-900 font-semibold">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                Mensagem para os noivos
              </div>
              <p className="text-sm text-gray-600 mt-2">
                A producao esta sendo acompanhada em tempo real pela assessoria.
                Aproveitem o evento.
              </p>
            </div>

            <div className="bg-white border border-gray-100 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-gray-900">Atualizacoes da assessoria</h3>
              <p className="text-sm text-gray-500 mt-1">
                Resumo positivo das etapas para voces curtirem tranquilos.
              </p>
              <div className="mt-4 space-y-3">
                {noivosFeed.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-emerald-100 bg-emerald-50/50 px-4 py-3"
                  >
                    <p className="text-sm font-semibold text-emerald-900">{item.title}</p>
                    <p className="text-sm text-emerald-800 mt-1">{item.message}</p>
                    <p className="text-xs text-emerald-700 mt-1">
                      {new Date(item.created_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {mode === 'assessoria' && storedAlerts.length > 0 && (
          <div className="mt-8 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-lg font-bold text-gray-900">Historico de alertas</h3>
            <div className="mt-4 space-y-2">
              {storedAlerts.slice(0, 8).map((alert) => (
                <div key={alert.id} className="text-sm text-gray-700">
                  <span className="font-semibold">[{alert.severity.toUpperCase()}]</span>{' '}
                  {alert.message}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {tourOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm pointer-events-none" />
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
              <div className="flex items-center gap-2 text-lg font-bold text-gray-900">
                <Rocket className="w-5 h-5 text-red-500" />
                Torre de Controle
              </div>
              <p className="text-sm text-gray-600 mt-2">
                {tourStep === 0
                  ? 'Use os botoes para atualizar status em tempo real.'
                  : 'Compartilhe o link para o fornecedor atualizar o proprio status.'}
              </p>
              <div className="flex justify-end gap-2 mt-6">
                {tourStep === 0 ? (
                  <button
                    type="button"
                    onClick={() => setTourStep(1)}
                    className="px-4 py-2 bg-gray-900 text-white rounded-lg"
                  >
                    Entendi
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setTourOpen(false)}
                    className="px-4 py-2 bg-gray-900 text-white rounded-lg"
                  >
                    Comecar
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
