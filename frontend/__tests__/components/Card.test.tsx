import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Card from '@/components/Card';
import type { Card as CardType } from '@/types/kanban';

const card: CardType = { id: 'c1', title: 'Fix the bug', details: 'Detailed description here' };
const onUpdate = jest.fn();
const onDelete = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Card', () => {
  it('renders the card title', () => {
    render(<Card card={card} columnName="To Do" onUpdate={onUpdate} onDelete={onDelete} />);
    expect(screen.getByText('Fix the bug')).toBeInTheDocument();
  });

  it('renders details preview', () => {
    render(<Card card={card} columnName="To Do" onUpdate={onUpdate} onDelete={onDelete} />);
    expect(screen.getByText('Detailed description here')).toBeInTheDocument();
  });

  it('opens CardModal when clicked', async () => {
    const user = userEvent.setup();
    render(<Card card={card} columnName="To Do" onUpdate={onUpdate} onDelete={onDelete} />);
    await user.click(screen.getByRole('button', { name: /Open card/ }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('opens CardModal when Enter is pressed', async () => {
    const user = userEvent.setup();
    render(<Card card={card} columnName="To Do" onUpdate={onUpdate} onDelete={onDelete} />);
    screen.getByRole('button', { name: /Open card/ }).focus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
