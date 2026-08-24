import { useState, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { createApiClient } from '~/lib/api';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export function useChat() {
  const { getToken } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(async (content: string) => {
    setMessages((prev) => [...prev, { id: Date.now().toString(), role: 'user', content }]);
    setIsLoading(true);

    try {
      const token = await getToken().catch(() => null);
      const api = createApiClient(token);
      const response = await api.post<{ reply: string }>('/api/mobile/chat', {
        messages: [...messages, { role: 'user', content }],
      });

      setMessages((prev) => [...prev, { id: Date.now().toString(), role: 'assistant', content: response.reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), role: 'assistant', content: 'Lo siento, hubo un error. Intenta de nuevo.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, getToken]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return { messages, sendMessage, clearMessages, isLoading };
}
