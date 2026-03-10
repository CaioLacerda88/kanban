import { renderHook, act } from '@testing-library/react';
import { useBoard } from '@/hooks/useBoard';

describe('useBoard', () => {
  it('initializes with 5 columns and seed cards', () => {
    const { result } = renderHook(() => useBoard());
    expect(result.current.state.columns).toHaveLength(5);
    expect(Object.keys(result.current.state.cards).length).toBeGreaterThan(0);
  });

  describe('renameColumn', () => {
    it('updates the column name', () => {
      const { result } = renderHook(() => useBoard());
      const colId = result.current.state.columns[0].id;
      act(() => {
        result.current.actions.renameColumn(colId, 'Sprint 1');
      });
      expect(result.current.state.columns[0].name).toBe('Sprint 1');
    });

    it('does not affect other columns', () => {
      const { result } = renderHook(() => useBoard());
      const col0Id = result.current.state.columns[0].id;
      const col1Name = result.current.state.columns[1].name;
      act(() => {
        result.current.actions.renameColumn(col0Id, 'New Name');
      });
      expect(result.current.state.columns[1].name).toBe(col1Name);
    });
  });

  describe('addCard', () => {
    it('adds a card to the correct column at the end', () => {
      const { result } = renderHook(() => useBoard());
      const col = result.current.state.columns[0];
      const prevLength = col.cardIds.length;
      act(() => {
        result.current.actions.addCard(col.id, { title: 'New Task', details: 'Some details' });
      });
      const updatedCol = result.current.state.columns[0];
      expect(updatedCol.cardIds).toHaveLength(prevLength + 1);
      const newCardId = updatedCol.cardIds[updatedCol.cardIds.length - 1];
      expect(result.current.state.cards[newCardId]).toMatchObject({
        title: 'New Task',
        details: 'Some details',
      });
    });
  });

  describe('updateCard', () => {
    it('updates title and details', () => {
      const { result } = renderHook(() => useBoard());
      const cardId = result.current.state.columns[0].cardIds[0];
      act(() => {
        result.current.actions.updateCard(cardId, { title: 'Updated', details: 'New details' });
      });
      expect(result.current.state.cards[cardId].title).toBe('Updated');
      expect(result.current.state.cards[cardId].details).toBe('New details');
    });

    it('partial patch does not overwrite other fields', () => {
      const { result } = renderHook(() => useBoard());
      const cardId = result.current.state.columns[0].cardIds[0];
      const originalDetails = result.current.state.cards[cardId].details;
      act(() => {
        result.current.actions.updateCard(cardId, { title: 'Changed title' });
      });
      expect(result.current.state.cards[cardId].details).toBe(originalDetails);
    });
  });

  describe('deleteCard', () => {
    it('removes card from the cards map', () => {
      const { result } = renderHook(() => useBoard());
      const cardId = result.current.state.columns[0].cardIds[0];
      act(() => {
        result.current.actions.deleteCard(cardId);
      });
      expect(result.current.state.cards[cardId]).toBeUndefined();
    });

    it('removes cardId from the column', () => {
      const { result } = renderHook(() => useBoard());
      const col = result.current.state.columns[0];
      const cardId = col.cardIds[0];
      act(() => {
        result.current.actions.deleteCard(cardId);
      });
      expect(result.current.state.columns[0].cardIds).not.toContain(cardId);
    });
  });

  describe('moveCard', () => {
    it('reorders within the same column', () => {
      const { result } = renderHook(() => useBoard());
      const col = result.current.state.columns[0];
      const [first, second] = col.cardIds;
      act(() => {
        result.current.actions.moveCard(first, col.id, 1);
      });
      expect(result.current.state.columns[0].cardIds[1]).toBe(first);
      expect(result.current.state.columns[0].cardIds[0]).toBe(second);
    });

    it('moves card to a different column', () => {
      const { result } = renderHook(() => useBoard());
      const fromCol = result.current.state.columns[0];
      const toCol = result.current.state.columns[1];
      const cardId = fromCol.cardIds[0];
      act(() => {
        result.current.actions.moveCard(cardId, toCol.id, 0);
      });
      expect(result.current.state.columns[0].cardIds).not.toContain(cardId);
      expect(result.current.state.columns[1].cardIds[0]).toBe(cardId);
    });
  });
});
