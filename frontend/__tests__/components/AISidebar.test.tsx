import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AISidebar from '@/components/AISidebar';

const refreshBoard = jest.fn();

beforeAll(() => {
  Element.prototype.scrollIntoView = jest.fn();
});

beforeEach(() => {
  global.fetch = jest.fn();
  jest.clearAllMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('renders the toggle button', () => {
  render(<AISidebar refreshBoard={refreshBoard} />);
  expect(screen.getByRole('button', { name: /open ai chat/i })).toBeInTheDocument();
});

test('sidebar is closed by default', () => {
  render(<AISidebar refreshBoard={refreshBoard} />);
  expect(screen.queryByRole('heading', { name: /ai assistant/i })).not.toBeInTheDocument();
});

test('opens sidebar on toggle click', async () => {
  const user = userEvent.setup();
  render(<AISidebar refreshBoard={refreshBoard} />);

  await user.click(screen.getByRole('button', { name: /open ai chat/i }));

  expect(screen.getByRole('heading', { name: /ai assistant/i })).toBeInTheDocument();
});

test('closes sidebar on second toggle click', async () => {
  const user = userEvent.setup();
  render(<AISidebar refreshBoard={refreshBoard} />);

  await user.click(screen.getByRole('button', { name: /open ai chat/i }));
  await user.click(screen.getByRole('button', { name: /close ai chat/i }));

  expect(screen.queryByRole('heading', { name: /ai assistant/i })).not.toBeInTheDocument();
});

test('sends message and shows AI response', async () => {
  const user = userEvent.setup();
  (global.fetch as jest.Mock).mockResolvedValue({
    ok: true,
    json: async () => ({ message: 'The answer is 42.', board_updated: false }),
  });

  render(<AISidebar refreshBoard={refreshBoard} />);
  await user.click(screen.getByRole('button', { name: /open ai chat/i }));

  await user.type(screen.getByRole('textbox', { name: /message input/i }), 'Hello AI');
  await user.click(screen.getByRole('button', { name: /send message/i }));

  expect(await screen.findByText('The answer is 42.')).toBeInTheDocument();
});

test('calls refreshBoard when board_updated is true', async () => {
  const user = userEvent.setup();
  (global.fetch as jest.Mock).mockResolvedValue({
    ok: true,
    json: async () => ({ message: 'Card added!', board_updated: true }),
  });

  render(<AISidebar refreshBoard={refreshBoard} />);
  await user.click(screen.getByRole('button', { name: /open ai chat/i }));

  await user.type(screen.getByRole('textbox', { name: /message input/i }), 'Add a card');
  await user.click(screen.getByRole('button', { name: /send message/i }));

  await screen.findByText('Card added!');
  expect(refreshBoard).toHaveBeenCalledTimes(1);
});

test('does not call refreshBoard when board_updated is false', async () => {
  const user = userEvent.setup();
  (global.fetch as jest.Mock).mockResolvedValue({
    ok: true,
    json: async () => ({ message: 'No changes.', board_updated: false }),
  });

  render(<AISidebar refreshBoard={refreshBoard} />);
  await user.click(screen.getByRole('button', { name: /open ai chat/i }));

  await user.type(screen.getByRole('textbox', { name: /message input/i }), 'List cards');
  await user.click(screen.getByRole('button', { name: /send message/i }));

  await screen.findByText('No changes.');
  expect(refreshBoard).not.toHaveBeenCalled();
});
