import { render, screen } from '@testing-library/react';
import Board from '@/components/Board';
import type { BoardState } from '@/types/kanban';
import type { BoardActions } from '@/hooks/useBoard';

const state: BoardState = {
  columns: [
    { id: 'col-1', name: 'Backlog', cardIds: ['c1'] },
    { id: 'col-2', name: 'To Do', cardIds: ['c2'] },
    { id: 'col-3', name: 'In Progress', cardIds: [] },
    { id: 'col-4', name: 'Review', cardIds: [] },
    { id: 'col-5', name: 'Done', cardIds: [] },
  ],
  cards: {
    c1: { id: 'c1', title: 'First card', details: '' },
    c2: { id: 'c2', title: 'Second card', details: 'Details here' },
  },
};

const actions: BoardActions = {
  renameColumn: jest.fn(),
  addCard: jest.fn(),
  updateCard: jest.fn(),
  deleteCard: jest.fn(),
  moveCard: jest.fn(),
};

describe('Board', () => {
  it('renders all 5 column names', () => {
    render(<Board state={state} actions={actions} />);
    expect(screen.getByText('Backlog')).toBeInTheDocument();
    expect(screen.getByText('To Do')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('Review')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();
  });

  it('renders card titles', () => {
    render(<Board state={state} actions={actions} />);
    expect(screen.getByText('First card')).toBeInTheDocument();
    expect(screen.getByText('Second card')).toBeInTheDocument();
  });

  it('renders the board header', () => {
    render(<Board state={state} actions={actions} />);
    expect(screen.getByText('Project Board')).toBeInTheDocument();
  });
});
