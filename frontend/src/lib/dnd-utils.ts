import type { BoardState } from '@/types/kanban';

export function findColumnOfCard(state: BoardState, cardId: string): string | null {
  for (const col of state.columns) {
    if (col.cardIds.includes(cardId)) return col.id;
  }
  return null;
}

export function moveCard(
  state: BoardState,
  cardId: string,
  toColumnId: string,
  toIndex: number
): BoardState {
  const fromColumnId = findColumnOfCard(state, cardId);
  if (!fromColumnId) return state;

  const columns = state.columns.map((col) => {
    if (col.id === fromColumnId && col.id === toColumnId) {
      // Same column reorder
      const ids = col.cardIds.filter((id) => id !== cardId);
      ids.splice(toIndex, 0, cardId);
      return { ...col, cardIds: ids };
    }
    if (col.id === fromColumnId) {
      return { ...col, cardIds: col.cardIds.filter((id) => id !== cardId) };
    }
    if (col.id === toColumnId) {
      const ids = [...col.cardIds];
      ids.splice(toIndex, 0, cardId);
      return { ...col, cardIds: ids };
    }
    return col;
  });

  return { ...state, columns };
}
