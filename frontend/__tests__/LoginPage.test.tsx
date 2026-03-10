import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from '@/components/LoginPage';

beforeEach(() => {
  global.fetch = jest.fn();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('LoginPage', () => {
  it('renders username and password fields', () => {
    render(<LoginPage onLogin={jest.fn()} />);
    expect(screen.getByLabelText('Username')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  it('renders a sign in button', () => {
    render(<LoginPage onLogin={jest.fn()} />);
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('calls onLogin with username on success', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ username: 'user' }),
    });

    const onLogin = jest.fn();
    render(<LoginPage onLogin={onLogin} />);

    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'user' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(onLogin).toHaveBeenCalledWith('user'));
  });

  it('shows error message on failed login', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false });

    render(<LoginPage onLogin={jest.fn()} />);

    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'user' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Invalid username or password')
    );
  });

  it('shows error message on network failure', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    render(<LoginPage onLogin={jest.fn()} />);

    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'user' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Could not connect to server')
    );
  });
});
