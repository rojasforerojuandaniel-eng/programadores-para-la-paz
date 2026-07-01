import { useState } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { API_URL } from '~/lib/api';
import { chatMessageSchema, chatHistorySchema, type ChatMessage } from '~/schemas/dashboard';

export type { ChatMessage };

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
    } catch (error) {
      console.error('Failed to parse chat SSE event', {
        data,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return assistantText.trim() || text.trim();
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
      const history = chatHistorySchema.parse(
        messages.slice(-10).map((m) => ({
          role: m.role,
          content: m.content,
        }))
      );

      const token = await getToken().catch((error) => {
        console.error('Failed to refresh auth token for chat', error);
        return null;
      });
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const response = await fetch(`${API_URL}/api/ai/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ message: text, history }),
      });

      if (!response.ok) {
        const status = response.status;
        const body = await response.text().catch(() => '');
        throw new Error(`Chat request failed: ${status}${body ? ` - ${body}` : ''}`);
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
    } catch (error) {
      console.error('Chat send failed', error);
      const message = error instanceof Error ? error.message : 'Error desconocido';
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: `Error al contactar al asesor: ${message}`,
        },
      ]);
    } finally {
      setStreaming(false);
    }
  };

  return { messages, send, streaming };
}
