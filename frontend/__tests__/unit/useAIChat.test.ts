import { renderHook, act } from '@testing-library/react';
import { useAIChat } from '@/hooks/useAIChat';

const refreshBoard = jest.fn();

beforeEach(() => {
  global.fetch = jest.fn();
  jest.clearAllMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('starts with empty messages and not loading', () => {
  const { result } = renderHook(() => useAIChat());
  expect(result.current.messages).toHaveLength(0);
  expect(result.current.isLoading).toBe(false);
});

test('adds user message and AI response', async () => {
  (global.fetch as jest.Mock).mockResolvedValue({
    ok: true,
    json: async () => ({ message: 'Hello back!', board_updated: false }),
  });

  const { result } = renderHook(() => useAIChat());

  await act(async () => {
    await result.current.sendMessage('Hello', refreshBoard);
  });

  expect(result.current.messages).toHaveLength(2);
  expect(result.current.messages[0]).toEqual({ role: 'user', content: 'Hello' });
  expect(result.current.messages[1]).toEqual({ role: 'assistant', content: 'Hello back!' });
});

test('calls refreshBoard when board_updated is true', async () => {
  (global.fetch as jest.Mock).mockResolvedValue({
    ok: true,
    json: async () => ({ message: 'Done!', board_updated: true }),
  });

  const { result } = renderHook(() => useAIChat());

  await act(async () => {
    await result.current.sendMessage('Add a card', refreshBoard);
  });

  expect(refreshBoard).toHaveBeenCalledTimes(1);
});

test('does not call refreshBoard when board_updated is false', async () => {
  (global.fetch as jest.Mock).mockResolvedValue({
    ok: true,
    json: async () => ({ message: 'ok', board_updated: false }),
  });

  const { result } = renderHook(() => useAIChat());

  await act(async () => {
    await result.current.sendMessage('List cards', refreshBoard);
  });

  expect(refreshBoard).not.toHaveBeenCalled();
});

test('adds error message on failed request', async () => {
  (global.fetch as jest.Mock).mockResolvedValue({ ok: false });

  const { result } = renderHook(() => useAIChat());

  await act(async () => {
    await result.current.sendMessage('Hello', refreshBoard);
  });

  expect(result.current.messages).toHaveLength(2);
  expect(result.current.messages[1].role).toBe('assistant');
  expect(result.current.messages[1].content).toMatch(/wrong/i);
});

test('sends conversation history with each message', async () => {
  (global.fetch as jest.Mock).mockResolvedValue({
    ok: true,
    json: async () => ({ message: 'First reply', board_updated: false }),
  });

  const { result } = renderHook(() => useAIChat());

  await act(async () => {
    await result.current.sendMessage('First message', refreshBoard);
  });

  // Second call — hook is re-rendered with updated messages in state
  (global.fetch as jest.Mock).mockResolvedValue({
    ok: true,
    json: async () => ({ message: 'Second reply', board_updated: false }),
  });

  await act(async () => {
    await result.current.sendMessage('Second message', refreshBoard);
  });

  const lastCallBody = JSON.parse((global.fetch as jest.Mock).mock.calls[1][1].body);
  expect(lastCallBody.history).toHaveLength(2); // user + assistant from first exchange
  expect(lastCallBody.message).toBe('Second message');
});
