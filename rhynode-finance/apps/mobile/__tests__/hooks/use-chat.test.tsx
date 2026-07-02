jest.mock('~/lib/api', () => ({
  API_URL: 'https://test.example',
}));

jest.mock('@clerk/clerk-expo', () => ({
  useAuth: jest.fn(),
}));

import React from 'react';
import renderer from 'react-test-renderer';
import { useAuth } from '@clerk/clerk-expo';
import { useChat, type ChatError } from '~/hooks/use-chat';

const mockedUseAuth = useAuth as jest.Mock;

interface HookResult {
  messages: Array<{ id: string; role: 'user' | 'assistant'; content: string }>;
  send: (text: string) => Promise<void>;
  cancel: () => void;
  streaming: boolean;
  error: ChatError | null;
}

function renderHook<T>(useHook: () => T) {
  const result = { current: undefined as unknown as T };

  function Wrapper() {
    result.current = useHook();
    return React.createElement('View');
  }

  let tree: renderer.ReactTestRenderer;
  renderer.act(() => {
    tree = renderer.create(React.createElement(Wrapper));
  });

  return {
    result,
    rerender: () => {
      renderer.act(() => {
        tree.update(React.createElement(Wrapper));
      });
    },
    unmount: () => {
      renderer.act(() => {
        tree.unmount();
      });
    },
  };
}

async function waitFor(
  condition: () => boolean,
  options: { timeout?: number; interval?: number } = {}
): Promise<void> {
  const { timeout = 1000, interval = 10 } = options;
  const start = Date.now();

  return new Promise((resolve, reject) => {
    function check() {
      if (condition()) {
        resolve();
        return;
      }
      if (Date.now() - start > timeout) {
        reject(new Error('waitFor timeout'));
        return;
      }
      setTimeout(check, interval);
    }
    check();
  });
}

function setupToken(token: string | null | undefined) {
  mockedUseAuth.mockReturnValue({
    getToken: jest.fn().mockResolvedValue(token),
  });
}

function mockFetch(response: Partial<Response> & { ok: boolean }) {
  const fetchMock = jest.fn().mockResolvedValue(response as Response);
  global.fetch = fetchMock;
  return fetchMock;
}

