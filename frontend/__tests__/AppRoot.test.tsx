import { render, screen, waitFor } from '@testing-library/react';
import AppRoot from '@/components/AppRoot';

const FAKE_BOARD = {
  id: 1, name: 'Project Board',
  columns: [
    { id: 1, board_id: 1, name: 'Backlog', position: 0, cards: [] },
    { id: 2, board_id: 1, name: 'To Do', position: 1, cards: [] },
    { id: 3, board_id: 1, name: 'In Progress', position: 2, cards: [] },
    { id: 4, board_id: 1, name: 'Review', position: 3, cards: [] },
    { id: 5, board_id: 1, name: 'Done', position: 4, cards: [] },
  ],
};

beforeEach(() => { global.fetch = jest.fn(); });
afterEach(() => { jest.restoreAllMocks(); });

describe('AppRoot', () => {
  it('renders nothing while checking auth', () => {
    (global.fetch as jest.Mock).mockReturnValueOnce(new Promise(() => {}));
    const { container } = render(<AppRoot />);
    expect(container.firstChild).toBeNull();
  });

  it('shows login page when not authenticated', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false });
    render(<AppRoot />);
    await waitFor(() => expect(screen.getByLabelText('Username')).toBeInTheDocument());
  });

  it('shows kanban board when authenticated', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ username: 'user' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => FAKE_BOARD });
    render(<AppRoot />);
    await waitFor(() => expect(screen.getByText('Project Board')).toBeInTheDocument());
  });
});
