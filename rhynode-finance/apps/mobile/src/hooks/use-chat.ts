import { useState } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { API_URL } from '~/lib/api';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export function useChat() {
  const { getToken } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);

  const send = async (text: string) => {
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
    };
    setMessages((prev) => [...prev, userMsg]);
    setStreaming(true);

    try {
      const history = messages.slice(-10).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const token = await getToken().catch(() => null);
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const response = await fetch(`${API_URL}/api/ai/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ message: text, history }),
      });

      if (!response.ok) throw new Error(`Chat request failed: ${response.status}`);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let assistantText = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data: ')) continue;
            const data = trimmed.slice(6).trim();
            if (data === '[DONE]') continue;
            try {
              const event = JSON.parse(data);
              if (event?.delta?.text) {
                assistantText += event.delta.text;
                setMessages((prev) => {
                  const rest = prev.filter((m) => m.id !== 'assistant-current');
                  return [
                    ...rest,
                    { id: 'assistant-current', role: 'assistant', content: assistantText },
                  ];
                });
              }
            } catch {
              // ignore malformed SSE events
            }
          }
        }
      }

      setMessages((prev) => {
        const rest = prev.filter((m) => m.id !== 'assistant-current');
        return [
          ...rest,
          { id: `assistant-${Date.now()}`, role: 'assistant', content: assistantText || 'No entendí bien, intenta de otra forma.' },
        ];
      });
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: `error-${Date.now()}`, role: 'assistant', content: 'Error al contactar al asesor. Intenta más tarde.' },
      ]);
    } finally {
      setStreaming(false);
    }
  };

  return { messages, send, streaming };
}
