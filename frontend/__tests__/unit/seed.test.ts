import { createInitialState } from '@/data/seed';

describe('createInitialState', () => {
  it('returns exactly 5 columns', () => {
    const state = createInitialState();
    expect(state.columns).toHaveLength(5);
  });

  it('has the expected column names', () => {
    const state = createInitialState();
    const names = state.columns.map((c) => c.name);
    expect(names).toEqual(['Backlog', 'To Do', 'In Progress', 'Review', 'Done']);
  });

  it('has no orphaned cardIds (every cardId exists in cards map)', () => {
    const state = createInitialState();
    for (const col of state.columns) {
      for (const cardId of col.cardIds) {
        expect(state.cards[cardId]).toBeDefined();
      }
    }
  });

  it('has no cards absent from any column', () => {
    const state = createInitialState();
    const allCardIds = state.columns.flatMap((c) => c.cardIds);
    for (const cardId of Object.keys(state.cards)) {
      expect(allCardIds).toContain(cardId);
    }
  });

  it('each column has at least 2 cards', () => {
    const state = createInitialState();
    for (const col of state.columns) {
      expect(col.cardIds.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('returns a fresh object on each call (no shared references)', () => {
    const a = createInitialState();
    const b = createInitialState();
    expect(a).not.toBe(b);
    expect(a.columns[0].cardIds[0]).not.toBe(b.columns[0].cardIds[0]);
  });
});
