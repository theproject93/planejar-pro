import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Camera,
  Check,
  Church,
  Download,
  LogIn,
  LogOut,
  Maximize2,
  Minimize2,
  Music2,
  Pencil,
  RotateCcw,
  Toilet,
  UtensilsCrossed,
  Wine,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { supabase } from '../../../lib/supabaseClient';
import type { GuestTableRef, TableBase } from '../types';
import { getGuestTableId } from '../types';

type Props<TTable extends TableBase = TableBase> = {
  eventId: string;
  tables: TTable[];
  guests: GuestTableRef[];
  onPositionsApplied?: (next: TTable[]) => void;
  onPersistPosition: (
    tableId: string,
    x: number,
    y: number
  ) => void | Promise<void>;
};

type FixtureType =
  | 'altar'
  | 'photo_totem'
  | 'cake_table'
  | 'dance_floor'
  | 'bar'
  | 'entry_door'
  | 'exit_door'
  | 'restroom';

type DragTarget =
  | { kind: 'table'; id: string }
  | { kind: 'fixture'; id: string }
  | null;

type MapFixture = {
  id: string;
  type: FixtureType;
  x: number;
  y: number;
  w: number;
  h: number;
  customLabel?: string | null;
};

type FixtureRow = {
  id: string;
  event_id: string;
  type: string;
  x: number;
  y: number;
  w: number;
  h: number;
  custom_label?: string | null;
};

type FixtureConfig = {
  label: string;
  icon: LucideIcon;
  bgClass: string;
  borderClass: string;
  textClass: string;
  fillColor: string;
  borderColor: string;
  textColor: string;
  w: number;
  h: number;
};

const T_MAP_FIXTURES = 'event_map_fixtures';
const GRID_SIZE = 20;
const MAP_MIN_WIDTH = 980;
const MAP_MIN_HEIGHT = 620;
const TABLE_BASE_WIDTH = 180;
const TABLE_BASE_HEIGHT = 160;

const FIXTURE_LIBRARY: Record<FixtureType, FixtureConfig> = {
  altar: {
    label: 'Altar',
    icon: Church,
    bgClass: 'bg-slate-50',
    borderClass: 'border-slate-300',
    textClass: 'text-slate-700',
    fillColor: '#f8fafc',
    borderColor: '#94a3b8',
    textColor: '#334155',
    w: 280,
    h: 100,
  },
  photo_totem: {
    label: 'Totem de fotos',
    icon: Camera,
    bgClass: 'bg-amber-50',
    borderClass: 'border-amber-300',
    textClass: 'text-amber-700',
    fillColor: '#fffbeb',
    borderColor: '#fcd34d',
    textColor: '#b45309',
    w: 180,
    h: 90,
  },
  cake_table: {
    label: 'Mesa de bolo',
    icon: UtensilsCrossed,
    bgClass: 'bg-rose-50',
    borderClass: 'border-rose-300',
    textClass: 'text-rose-700',
    fillColor: '#fff1f2',
    borderColor: '#fda4af',
    textColor: '#be123c',
    w: 190,
    h: 90,
  },
  dance_floor: {
    label: 'Pista de danca',
    icon: Music2,
    bgClass: 'bg-indigo-50',
    borderClass: 'border-indigo-300',
    textClass: 'text-indigo-700',
    fillColor: '#eef2ff',
    borderColor: '#a5b4fc',
    textColor: '#4338ca',
    w: 220,
    h: 110,
  },
  bar: {
    label: 'Bar',
    icon: Wine,
    bgClass: 'bg-emerald-50',
    borderClass: 'border-emerald-300',
    textClass: 'text-emerald-700',
    fillColor: '#ecfdf5',
    borderColor: '#6ee7b7',
    textColor: '#047857',
    w: 170,
    h: 90,
  },
  entry_door: {
    label: 'Porta de entrada',
    icon: LogIn,
    bgClass: 'bg-cyan-50',
    borderClass: 'border-cyan-300',
    textClass: 'text-cyan-700',
    fillColor: '#ecfeff',
    borderColor: '#67e8f9',
    textColor: '#0e7490',
    w: 190,
    h: 80,
  },
  exit_door: {
    label: 'Porta de saida',
    icon: LogOut,
    bgClass: 'bg-sky-50',
    borderClass: 'border-sky-300',
    textClass: 'text-sky-700',
    fillColor: '#f0f9ff',
    borderColor: '#7dd3fc',
    textColor: '#0369a1',
    w: 180,
    h: 80,
  },
  restroom: {
    label: 'Banheiro',
    icon: Toilet,
    bgClass: 'bg-teal-50',
    borderClass: 'border-teal-300',
    textClass: 'text-teal-700',
    fillColor: '#f0fdfa',
    borderColor: '#5eead4',
    textColor: '#0f766e',
    w: 160,
    h: 80,
  },
};

