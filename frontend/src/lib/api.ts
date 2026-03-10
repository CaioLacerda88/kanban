import type { BoardState, Card, Column } from '@/types/kanban';

// ---------- API response shapes (from backend) ----------

export interface ApiCard {
  id: number;
  column_id: number;
  title: string;
  details: string | null;
  position: number;
}

export interface ApiColumn {
  id: number;
  board_id: number;
  name: string;
  position: number;
  cards: ApiCard[];
}

export interface ApiBoard {
  id: number;
  name: string;
  columns: ApiColumn[];
}

// ---------- ID helpers ----------

// Card and column IDs from the backend are plain integers (1, 2, 3...) which
// would collide in dnd-kit's drop resolution (resolveDrop checks overId against
// both the cards map and the columns list). Prefix them to keep namespaces apart.
const cardId = (n: number) => `card-${n}`;
const colId  = (n: number) => `col-${n}`;

// Strip prefixes when building API URLs / request bodies.
const cardNum = (id: string) => id.replace('card-', '');
const colNum  = (id: string) => parseInt(id.replace('col-', ''));

// ---------- Conversion ----------

/** Maps the backend ApiBoard to the frontend BoardState (int IDs → prefixed string IDs). */
export function boardFromApi(data: ApiBoard): BoardState {
  const cards: Record<string, Card> = {};
  const columns: Column[] = data.columns.map((col) => {
    const cardIds = col.cards.map((c) => {
      const id = cardId(c.id);
      cards[id] = { id, title: c.title, details: c.details ?? undefined };
      return id;
    });
    return { id: colId(col.id), name: col.name, cardIds };
  });
  return { columns, cards };
}

// ---------- Fetch helper ----------

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`API ${res.status}: ${url}`);
  return res.json();
}

const JSON_HEADERS = { 'Content-Type': 'application/json' };

// ---------- API methods ----------

export const api = {
  getBoard: () =>
    apiFetch<ApiBoard>('/api/board'),

  renameColumn: (columnId: string, name: string) =>
    apiFetch<ApiColumn>(`/api/board/columns/${colNum(columnId)}`, {
      method: 'PUT',
      headers: JSON_HEADERS,
      body: JSON.stringify({ name }),
    }),

  createCard: (columnId: string, title: string, details?: string) =>
    apiFetch<ApiCard>('/api/board/cards', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ column_id: colNum(columnId), title, details: details ?? null }),
    }),

  updateCard: (cardId: string, patch: { title?: string; details?: string }) =>
    apiFetch<ApiCard>(`/api/board/cards/${cardNum(cardId)}`, {
      method: 'PUT',
      headers: JSON_HEADERS,
      body: JSON.stringify(patch),
    }),

  deleteCard: (cardId: string) =>
    apiFetch<{ ok: boolean }>(`/api/board/cards/${cardNum(cardId)}`, { method: 'DELETE' }),

  moveCard: (cardId: string, columnId: string, position: number) =>
    apiFetch<ApiCard>(`/api/board/cards/${cardNum(cardId)}/move`, {
      method: 'PUT',
      headers: JSON_HEADERS,
      body: JSON.stringify({ column_id: colNum(columnId), position }),
    }),
};
