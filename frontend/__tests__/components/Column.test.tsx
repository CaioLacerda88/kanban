import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Column from '@/components/Column';
import type { Card, Column as ColumnType } from '@/types/kanban';
import type { BoardActions } from '@/hooks/useBoard';

const column: ColumnType = { id: 'col-1', name: 'To Do', cardIds: ['c1', 'c2'] };
const cards: Card[] = [
  { id: 'c1', title: 'Card One', details: '' },
  { id: 'c2', title: 'Card Two', details: 'Some details' },
];

const makeActions = (): BoardActions => ({
  renameColumn: jest.fn(),
  addCard: jest.fn(),
  updateCard: jest.fn(),
  deleteCard: jest.fn(),
  moveCard: jest.fn(),
});

describe('Column', () => {
  it('renders the column name', () => {
    render(<Column column={column} cards={cards} actions={makeActions()} />);
    expect(screen.getByText('To Do')).toBeInTheDocument();
  });

  it('renders all cards', () => {
    render(<Column column={column} cards={cards} actions={makeActions()} />);
    expect(screen.getByText('Card One')).toBeInTheDocument();
    expect(screen.getByText('Card Two')).toBeInTheDocument();
  });

  it('shows card count', () => {
    render(<Column column={column} cards={cards} actions={makeActions()} />);
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('enters edit mode when header is clicked', async () => {
    const user = userEvent.setup();
    render(<Column column={column} cards={cards} actions={makeActions()} />);
    await user.click(screen.getByRole('button', { name: 'To Do' }));
    expect(screen.getByRole('textbox', { name: 'Rename column' })).toBeInTheDocument();
  });

  it('commits rename on Enter', async () => {
    const user = userEvent.setup();
    const actions = makeActions();
    render(<Column column={column} cards={cards} actions={actions} />);
    await user.click(screen.getByRole('button', { name: 'To Do' }));
    const input = screen.getByRole('textbox', { name: 'Rename column' });
    await user.clear(input);
    await user.type(input, 'Sprint 1{Enter}');
    expect(actions.renameColumn).toHaveBeenCalledWith('col-1', 'Sprint 1');
  });

  it('commits rename on blur', async () => {
    const user = userEvent.setup();
    const actions = makeActions();
    render(<Column column={column} cards={cards} actions={actions} />);
    await user.click(screen.getByRole('button', { name: 'To Do' }));
    const input = screen.getByRole('textbox', { name: 'Rename column' });
    await user.clear(input);
    await user.type(input, 'New Name');
    await user.tab();
    expect(actions.renameColumn).toHaveBeenCalledWith('col-1', 'New Name');
  });

  it('cancels rename on Escape', async () => {
    const user = userEvent.setup();
    const actions = makeActions();
    render(<Column column={column} cards={cards} actions={actions} />);
    await user.click(screen.getByRole('button', { name: 'To Do' }));
    const input = screen.getByRole('textbox', { name: 'Rename column' });
    await user.clear(input);
    await user.type(input, 'New Name');
    await user.keyboard('{Escape}');
    expect(actions.renameColumn).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'To Do' })).toBeInTheDocument();
  });

  it('opens AddCardModal when Add card is clicked', async () => {
    const user = userEvent.setup();
    render(<Column column={column} cards={cards} actions={makeActions()} />);
    await user.click(screen.getByRole('button', { name: /Add card/ }));
    expect(screen.getByRole('dialog', { name: 'Add card' })).toBeInTheDocument();
  });
});
