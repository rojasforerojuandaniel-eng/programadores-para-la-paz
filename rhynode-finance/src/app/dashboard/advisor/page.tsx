"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Brain, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChatMessage } from "@/components/dashboard/chat-message";
import { ChatInput } from "@/components/dashboard/chat-input";

interface UserMessage {
  id: string;
  role: "user";
  content: string;
}

interface AssistantMessage {
  id: string;
  role: "assistant";
  content: string;
  isLoading?: boolean;
}

interface ToolStartMessage {
  id: string;
  role: "tool";
  toolName: string;
}

interface ToolResultMessage {
  id: string;
  role: "tool";
  toolName: string;
  toolResult: unknown;
}

type Message = UserMessage | AssistantMessage | ToolStartMessage | ToolResultMessage;

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function AdvisorPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: generateId(),
      role: "assistant",
      content: "Hola, soy tu asesor financiero. ¿En qué puedo ayudarte hoy?",
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasStreamedContent, setHasStreamedContent] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const assistantMessageIdRef = useRef<string | null>(null);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  async function handleSend(message: string) {
    const userMessage: Message = {
      id: generateId(),
      role: "user",
      content: message,
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setHasStreamedContent(false);
    assistantMessageIdRef.current = null;

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });

      if (!response.body) {
        throw new Error("No response body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;

          const dataStr = trimmed.slice(6).trim();
          if (dataStr === "[DONE]") continue;

          try {
            const event = JSON.parse(dataStr) as unknown;
            if (!isObject(event)) continue;

            if (event.type === "content_block_delta" && isObject(event.delta) && typeof event.delta.text === "string") {
              setHasStreamedContent(true);
              const text = event.delta.text;
              setMessages((prev) => {
                const currentId = assistantMessageIdRef.current;
                if (currentId && prev.some((msg) => msg.id === currentId && msg.role === "assistant")) {
                  return prev.map((msg) =>
                    msg.id === currentId && msg.role === "assistant"
                      ? { ...msg, content: msg.content + text }
                      : msg
                  );
                }
                const newAssistant: AssistantMessage = {
                  id: generateId(),
                  role: "assistant",
                  content: text,
                };
                assistantMessageIdRef.current = newAssistant.id;
                return [...prev, newAssistant];
              });
            } else if (event.type === "tool_start" && typeof event.tool === "string") {
              setHasStreamedContent(true);
              assistantMessageIdRef.current = null;
              const toolName = event.tool;
              setMessages((prev) => [
                ...prev,
                { id: generateId(), role: "tool", toolName },
              ]);
            } else if (event.type === "tool_result" && typeof event.tool === "string") {
              setHasStreamedContent(true);
              assistantMessageIdRef.current = null;
              const toolName = event.tool;
              const toolResult = event.result;
              setMessages((prev) => [
                ...prev,
                {
                  id: generateId(),
                  role: "tool",
                  toolName,
                  toolResult,
                },
              ]);
            } else if (event.type === "error" && typeof event.message === "string") {
              setMessages((prev) => [
                ...prev,
                {
                  id: generateId(),
                  role: "assistant",
                  content: `Error: ${event.message}`,
                },
              ]);
            }
          } catch {
            // Ignorar líneas que no son JSON válido
          }
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: "assistant",
          content:
            "Lo siento, ocurrió un error al procesar tu mensaje. Inténtalo de nuevo.",
        },
      ]);
    } finally {
      setIsLoading(false);
      assistantMessageIdRef.current = null;
    }
  }

  return (
    <div className="flex h-[calc(100dvh-8rem)] flex-col rounded-xl border border-border bg-card lg:h-[calc(100dvh-7rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon" aria-label="Volver al dashboard">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
          <Brain className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h1 className="text-sm font-semibold">Rhynode AI Advisor</h1>
          <p className="text-xs text-muted-foreground">Asesor financiero inteligente</p>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 space-y-4 overflow-y-auto p-4"
        aria-label="Mensajes del chat"
      >
        {messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            role={msg.role}
            content={"content" in msg ? msg.content : ""}
            isLoading={msg.role === "assistant" ? msg.isLoading : false}
            toolName={msg.role === "tool" ? msg.toolName : undefined}
            toolResult={msg.role === "tool" && "toolResult" in msg ? msg.toolResult : undefined}
          />
        ))}
        {isLoading && !hasStreamedContent && (
          <ChatMessage
            role="assistant"
            content=""
            isLoading={true}
          />
        )}
      </div>

      {/* Input */}
      <ChatInput onSend={handleSend} isLoading={isLoading} />
    </div>
  );
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
