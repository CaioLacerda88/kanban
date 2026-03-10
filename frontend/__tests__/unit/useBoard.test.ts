import { renderHook, waitFor, act } from '@testing-library/react';
import { useBoard } from '@/hooks/useBoard';
import type { ApiBoard } from '@/lib/api';

const FAKE_BOARD: ApiBoard = {
  id: 1,
  name: 'Project Board',
  columns: [
    {
      id: 1, board_id: 1, name: 'Backlog', position: 0,
      cards: [
        { id: 1, column_id: 1, title: 'Card A', details: 'Details A', position: 0 },
        { id: 2, column_id: 1, title: 'Card B', details: null, position: 1 },
        { id: 3, column_id: 1, title: 'Card C', details: null, position: 2 },
      ],
    },
    { id: 2, board_id: 1, name: 'To Do',       position: 1, cards: [] },
    { id: 3, board_id: 1, name: 'In Progress', position: 2, cards: [] },
    { id: 4, board_id: 1, name: 'Review',      position: 3, cards: [] },
    { id: 5, board_id: 1, name: 'Done',        position: 4, cards: [] },
  ],
};

function mockFetch(boardResponse: ApiBoard = FAKE_BOARD) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => boardResponse,
  });
}

beforeEach(() => { global.fetch = jest.fn(); });
afterEach(() => { jest.restoreAllMocks(); });

describe('initial load', () => {
  it('starts in loading state with empty board', () => {
    (global.fetch as jest.Mock).mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useBoard());
    expect(result.current.loading).toBe(true);
    expect(result.current.state.columns).toHaveLength(0);
  });

  it('loads 5 columns and cards from the API', async () => {
    mockFetch();
    const { result } = renderHook(() => useBoard());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.state.columns).toHaveLength(5);
    expect(Object.keys(result.current.state.cards)).toHaveLength(3);
  });

  it('converts integer IDs to strings', async () => {
    mockFetch();
    const { result } = renderHook(() => useBoard());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.state.columns[0].id).toBe('col-1');
    expect(result.current.state.columns[0].cardIds[0]).toBe('card-1');
  });

  it('sets error when API fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false });
    const { result } = renderHook(() => useBoard());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeTruthy();
  });
});

describe('renameColumn', () => {
  it('updates the column name immediately (optimistic)', async () => {
    mockFetch();
    const { result } = renderHook(() => useBoard());
    await waitFor(() => expect(result.current.loading).toBe(false));
    const colId = result.current.state.columns[0].id;
    act(() => { result.current.actions.renameColumn(colId, 'Sprint 1'); });
    expect(result.current.state.columns[0].name).toBe('Sprint 1');
  });

  it('does not affect other columns', async () => {
    mockFetch();
    const { result } = renderHook(() => useBoard());
    await waitFor(() => expect(result.current.loading).toBe(false));
    const col0Id = result.current.state.columns[0].id;
    const col1Name = result.current.state.columns[1].name;
    act(() => { result.current.actions.renameColumn(col0Id, 'New Name'); });
    expect(result.current.state.columns[1].name).toBe(col1Name);
  });
});

describe('addCard', () => {
  it('adds a card after API responds with real ID', async () => {
    const mockCard = { id: 99, column_id: 1, title: 'New Task', details: 'Details', position: 3 };
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => FAKE_BOARD })
      .mockResolvedValueOnce({ ok: true, json: async () => mockCard });
    const { result } = renderHook(() => useBoard());
    await waitFor(() => expect(result.current.loading).toBe(false));
    const col = result.current.state.columns[0];
    const prevLength = col.cardIds.length;
    act(() => { result.current.actions.addCard(col.id, { title: 'New Task', details: 'Details' }); });
    await waitFor(() => {
      expect(result.current.state.columns[0].cardIds).toHaveLength(prevLength + 1);
    });
    expect(result.current.state.cards['card-99']).toMatchObject({ title: 'New Task', details: 'Details' });
  });
});

describe('updateCard', () => {
  it('updates title and details immediately (optimistic)', async () => {
    mockFetch();
    const { result } = renderHook(() => useBoard());
    await waitFor(() => expect(result.current.loading).toBe(false));
    const cardId = result.current.state.columns[0].cardIds[0];
    act(() => { result.current.actions.updateCard(cardId, { title: 'Updated', details: 'New details' }); });
    expect(result.current.state.cards[cardId].title).toBe('Updated');
    expect(result.current.state.cards[cardId].details).toBe('New details');
  });

  it('partial patch does not overwrite other fields', async () => {
    mockFetch();
    const { result } = renderHook(() => useBoard());
    await waitFor(() => expect(result.current.loading).toBe(false));
    const cardId = result.current.state.columns[0].cardIds[0];
    const originalDetails = result.current.state.cards[cardId].details;
    act(() => { result.current.actions.updateCard(cardId, { title: 'Changed title' }); });
    expect(result.current.state.cards[cardId].details).toBe(originalDetails);
  });
});

describe('deleteCard', () => {
  it('removes card from cards map immediately (optimistic)', async () => {
    mockFetch();
    const { result } = renderHook(() => useBoard());
    await waitFor(() => expect(result.current.loading).toBe(false));
    const cardId = result.current.state.columns[0].cardIds[0];
    act(() => { result.current.actions.deleteCard(cardId); });
    expect(result.current.state.cards[cardId]).toBeUndefined();
  });

  it('removes cardId from the column', async () => {
    mockFetch();
    const { result } = renderHook(() => useBoard());
    await waitFor(() => expect(result.current.loading).toBe(false));
    const col = result.current.state.columns[0];
    const cardId = col.cardIds[0];
    act(() => { result.current.actions.deleteCard(cardId); });
    expect(result.current.state.columns[0].cardIds).not.toContain(cardId);
  });
});

describe('moveCard', () => {
  it('reorders within the same column immediately (optimistic)', async () => {
    mockFetch();
    const { result } = renderHook(() => useBoard());
    await waitFor(() => expect(result.current.loading).toBe(false));
    const col = result.current.state.columns[0];
    const [first, second] = col.cardIds;
    act(() => { result.current.actions.moveCard(first, col.id, 1); });
    expect(result.current.state.columns[0].cardIds[1]).toBe(first);
    expect(result.current.state.columns[0].cardIds[0]).toBe(second);
  });

  it('moves card to a different column', async () => {
    mockFetch();
    const { result } = renderHook(() => useBoard());
    await waitFor(() => expect(result.current.loading).toBe(false));
    const fromCol = result.current.state.columns[0];
    const toCol   = result.current.state.columns[1];
    const cardId  = fromCol.cardIds[0];
    act(() => { result.current.actions.moveCard(cardId, toCol.id, 0); });
    expect(result.current.state.columns[0].cardIds).not.toContain(cardId);
    expect(result.current.state.columns[1].cardIds[0]).toBe(cardId);
  });
});