function snapToGrid(v: number) {
  return Math.round(v / GRID_SIZE) * GRID_SIZE;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function isFixtureType(v: string): v is FixtureType {
  return v in FIXTURE_LIBRARY;
}

function mapFixtureRow(row: FixtureRow): MapFixture | null {
  if (!isFixtureType(row.type)) return null;
  return {
    id: row.id,
    type: row.type,
    x: Number(row.x) || 0,
    y: Number(row.y) || 0,
    w: Number(row.w) || FIXTURE_LIBRARY[row.type].w,
    h: Number(row.h) || FIXTURE_LIBRARY[row.type].h,
    customLabel: row.custom_label ?? null,
  };
}

export function VisualMapTab<TTable extends TableBase = TableBase>({
  eventId,
  tables,
  guests,
  onPositionsApplied,
  onPersistPosition,
}: Props<TTable>) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<HTMLDivElement | null>(null);

  const [positions, setPositions] = useState<
    Record<string, { x: number; y: number }>
  >({});
  const [fixtures, setFixtures] = useState<MapFixture[]>([]);
  const [dragTarget, setDragTarget] = useState<DragTarget>(null);
  const [editingFixtureId, setEditingFixtureId] = useState<string | null>(null);
  const [editingFixtureLabel, setEditingFixtureLabel] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasCustomLabelColumn, setHasCustomLabelColumn] = useState(true);

  const dragOffsetRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const saveTimeoutRef = useRef<ReturnType<typeof window.setTimeout> | null>(
    null
  );

  const tableScale = useMemo(() => {
    const density = tables.length + fixtures.length;
    const raw = 1.06 - Math.max(0, density - 8) * 0.025;
    return clamp(raw, 0.58, 1.05);
  }, [tables.length, fixtures.length]);
  const tableWidth = Math.round(TABLE_BASE_WIDTH * tableScale);
  const tableHeight = Math.round(TABLE_BASE_HEIGHT * tableScale);
  const fixtureScale = clamp(0.95 + (tableScale - 0.75) * 0.3, 0.78, 1);

  const mapSize = useMemo(() => {
    let maxRight = MAP_MIN_WIDTH;
    let maxBottom = MAP_MIN_HEIGHT;

    for (const table of tables) {
      const pos = positions[table.id] ?? { x: 0, y: 0 };
      maxRight = Math.max(maxRight, pos.x + tableWidth + 120);
      maxBottom = Math.max(maxBottom, pos.y + tableHeight + 120);
    }
    for (const item of fixtures) {
      maxRight = Math.max(maxRight, item.x + item.w * fixtureScale + 120);
      maxBottom = Math.max(maxBottom, item.y + item.h * fixtureScale + 120);
    }

    return {
      width: snapToGrid(maxRight),
      height: snapToGrid(maxBottom),
    };
  }, [fixtures, fixtureScale, positions, tableHeight, tableWidth, tables]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    function onFullScreenChange() {
      setIsFullscreen(document.fullscreenElement === wrapperRef.current);
    }
    document.addEventListener('fullscreenchange', onFullScreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFullScreenChange);
    };
  }, []);

  useEffect(() => {
    const initial: Record<string, { x: number; y: number }> = {};

    tables.forEach((t, index) => {
      if (typeof t.posx === 'number' && typeof t.posy === 'number') {
        initial[t.id] = { x: t.posx, y: t.posy };
        return;
      }

      const col = index % 4;
      const row = Math.floor(index / 4);
      initial[t.id] = { x: 80 + col * 220, y: 200 + row * 200 };
    });

    setPositions(initial);
  }, [tables]);

  useEffect(() => {
    let cancelled = false;

    async function loadFixtures() {
      const withCustomLabel = await supabase
        .from(T_MAP_FIXTURES)
        .select('id, event_id, type, x, y, w, h, custom_label')
        .eq('event_id', eventId)
        .order('created_at', { ascending: true });

      if (!withCustomLabel.error) {
        if (cancelled) return;
        setHasCustomLabelColumn(true);
        const rows = ((withCustomLabel.data as FixtureRow[] | null) ?? [])
          .map(mapFixtureRow)
          .filter((item): item is MapFixture => item !== null);
        setFixtures(rows);
        return;
      }

      const fallback = await supabase
        .from(T_MAP_FIXTURES)
        .select('id, event_id, type, x, y, w, h')
        .eq('event_id', eventId)
        .order('created_at', { ascending: true });

      if (fallback.error) {
        console.error('Erro ao carregar itens do mapa:', fallback.error.message);
        return;
      }

      if (cancelled) return;
      setHasCustomLabelColumn(false);
      const rows = ((fallback.data as FixtureRow[] | null) ?? [])
        .map(mapFixtureRow)
        .filter((item): item is MapFixture => item !== null);
      setFixtures(rows);
    }

    void loadFixtures();
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  const guestCountByTable = useMemo(() => {
    const m: Record<string, number> = {};
    for (const g of guests) {
      const tid = getGuestTableId(g);
      if (!tid) continue;
      m[tid] = (m[tid] ?? 0) + 1;
    }
    return m;
  }, [guests]);

  function fixtureLabel(item: MapFixture) {
    const fallback = FIXTURE_LIBRARY[item.type].label;
    const custom = (item.customLabel ?? '').trim();
    return custom || fallback;
  }

  function persistTablePosition(tableId: string, x: number, y: number) {
    if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = window.setTimeout(async () => {
      await onPersistPosition(tableId, x, y);
    }, 250);
  }

  async function persistFixturePosition(id: string, x: number, y: number) {
    const res = await supabase
      .from(T_MAP_FIXTURES)
      .update({ x, y })
      .eq('id', id);
    if (res.error) {
      console.error('Erro ao salvar posicao de item do mapa:', res.error.message);
    }
  }

  async function persistFixtureLabel(id: string, customLabel: string | null) {
    if (!hasCustomLabelColumn) return;
    const res = await supabase
      .from(T_MAP_FIXTURES)
      .update({ custom_label: customLabel })
      .eq('id', id);
    if (res.error) {
      console.error('Erro ao salvar nome do item do mapa:', res.error.message);
    }
  }

  function startEditingFixture(item: MapFixture) {
    setEditingFixtureId(item.id);
    setEditingFixtureLabel(fixtureLabel(item));
  }

  async function commitEditingFixture() {
    if (!editingFixtureId) return;

    const normalized = editingFixtureLabel.trim();
    const target = fixtures.find((f) => f.id === editingFixtureId);
    if (!target) {
      setEditingFixtureId(null);
      setEditingFixtureLabel('');
      return;
    }

    const fallback = FIXTURE_LIBRARY[target.type].label;
    const customLabel = normalized && normalized !== fallback ? normalized : null;

    setFixtures((prev) =>
      prev.map((f) =>
        f.id === editingFixtureId ? { ...f, customLabel } : f
      )
    );
    await persistFixtureLabel(editingFixtureId, customLabel);
    setEditingFixtureId(null);
    setEditingFixtureLabel('');
  }

  function onPointerDown(
    e: React.PointerEvent,
    kind: 'table' | 'fixture',
    id: string
  ) {
    const map = mapRef.current;
    if (!map) return;

    (e.currentTarget as HTMLDivElement).setPointerCapture?.(e.pointerId);

    const rect = map.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    if (kind === 'fixture') {
      const fixture = fixtures.find((f) => f.id === id);
      if (!fixture) return;
      dragOffsetRef.current = { dx: px - fixture.x, dy: py - fixture.y };
      setDragTarget({ kind, id });
      return;
    }

    const cur = positions[id] ?? { x: 0, y: 0 };
    dragOffsetRef.current = { dx: px - cur.x, dy: py - cur.y };
    setDragTarget({ kind, id });
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragTarget) return;

    const map = mapRef.current;
    if (!map) return;

    const rect = map.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    const nextX = px - dragOffsetRef.current.dx;
    const nextY = py - dragOffsetRef.current.dy;

    if (dragTarget.kind === 'table') {
      const maxX = mapSize.width - tableWidth;
      const maxY = mapSize.height - tableHeight;
      setPositions((prev) => ({
        ...prev,
        [dragTarget.id]: {
          x: clamp(nextX, 0, Math.max(0, maxX)),
          y: clamp(nextY, 0, Math.max(0, maxY)),
        },
      }));
      return;
    }

    const current = fixtures.find((f) => f.id === dragTarget.id);
    if (!current) return;

    const maxX = mapSize.width - current.w * fixtureScale;
    const maxY = mapSize.height - current.h * fixtureScale;
    setFixtures((prev) =>
      prev.map((f) =>
        f.id === dragTarget.id
          ? {
              ...f,
              x: clamp(nextX, 0, Math.max(0, maxX)),
              y: clamp(nextY, 0, Math.max(0, maxY)),
            }
          : f
      )
    );
  }

  function onPointerUp() {
    if (!dragTarget) return;

    if (dragTarget.kind === 'table') {
      const cur = positions[dragTarget.id] ?? { x: 0, y: 0 };
      const snapped = { x: snapToGrid(cur.x), y: snapToGrid(cur.y) };

      setPositions((prev) => ({ ...prev, [dragTarget.id]: snapped }));
      persistTablePosition(dragTarget.id, snapped.x, snapped.y);

      if (onPositionsApplied) {
        onPositionsApplied(
          tables.map((t) =>
            t.id === dragTarget.id
              ? ({ ...t, posx: snapped.x, posy: snapped.y } as TTable)
              : t
          )
        );
      }
    } else {
      const current = fixtures.find((f) => f.id === dragTarget.id);
      if (current) {
        const snappedX = snapToGrid(current.x);
        const snappedY = snapToGrid(current.y);
        setFixtures((prev) =>
          prev.map((f) =>
            f.id === dragTarget.id ? { ...f, x: snappedX, y: snappedY } : f
          )
        );
        void persistFixturePosition(dragTarget.id, snappedX, snappedY);
      }
    }

    setDragTarget(null);
  }

  function onLibraryDragStart(
    e: React.DragEvent<HTMLButtonElement>,
    type: FixtureType
  ) {
    e.dataTransfer.setData('text/plain', type);
    e.dataTransfer.effectAllowed = 'copy';
  }

  async function onMapDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const rawType = e.dataTransfer.getData('text/plain');
    if (!isFixtureType(rawType)) return;
    const config = FIXTURE_LIBRARY[rawType];
    const map = mapRef.current;
    if (!map) return;

    const rect = map.getBoundingClientRect();
    const x = snapToGrid(e.clientX - rect.left - config.w / 2);
    const y = snapToGrid(e.clientY - rect.top - config.h / 2);
    const scaledW = config.w * fixtureScale;
    const scaledH = config.h * fixtureScale;

    const payload: Record<string, string | number | null> = {
      event_id: eventId,
      type: rawType,
      x: clamp(x, 0, Math.max(0, mapSize.width - scaledW)),
      y: clamp(y, 0, Math.max(0, mapSize.height - scaledH)),
      w: config.w,
      h: config.h,
    };
    if (hasCustomLabelColumn) payload.custom_label = null;

    const selectCols = hasCustomLabelColumn
      ? 'id, event_id, type, x, y, w, h, custom_label'
      : 'id, event_id, type, x, y, w, h';
    const res = await supabase
      .from(T_MAP_FIXTURES)
      .insert(payload)
      .select(selectCols)
      .single();

    if (res.error) {
      console.error('Erro ao adicionar item no mapa:', res.error.message);
      return;
    }

    const mapped = mapFixtureRow(res.data as unknown as FixtureRow);
    if (!mapped) return;
    setFixtures((prev) => [...prev, mapped]);
  }

  async function removeFixture(id: string) {
    const res = await supabase.from(T_MAP_FIXTURES).delete().eq('id', id);
    if (res.error) {
      console.error('Erro ao remover item do mapa:', res.error.message);
      return;
    }
    setFixtures((prev) => prev.filter((f) => f.id !== id));
  }

  async function resetMap() {
    const res = await supabase
      .from(T_MAP_FIXTURES)
      .delete()
      .eq('event_id', eventId);
    if (res.error) {
      console.error('Erro ao resetar mapa:', res.error.message);
      return;
    }
    setFixtures([]);
    setEditingFixtureId(null);
    setEditingFixtureLabel('');
  }

  async function toggleFullscreen() {
    const root = wrapperRef.current;
    if (!root) return;
    if (document.fullscreenElement === root) {
      await document.exitFullscreen();
      return;
    }
    await root.requestFullscreen();
  }

  async function downloadPDF() {
    function drawHex(
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      w: number,
      h: number
    ) {
      ctx.beginPath();
      ctx.moveTo(x + w * 0.25, y);
      ctx.lineTo(x + w * 0.75, y);
      ctx.lineTo(x + w, y + h * 0.5);
      ctx.lineTo(x + w * 0.75, y + h);
      ctx.lineTo(x + w * 0.25, y + h);
      ctx.lineTo(x, y + h * 0.5);
      ctx.closePath();
    }

    function drawCenteredText(
      ctx: CanvasRenderingContext2D,
      text: string,
      cx: number,
      y: number,
      maxWidth: number,
      lineHeight: number,
      maxLines: number
    ) {
      const words = text.trim().split(/\s+/).filter(Boolean);
      if (!words.length) return 0;
      const lines: string[] = [];
      let line = words[0] ?? '';

      for (let i = 1; i < words.length; i += 1) {
        const next = `${line} ${words[i]}`;
        if (ctx.measureText(next).width <= maxWidth) {
          line = next;
        } else {
          lines.push(line);
          line = words[i] ?? '';
        }
      }
      lines.push(line);

      const clipped = lines.slice(0, maxLines);
      clipped.forEach((ln, idx) => {
        ctx.fillText(ln, cx, y + idx * lineHeight);
      });
      return clipped.length * lineHeight;
    }

    const jspdfMod: any = await import('jspdf');
    const jsPDF = jspdfMod.jsPDF ?? jspdfMod.default;
    const scale = 2;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(mapSize.width * scale));
    canvas.height = Math.max(1, Math.round(mapSize.height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(scale, scale);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, mapSize.width, mapSize.height);

    ctx.fillStyle = '#d1d5db';
    for (let gx = 0; gx < mapSize.width; gx += GRID_SIZE) {
      for (let gy = 0; gy < mapSize.height; gy += GRID_SIZE) {
        ctx.fillRect(gx, gy, 1, 1);
      }
    }

    fixtures.forEach((item) => {
      const cfg = FIXTURE_LIBRARY[item.type];
      const w = item.w * fixtureScale;
      const h = item.h * fixtureScale;
      const x = item.x;
      const y = item.y;
      const label = fixtureLabel(item);

      ctx.fillStyle = cfg.fillColor;
      ctx.strokeStyle = cfg.borderColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 10);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = cfg.textColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '600 12px Arial';
      drawCenteredText(ctx, label, x + w / 2, y + h / 2 - 6, w - 12, 14, 2);
    });

    tables.forEach((t) => {
      const pos = positions[t.id] ?? { x: 0, y: 0 };
      const x = pos.x;
      const y = pos.y;
      const w = tableWidth;
      const h = tableHeight;
      const count = guestCountByTable[t.id] ?? 0;
      const inset = Math.max(3, Math.round(4 * tableScale));

      ctx.fillStyle = '#111827';
      drawHex(ctx, x, y, w, h);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      drawHex(ctx, x + inset, y + inset, w - inset * 2, h - inset * 2);
      ctx.fill();

      const cx = x + w / 2;
      let cy = y + h * 0.37;

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#111827';
      ctx.font = `700 ${Math.max(10, Math.round(13 * tableScale))}px Arial`;
      const usedNameHeight = drawCenteredText(
        ctx,
        t.name,
        cx,
        cy,
        w * 0.62,
        Math.max(11, Math.round(13 * tableScale)),
        2
      );
      cy += usedNameHeight + 3;

      if (t.note) {
        ctx.fillStyle = '#6b7280';
        ctx.font = `${Math.max(9, Math.round(10 * tableScale))}px Arial`;
        cy += drawCenteredText(ctx, t.note, cx, cy, w * 0.58, 11, 2);
      }

      ctx.fillStyle = '#6b7280';
      ctx.font = `${Math.max(9, Math.round(11 * tableScale))}px Arial`;
      ctx.fillText(`${count} / ${t.seats} lugares`, cx, y + h * 0.8);
    });

    const imgData = canvas.toDataURL('image/png');

    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const ratio = Math.min(pageW / canvas.width, pageH / canvas.height);
    const imgW = canvas.width * ratio;
    const imgH = canvas.height * ratio;
    const marginX = (pageW - imgW) / 2;
    const marginY = (pageH - imgH) / 2;

    pdf.addImage(imgData, 'PNG', marginX, marginY, imgW, imgH);
    pdf.save('mapa-de-mesas-a4.pdf');
  }

  return (
    <div
      ref={wrapperRef}
      className={`flex flex-col gap-4 ${isFullscreen ? 'bg-white p-4 h-full overflow-auto' : ''}`}
    >
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
          <div>
            <h4 className="font-semibold text-gray-800">Itens do Evento</h4>
            <p className="text-xs text-gray-500 mt-1">
              Arraste os itens para dentro do mapa. Clique no lapis para
              renomear.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={toggleFullscreen}
              className="px-3 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center gap-2"
              type="button"
              title={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
              {isFullscreen ? 'Sair tela cheia' : 'Tela cheia'}
            </button>
            <button
              onClick={resetMap}
              className="px-3 py-2 rounded-lg bg-amber-100 text-amber-800 hover:bg-amber-200 flex items-center gap-2"
              type="button"
              title="Remover todos os itens do mapa"
            >
              <RotateCcw className="w-4 h-4" />
              Resetar mapa
            </button>
            <button
              onClick={downloadPDF}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-2"
              type="button"
            >
              <Download className="w-5 h-5" />
              Baixar PDF (A4)
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {(Object.keys(FIXTURE_LIBRARY) as FixtureType[]).map((type) => {
            const config = FIXTURE_LIBRARY[type];
            const Icon = config.icon;
            return (
              <button
                key={type}
                type="button"
                draggable
                onDragStart={(e) => onLibraryDragStart(e, type)}
                title={config.label}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border ${config.borderClass} ${config.bgClass} ${config.textClass} hover:opacity-90`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-xs font-medium truncate max-w-[160px]">
                  {config.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div
        className={`w-full overflow-auto border-2 border-dashed border-gray-300 rounded-xl bg-gray-50/60 ${isFullscreen ? 'h-[calc(100vh-170px)]' : ''}`}
      >
        <div
          ref={mapRef}
          className="relative rounded-xl overflow-hidden"
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          onDragOver={(e) => e.preventDefault()}
          onDrop={onMapDrop}
          style={{
            width: mapSize.width,
            height: mapSize.height,
            backgroundImage: 'radial-gradient(#d1d5db 1px, transparent 1px)',
            backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
            backgroundColor: '#ffffff',
          }}
        >
          {fixtures.map((item) => {
            const config = FIXTURE_LIBRARY[item.type];
            const Icon = config.icon;
            const w = item.w * fixtureScale;
            const h = item.h * fixtureScale;
            const label = fixtureLabel(item);
            const isEditing = editingFixtureId === item.id;

            return (
              <div
                key={item.id}
                onPointerDown={(e) => onPointerDown(e, 'fixture', item.id)}
                title={label}
                className={`absolute select-none border-2 rounded-xl shadow-sm ${config.bgClass} ${config.borderClass} ${config.textClass}`}
                style={{
                  left: item.x,
                  top: item.y,
                  width: w,
                  height: h,
                  cursor:
                    dragTarget?.kind === 'fixture' && dragTarget.id === item.id
                      ? 'grabbing'
                      : 'grab',
                  zIndex:
                    dragTarget?.kind === 'fixture' && dragTarget.id === item.id
                      ? 60
                      : 20,
                }}
              >
                <div className="absolute -top-2 -right-2 flex items-center gap-1">
                  <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => startEditingFixture(item)}
                    className="w-5 h-5 rounded-full bg-white border border-gray-300 text-gray-500 hover:text-indigo-600 text-[10px] flex items-center justify-center"
                    title="Renomear item"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => void removeFixture(item.id)}
                    className="w-5 h-5 rounded-full bg-white border border-gray-300 text-gray-500 hover:text-red-500 text-[10px]"
                    title="Remover item"
                  >
                    x
                  </button>
                </div>

                <div className="w-full h-full flex items-center justify-center gap-2 px-2">
                  <Icon className="w-4 h-4 shrink-0" />
                  {isEditing ? (
                    <div
                      className="flex items-center gap-1 w-full"
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      <input
                        value={editingFixtureLabel}
                        onChange={(e) => setEditingFixtureLabel(e.target.value)}
                        onBlur={() => void commitEditingFixture()}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            void commitEditingFixture();
                          }
                          if (e.key === 'Escape') {
                            e.preventDefault();
                            setEditingFixtureId(null);
                            setEditingFixtureLabel('');
                          }
                        }}
                        autoFocus
                        className="w-full h-7 px-2 rounded border border-gray-300 bg-white text-xs text-gray-700"
                      />
                      <button
                        type="button"
                        onClick={() => void commitEditingFixture()}
                        className="w-6 h-6 rounded bg-white border border-gray-300 text-emerald-700 flex items-center justify-center"
                        title="Salvar nome"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs font-semibold truncate">{label}</span>
                  )}
                </div>
              </div>
            );
          })}

          {tables.map((t) => {
            const pos = positions[t.id] ?? { x: 0, y: 0 };
            const count = guestCountByTable[t.id] ?? 0;

            return (
              <div
                key={t.id}
                onPointerDown={(e) => onPointerDown(e, 'table', t.id)}
                className="absolute select-none"
                style={{
                  left: pos.x,
                  top: pos.y,
                  width: tableWidth,
                  height: tableHeight,
                  cursor:
                    dragTarget?.kind === 'table' && dragTarget.id === t.id
                      ? 'grabbing'
                      : 'grab',
                  zIndex:
                    dragTarget?.kind === 'table' && dragTarget.id === t.id
                      ? 70
                      : 30,
                }}
              >
                <div
                  className="absolute inset-0 bg-black"
                  style={{
                    clipPath:
                      'polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%)',
                  }}
                />
                <div
                  className="absolute bg-white flex flex-col items-center justify-center text-center px-2"
                  style={{
                    inset: Math.max(3, Math.round(4 * tableScale)),
                    clipPath:
                      'polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%)',
                  }}
                >
                  <div
                    className="font-bold text-gray-900 truncate max-w-full"
                    style={{
                      fontSize: `${Math.max(10, Math.round(13 * tableScale))}px`,
                    }}
                    title={t.name}
                  >
                    {t.name}
                  </div>

                  {t.note ? (
                    <div
                      className="leading-tight text-gray-600 overflow-hidden max-h-[42px]"
                      style={{
                        fontSize: `${Math.max(9, Math.round(11 * tableScale))}px`,
                      }}
                      title={t.note}
                    >
                      {t.note}
                    </div>
                  ) : null}

                  <div
                    className="text-gray-500 mt-1"
                    style={{
                      fontSize: `${Math.max(9, Math.round(11 * tableScale))}px`,
                    }}
                  >
                    {count} / {t.seats} lugares
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
