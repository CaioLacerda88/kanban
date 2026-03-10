import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CardModal from '@/components/CardModal';
import type { Card } from '@/types/kanban';

const card: Card = { id: 'c1', title: 'Test card', details: 'Some details here' };
const onSave = jest.fn();
const onDelete = jest.fn();
const onClose = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
});

describe('CardModal', () => {
  it('renders title and details', () => {
    render(<CardModal card={card} columnName="To Do" onSave={onSave} onDelete={onDelete} onClose={onClose} />);
    expect(screen.getByDisplayValue('Test card')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Some details here')).toBeInTheDocument();
  });

  it('shows the column name', () => {
    render(<CardModal card={card} columnName="In Progress" onSave={onSave} onDelete={onDelete} onClose={onClose} />);
    expect(screen.getByText('In Progress')).toBeInTheDocument();
  });

  it('calls onSave and onClose when Save is clicked', async () => {
    const user = userEvent.setup();
    render(<CardModal card={card} columnName="To Do" onSave={onSave} onDelete={onDelete} onClose={onClose} />);
    const titleInput = screen.getByDisplayValue('Test card');
    await user.clear(titleInput);
    await user.type(titleInput, 'Updated title');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith({ title: 'Updated title', details: 'Some details here' });
    expect(onClose).toHaveBeenCalled();
  });

  it('save button is disabled when title is empty', async () => {
    const user = userEvent.setup();
    render(<CardModal card={card} columnName="To Do" onSave={onSave} onDelete={onDelete} onClose={onClose} />);
    await user.clear(screen.getByDisplayValue('Test card'));
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('shows confirmation panel when Delete card is clicked', async () => {
    const user = userEvent.setup();
    render(<CardModal card={card} columnName="To Do" onSave={onSave} onDelete={onDelete} onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: 'Delete card' }));
    expect(screen.getByText('Delete this card?')).toBeInTheDocument();
    expect(screen.getByText('This cannot be undone.')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test card')).toBeInTheDocument();
  });

  it('calls onDelete and onClose after confirming deletion', async () => {
    const user = userEvent.setup();
    render(<CardModal card={card} columnName="To Do" onSave={onSave} onDelete={onDelete} onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: 'Delete card' }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onDelete).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('does not call onDelete when Keep is clicked', async () => {
    const user = userEvent.setup();
    render(<CardModal card={card} columnName="To Do" onSave={onSave} onDelete={onDelete} onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: 'Delete card' }));
    await user.click(screen.getByRole('button', { name: 'Keep' }));
    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Delete card' })).toBeInTheDocument();
  });

  it('calls onClose when Escape is pressed outside confirming state', async () => {
    const user = userEvent.setup();
    render(<CardModal card={card} columnName="To Do" onSave={onSave} onDelete={onDelete} onClose={onClose} />);
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });

  it('dismisses confirmation panel when Escape is pressed while confirming', async () => {
    const user = userEvent.setup();
    render(<CardModal card={card} columnName="To Do" onSave={onSave} onDelete={onDelete} onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: 'Delete card' }));
    await user.keyboard('{Escape}');
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Delete card' })).toBeInTheDocument();
  });
});
