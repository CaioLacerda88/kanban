import { findColumnOfCard, moveCard, resolveDrop } from '@/lib/dnd-utils';
import type { BoardState } from '@/types/kanban';

function makeState(): BoardState {
  return {
    columns: [
      { id: 'col-a', name: 'A', cardIds: ['c1', 'c2', 'c3'] },
      { id: 'col-b', name: 'B', cardIds: ['c4', 'c5'] },
      { id: 'col-c', name: 'C', cardIds: [] },
    ],
    cards: {
      c1: { id: 'c1', title: 'Card 1', details: '' },
      c2: { id: 'c2', title: 'Card 2', details: '' },
      c3: { id: 'c3', title: 'Card 3', details: '' },
      c4: { id: 'c4', title: 'Card 4', details: '' },
      c5: { id: 'c5', title: 'Card 5', details: '' },
    },
  };
}

describe('findColumnOfCard', () => {
  it('returns the correct column id', () => {
    expect(findColumnOfCard(makeState(), 'c2')).toBe('col-a');
    expect(findColumnOfCard(makeState(), 'c4')).toBe('col-b');
  });

  it('returns null for unknown card', () => {
    expect(findColumnOfCard(makeState(), 'x99')).toBeNull();
  });
});

describe('moveCard', () => {
  it('reorders within the same column', () => {
    const next = moveCard(makeState(), 'c1', 'col-a', 2);
    expect(next.columns[0].cardIds).toEqual(['c2', 'c3', 'c1']);
  });

  it('moves card from one column to another', () => {
    const next = moveCard(makeState(), 'c1', 'col-b', 0);
    expect(next.columns[0].cardIds).toEqual(['c2', 'c3']);
    expect(next.columns[1].cardIds).toEqual(['c1', 'c4', 'c5']);
  });

  it('moves card to an empty column', () => {
    const next = moveCard(makeState(), 'c2', 'col-c', 0);
    expect(next.columns[2].cardIds).toEqual(['c2']);
    expect(next.columns[0].cardIds).toEqual(['c1', 'c3']);
  });

  it('appends card when index equals column length', () => {
    const next = moveCard(makeState(), 'c1', 'col-b', 2);
    expect(next.columns[1].cardIds).toEqual(['c4', 'c5', 'c1']);
  });

  it('returns original state for unknown card', () => {
    const state = makeState();
    const next = moveCard(state, 'x99', 'col-b', 0);
    expect(next).toBe(state);
  });

  it('does not mutate original state', () => {
    const state = makeState();
    const originalIds = [...state.columns[0].cardIds];
    moveCard(state, 'c1', 'col-b', 0);
    expect(state.columns[0].cardIds).toEqual(originalIds);
  });
});

describe('resolveDrop', () => {
  it('resolves drop onto a card — returns that card position', () => {
    expect(resolveDrop(makeState(), 'c1', 'c3')).toEqual({ toColumnId: 'col-a', toIndex: 2 });
    expect(resolveDrop(makeState(), 'c1', 'c4')).toEqual({ toColumnId: 'col-b', toIndex: 0 });
  });

  it('resolves drop onto a column — returns end of column', () => {
    expect(resolveDrop(makeState(), 'c1', 'col-b')).toEqual({ toColumnId: 'col-b', toIndex: 2 });
    expect(resolveDrop(makeState(), 'c1', 'col-c')).toEqual({ toColumnId: 'col-c', toIndex: 0 });
  });

  it('returns null for unknown overId', () => {
    expect(resolveDrop(makeState(), 'c1', 'unknown')).toBeNull();
  });
});
