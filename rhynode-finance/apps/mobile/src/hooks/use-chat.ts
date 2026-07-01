import { useState } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { API_URL } from '~/lib/api';
import { chatMessageSchema, chatHistorySchema, type ChatMessage } from '~/schemas/dashboard';

export type { ChatMessage };

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
      const history = chatHistorySchema.parse(
        messages.slice(-10).map((m) => ({
          role: m.role,
          content: m.content,
        }))
      );

      const token = await getToken().catch(() => null);
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const response = await fetch(`${API_URL}/api/ai/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ message: text, history }),
      });

      if (!response.ok) throw new Error(`Chat request failed: ${response.status}`);

      const responseText = await response.text();
      let assistantText = '';

      if (responseText.includes('data: ')) {
        const lines = responseText.split('\n');
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
            // ignore malformed SSE events
          }
        }
      }

      const finalText = assistantText || responseText.trim() || 'No entendí bien, intenta de otra forma.';
      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: finalText,
      };

      setMessages((prev) => [...prev, chatMessageSchema.parse(assistantMsg)]);
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
