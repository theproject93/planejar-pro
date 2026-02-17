import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Download } from 'lucide-react';

type GuestItem = {
  id: string;
  tableid?: string | null;
  table_id?: string | null; // compat
};

type TableBase = {
  id: string;
  name: string;
  seats: number;
  note?: string | null;
  posx?: number | null;
  posy?: number | null;
};

type Props<TTable extends TableBase = TableBase> = {
  eventId: string;
  tables: TTable[];
  guests: GuestItem[];
  onPositionsApplied?: (next: TTable[]) => void;

  // Encapsulamento: quem salva no DB é o pai.
  onPersistPosition: (
    tableId: string,
    x: number,
    y: number
  ) => void | Promise<void>;
};

const GRID_SIZE = 20;

function snapToGrid(v: number) {
  return Math.round(v / GRID_SIZE) * GRID_SIZE;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function getGuestTableId(g: GuestItem) {
  return g.tableid ?? g.table_id ?? null;
}

export function VisualMapTab<TTable extends TableBase = TableBase>({
  eventId: _eventId,
  tables,
  guests,
  onPositionsApplied,
  onPersistPosition,
}: Props<TTable>) {
  const mapRef = useRef<HTMLDivElement | null>(null);

  const [positions, setPositions] = useState<
    Record<string, { x: number; y: number }>
  >({});

  const [dragId, setDragId] = useState<string | null>(null);
  const dragOffsetRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });

  const saveTimeoutRef = useRef<ReturnType<typeof window.setTimeout> | null>(
    null
  );

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const initial: Record<string, { x: number; y: number }> = {};

    tables.forEach((t, index) => {
      if (typeof t.posx === 'number' && typeof t.posy === 'number') {
        initial[t.id] = { x: t.posx, y: t.posy };
        return;
      }

      const col = index % 3;
      const row = Math.floor(index / 3);
      initial[t.id] = { x: 80 + col * 240, y: 190 + row * 220 };
    });

    setPositions(initial);
  }, [tables]);

  const guestCountByTable = useMemo(() => {
    const m: Record<string, number> = {};
    for (const g of guests) {
      const tid = getGuestTableId(g);
      if (!tid) continue;
      m[tid] = (m[tid] ?? 0) + 1;
    }
    return m;
  }, [guests]);

  function persistTablePosition(tableId: string, x: number, y: number) {
    if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = window.setTimeout(async () => {
      await onPersistPosition(tableId, x, y);
    }, 250);
  }

  function onPointerDown(e: React.PointerEvent, id: string) {
    const map = mapRef.current;
    if (!map) return;

    (e.currentTarget as HTMLDivElement).setPointerCapture?.(e.pointerId);

    const rect = map.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    const cur = positions[id] ?? { x: 0, y: 0 };
    dragOffsetRef.current = { dx: px - cur.x, dy: py - cur.y };
    setDragId(id);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragId) return;

    const map = mapRef.current;
    if (!map) return;

    const rect = map.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    const nextX = px - dragOffsetRef.current.dx;
    const nextY = py - dragOffsetRef.current.dy;

    const maxX = map.clientWidth - 200;
    const maxY = map.clientHeight - 180;

    setPositions((prev) => ({
      ...prev,
      [dragId]: {
        x: clamp(nextX, 0, Math.max(0, maxX)),
        y: clamp(nextY, 0, Math.max(0, maxY)),
      },
    }));
  }

  function onPointerUp() {
    if (!dragId) return;

    const cur = positions[dragId] ?? { x: 0, y: 0 };
    const snapped = { x: snapToGrid(cur.x), y: snapToGrid(cur.y) };

    setPositions((prev) => ({ ...prev, [dragId]: snapped }));
    persistTablePosition(dragId, snapped.x, snapped.y);

    if (onPositionsApplied) {
      onPositionsApplied(
        tables.map((t) =>
          t.id === dragId
            ? ({ ...t, posx: snapped.x, posy: snapped.y } as TTable)
            : t
        )
      );
    }

    setDragId(null);
  }

  async function downloadPDF() {
    if (!mapRef.current) return;

    const html2canvasMod: any = await import('html2canvas-oklch');
    const html2canvas = html2canvasMod.default ?? html2canvasMod;

    const jspdfMod: any = await import('jspdf');
    const jsPDF = jspdfMod.jsPDF ?? jspdfMod.default;

    const canvas = await html2canvas(mapRef.current, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
    });

    const imgData = canvas.toDataURL('image/png');

    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'px',
      format: [canvas.width, canvas.height],
    });

    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
    pdf.save('mapa-de-mesas.pdf');
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <button
          onClick={downloadPDF}
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-2"
        >
          <Download className="w-5 h-5" />
          Baixar PDF
        </button>
      </div>

      <div
        ref={mapRef}
        className="relative w-full h-[800px] bg-white border-2 border-dashed border-gray-300 rounded-xl overflow-hidden"
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        style={{
          backgroundImage: 'radial-gradient(#d1d5db 1px, transparent 1px)',
          backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
        }}
      >
        <div className="absolute top-6 left-12 -translate-x-12 w-[520px] h-[92px] border-4 border-black bg-white flex items-center justify-center">
          <span className="text-5xl font-serif tracking-widest">ALTAR</span>
        </div>

        {tables.map((t) => {
          const pos = positions[t.id] ?? { x: 0, y: 0 };
          const count = guestCountByTable[t.id] ?? 0;

          return (
            <div
              key={t.id}
              onPointerDown={(e) => onPointerDown(e, t.id)}
              className="absolute select-none"
              style={{
                left: pos.x,
                top: pos.y,
                width: 180,
                height: 160,
                cursor: dragId === t.id ? 'grabbing' : 'grab',
                zIndex: dragId === t.id ? 50 : 10,
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
                className="absolute inset-[4px] bg-white flex flex-col items-center justify-center text-center px-3"
                style={{
                  clipPath:
                    'polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%)',
                }}
              >
                <div className="font-bold text-sm text-gray-900">{t.name}</div>

                {t.note ? (
                  <div className="mt-1 text-[11px] leading-tight text-gray-600 overflow-hidden max-h-[42px]">
                    {t.note}
                  </div>
                ) : null}

                <div className="mt-2 text-[11px] text-gray-500">
                  {count} / {t.seats} lugares
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
