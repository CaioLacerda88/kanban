import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AddCardModal from '@/components/AddCardModal';

const onAdd = jest.fn();
const onClose = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
});

describe('AddCardModal', () => {
  it('renders title and details inputs', () => {
    render(<AddCardModal columnName="To Do" onAdd={onAdd} onClose={onClose} />);
    expect(screen.getByLabelText('Title')).toBeInTheDocument();
    expect(screen.getByLabelText(/Details/)).toBeInTheDocument();
  });

  it('shows the column name', () => {
    render(<AddCardModal columnName="In Progress" onAdd={onAdd} onClose={onClose} />);
    expect(screen.getByText(/In Progress/)).toBeInTheDocument();
  });

  it('add button is disabled when title is empty', () => {
    render(<AddCardModal columnName="To Do" onAdd={onAdd} onClose={onClose} />);
    expect(screen.getByRole('button', { name: 'Add card' })).toBeDisabled();
  });

  it('add button is enabled when title is filled', async () => {
    const user = userEvent.setup();
    render(<AddCardModal columnName="To Do" onAdd={onAdd} onClose={onClose} />);
    await user.type(screen.getByLabelText('Title'), 'My task');
    expect(screen.getByRole('button', { name: 'Add card' })).toBeEnabled();
  });

  it('calls onAdd with title and details on submit', async () => {
    const user = userEvent.setup();
    render(<AddCardModal columnName="To Do" onAdd={onAdd} onClose={onClose} />);
    await user.type(screen.getByLabelText('Title'), 'New task');
    await user.type(screen.getByLabelText(/Details/), 'Some details');
    await user.click(screen.getByRole('button', { name: 'Add card' }));
    expect(onAdd).toHaveBeenCalledWith('New task', 'Some details');
  });

  it('calls onClose when Cancel is clicked', async () => {
    const user = userEvent.setup();
    render(<AddCardModal columnName="To Do" onAdd={onAdd} onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when Escape is pressed', async () => {
    const user = userEvent.setup();
    render(<AddCardModal columnName="To Do" onAdd={onAdd} onClose={onClose} />);
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });
});