describe('useChat', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupToken('test-token');
  });

  it('adds user message and streams assistant reply', async () => {
    const fetchMock = mockFetch({
      ok: true,
      status: 200,
      text: jest.fn().mockResolvedValue('data: {"text":"Hola"}\n\ndata: [DONE]'),
    });

    const { result } = renderHook(() => useChat());

    await renderer.act(async () => {
      await result.current.send('Hola');
    });

    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[0].role).toBe('user');
    expect(result.current.messages[0].content).toBe('Hola');
    expect(result.current.messages[1].role).toBe('assistant');
    expect(result.current.messages[1].content).toBe('Hola');
    expect(result.current.streaming).toBe(false);
    expect(result.current.error).toBeNull();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.message).toBe('Hola');
  });

  it('includes current user message in history', async () => {
    const fetchMock = mockFetch({
      ok: true,
      status: 200,
      text: jest.fn().mockResolvedValue('data: {"text":"Ok"}\n\n'),
    });

    const { result } = renderHook(() => useChat());

    await renderer.act(async () => {
      await result.current.send('Primero');
    });

    await renderer.act(async () => {
      await result.current.send('Segundo');
    });

    expect(result.current.messages).toHaveLength(4);

    const [, init] = fetchMock.mock.calls[1];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.history).toHaveLength(3);
    expect(body.history[0]).toEqual({ role: 'user', content: 'Primero' });
    expect(body.history[1]).toEqual({ role: 'assistant', content: 'Ok' });
    expect(body.history[2]).toEqual({ role: 'user', content: 'Segundo' });
  });

  it('cancels in-flight request and does not add an error message', async () => {
    let rejectPromise: (error: Error) => void = () => {};
    const fetchMock = jest.fn().mockImplementation(() => {
      return new Promise((_resolve, reject) => {
        rejectPromise = reject;
      });
    });
    global.fetch = fetchMock;

    const { result } = renderHook(() => useChat());

    let sendPromise: Promise<void>;
    renderer.act(() => {
      sendPromise = result.current.send('Hola');
    });

    await waitFor(() => result.current.streaming === true);

    await renderer.act(async () => {
      result.current.cancel();
      rejectPromise(new DOMException('Aborted', 'AbortError'));
      await sendPromise;
    });

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].role).toBe('user');
    expect(result.current.error).toBeNull();
  });

  it(
    'sets a timeout error when the request exceeds 15 seconds',
    async () => {
      const fetchMock = jest.fn().mockImplementation((_url: string, init?: RequestInit) => {
        return new Promise((_resolve, reject) => {
          const signal = init?.signal;
          if (signal?.aborted) {
            reject(new DOMException('Aborted', 'AbortError'));
            return;
          }
          signal?.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'));
          });
        });
      });
      global.fetch = fetchMock;

      const { result } = renderHook(() => useChat());

      await renderer.act(async () => {
        await result.current.send('Hola');
      });

      expect(result.current.error?.type).toBe('timeout');
      expect(result.current.messages).toHaveLength(1);
      expect(result.current.streaming).toBe(false);
    },
    20000
  );

  it('sets a network error and does not add it as assistant message', async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError('Network request failed'));

    const { result } = renderHook(() => useChat());

    await renderer.act(async () => {
      await result.current.send('Hola');
    });

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.error?.type).toBe('network');
    expect(result.current.streaming).toBe(false);
  });

  it('sets a server error and does not add it as assistant message', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: jest.fn().mockResolvedValue('Internal Server Error'),
    });

    const { result } = renderHook(() => useChat());

    await renderer.act(async () => {
      await result.current.send('Hola');
    });

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.error?.type).toBe('server');
    expect(result.current.error?.message).toContain('500');
    expect(result.current.streaming).toBe(false);
  });

  it('sets an auth error when token is missing', async () => {
    setupToken(null);

    const { result } = renderHook(() => useChat());

    await renderer.act(async () => {
      await result.current.send('Hola');
    });

    expect(global.fetch).not.toHaveBeenCalled();
    expect(result.current.error?.type).toBe('auth');
    expect(result.current.streaming).toBe(false);
  });

  it('clears previous error on a new send', async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError('Network request failed'));

    const { result } = renderHook(() => useChat());

    await renderer.act(async () => {
      await result.current.send('Hola');
    });

    expect(result.current.error?.type).toBe('network');

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: jest.fn().mockResolvedValue('data: {"text":"Respuesta"}\n\n'),
    });

    await renderer.act(async () => {
      await result.current.send('Otra');
    });

    expect(result.current.error).toBeNull();
    expect(result.current.messages).toHaveLength(3);
  });

  it('falls back to plain text when SSE data is empty', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: jest.fn().mockResolvedValue('Respuesta directa'),
    });

    const { result } = renderHook(() => useChat());

    await renderer.act(async () => {
      await result.current.send('Hola');
    });

    expect(result.current.messages[1].content).toBe('Respuesta directa');
  });

  it('skips malformed SSE events', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: jest.fn().mockResolvedValue(
        'data: malformed\n\ndata: {"text":"Válido"}\n\ndata: [DONE]'
      ),
    });

    const { result } = renderHook(() => useChat());

    await renderer.act(async () => {
      await result.current.send('Hola');
    });

    expect(result.current.messages[1].content).toBe('Válido');
  });

  it('does nothing when text is empty or only whitespace', async () => {
    const { result } = renderHook(() => useChat());

    await renderer.act(async () => {
      await result.current.send('   ');
    });

    expect(result.current.messages).toHaveLength(0);
    expect(result.current.streaming).toBe(false);
  });

  it('does nothing when sending while already streaming', async () => {
    global.fetch = jest.fn().mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useChat());

    renderer.act(() => {
      void result.current.send('Primero');
    });

    await waitFor(() => result.current.streaming === true);

    await renderer.act(async () => {
      await result.current.send('Segundo');
    });

    expect(result.current.messages).toHaveLength(1);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('sets auth error when getToken throws', async () => {
    mockedUseAuth.mockReturnValue({
      getToken: jest.fn().mockRejectedValue(new Error('refresh failed')),
    });

    const { result } = renderHook(() => useChat());

    await renderer.act(async () => {
      await result.current.send('Hola');
    });

    expect(global.fetch).not.toHaveBeenCalled();
    expect(result.current.error?.type).toBe('auth');
  });

  it('classifies generic network errors by message', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network fetch aborted'));

    const { result } = renderHook(() => useChat());

    await renderer.act(async () => {
      await result.current.send('Hola');
    });

    expect(result.current.error?.type).toBe('network');
  });

  it('classifies unknown generic errors', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Something weird'));

    const { result } = renderHook(() => useChat());

    await renderer.act(async () => {
      await result.current.send('Hola');
    });

    expect(result.current.error?.type).toBe('unknown');
  });

  it('sets auth error on 401 response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: jest.fn().mockResolvedValue('Unauthorized'),
    });

    const { result } = renderHook(() => useChat());

    await renderer.act(async () => {
      await result.current.send('Hola');
    });

    expect(result.current.error?.type).toBe('auth');
  });

  it('uses empty response detail when server body is empty', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 422,
      text: jest.fn().mockResolvedValue(''),
    });

    const { result } = renderHook(() => useChat());

    await renderer.act(async () => {
      await result.current.send('Hola');
    });

    expect(result.current.error?.type).toBe('server');
    expect(result.current.error?.message).toContain('422');
  });

  it('aborts the active request on unmount', async () => {
    global.fetch = jest.fn().mockImplementation(() => new Promise(() => {}));

    const { result, unmount } = renderHook(() => useChat());

    renderer.act(() => {
      void result.current.send('Hola');
    });

    await waitFor(() => result.current.streaming === true);

    renderer.act(() => {
      unmount();
    });

    expect(result.current.streaming).toBe(true);
  });
});

