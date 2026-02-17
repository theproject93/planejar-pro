// src/pages/event-details/types.ts

export type TableViewMode = 'list' | 'map';

export type NewTable = {
  name: string;
  seats: number;
};

export type TableBase = {
  id: string;
  name: string;
  seats: number;
  note?: string | null;
  posx?: number | null;
  posy?: number | null;
};

// Compat: alguns lugares podem ter tableid e outros table_id
export type GuestTableRef = {
  id: string;
  name: string;
  tableid?: string | null;
  table_id?: string | null;
};

export function getGuestTableId(g: GuestTableRef) {
  return g.tableid ?? g.table_id ?? null;
}
