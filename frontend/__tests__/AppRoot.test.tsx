import { render, screen, waitFor } from '@testing-library/react';
import AppRoot from '@/components/AppRoot';

beforeEach(() => {
  global.fetch = jest.fn();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('AppRoot', () => {
  it('renders nothing while checking auth', () => {
    (global.fetch as jest.Mock).mockReturnValueOnce(new Promise(() => {})); // never resolves
    const { container } = render(<AppRoot />);
    expect(container.firstChild).toBeNull();
  });

  it('shows login page when not authenticated', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false });
    render(<AppRoot />);
    await waitFor(() => expect(screen.getByLabelText('Username')).toBeInTheDocument());
  });

  it('shows kanban board when authenticated', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ username: 'user' }),
    });
    render(<AppRoot />);
    await waitFor(() => expect(screen.getByText('Project Board')).toBeInTheDocument());
  });
});
