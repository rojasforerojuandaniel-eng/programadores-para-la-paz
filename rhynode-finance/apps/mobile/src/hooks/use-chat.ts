import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { API_URL } from '~/lib/api';
import { chatMessageSchema, chatHistorySchema, type ChatMessage } from '~/schemas/dashboard';

export type { ChatMessage };

export type ChatErrorType = 'network' | 'server' | 'timeout' | 'auth' | 'unknown';

export interface ChatError {
  type: ChatErrorType;
  message: string;
}

const CHAT_TIMEOUT_MS = 15000;

function parseSseResponse(text: string): string {
  if (!text.includes('data: ')) return text.trim();

  let assistantText = '';
  const lines = text.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data: ')) continue;
    const data = trimmed.slice(6).trim();
    if (data === '[DONE]') continue;

    try {
      const event = JSON.parse(data);
      const delta = event?.delta?.text ?? event?.text;
      if (typeof delta === 'string') {
        assistantText += delta;
      }
    } catch {
      // Skip malformed SSE events silently.
    }
  }

  return assistantText.trim() || text.trim();
}

function classifyFetchError(error: unknown, didTimeout: boolean): ChatError {
  if (didTimeout) {
    return {
      type: 'timeout',
      message: 'El asesor tardó demasiado en responder. Intenta de nuevo.',
    };
  }

  if (error instanceof DOMException && error.name === 'AbortError') {
    // User cancellation is not surfaced as an error.
    return { type: 'unknown', message: '' };
  }

  if (error instanceof TypeError) {
    return {
      type: 'network',
      message: 'No se pudo conectar con el asesor. Revisa tu conexión.',
    };
  }

  const message = error instanceof Error ? error.message : 'Error desconocido';

  if (/network/i.test(message) || /fetch/i.test(message)) {
    return {
      type: 'network',
      message: 'No se pudo conectar con el asesor. Revisa tu conexión.',
    };
  }

  return {
    type: 'unknown',
    message: `Error inesperado: ${message}`,
  };
}

function buildServerError(response: Response, body: string): ChatError {
  if (response.status === 401 || response.status === 403) {
    return {
      type: 'auth',
      message: 'Tu sesión expiró. Vuelve a iniciar sesión.',
    };
  }

  return {
    type: 'server',
    message: `El asesor respondió con error ${response.status}${body ? `: ${body}` : ''}`,
  };
}

export function useChat() {
  const { getToken } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<ChatError | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const send = useCallback(
    async (text: string) => {
      const trimmedText = text.trim();
      if (!trimmedText || streaming) return;

      setError(null);
      setStreaming(true);

      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: trimmedText,
      };

      setMessages((prev) => [...prev, userMsg]);

      let didTimeout = false;
      const abortController = new AbortController();
      abortRef.current = abortController;

      const timeoutId = setTimeout(() => {
        didTimeout = true;
        abortController.abort();
      }, CHAT_TIMEOUT_MS);

      try {
        let token: string | null;
        try {
          token = await getToken();
        } catch {
          token = null;
        }

        if (!token) {
          setError({
            type: 'auth',
            message: 'No se pudo obtener tu sesión. Vuelve a iniciar sesión.',
          });
          return;
        }

        const history = chatHistorySchema.parse(
          [...messages.slice(-10), { role: 'user', content: trimmedText } as const].slice(-10)
        );

        const response = await fetch(`${API_URL}/api/ai/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ message: trimmedText, history }),
          signal: abortController.signal,
        });

        if (!response.ok) {
          const status = response.status;
          const body = await response.text().catch(() => '');
          setError(buildServerError(response, body));
          return;
        }

        const responseText = await response.text();
        const assistantText = parseSseResponse(responseText);
        const finalText = assistantText || 'No entendí bien, intenta de otra forma.';

        const assistantMsg: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: finalText,
        };

        setMessages((prev) => [...prev, chatMessageSchema.parse(assistantMsg)]);
      } catch (caughtError) {
        const chatError = classifyFetchError(caughtError, didTimeout);
        if (chatError.message) {
          setError(chatError);
        }
      } finally {
        clearTimeout(timeoutId);
        abortRef.current = null;
        setStreaming(false);
      }
    },
    [getToken, messages, streaming]
  );

  return {
    messages,
    send,
    cancel,
    streaming,
    error,
  };
}
