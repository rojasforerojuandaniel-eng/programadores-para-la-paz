"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Brain, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChatMessage } from "@/components/dashboard/chat-message";
import { ChatInput } from "@/components/dashboard/chat-input";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  isLoading?: boolean;
}

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
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  async function handleSend(message: string) {
    const userMessage: Message = {
      id: generateId(),
      role: "user",
      content: message,
    };

    const loadingMessage: Message = {
      id: generateId(),
      role: "assistant",
      content: "",
      isLoading: true,
    };

    setMessages((prev) => [...prev, userMessage, loadingMessage]);
    setIsLoading(true);

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
      let assistantMessage = "";
      let buffer = "";

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === loadingMessage.id
            ? { ...msg, isLoading: false, content: "" }
            : msg
        )
      );

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
            const event = JSON.parse(dataStr);
            if (event.type === "content_block_delta" && event.delta?.text) {
              assistantMessage += event.delta.text;
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === loadingMessage.id
                    ? { ...msg, content: assistantMessage }
                    : msg
                )
              );
            }
          } catch {
            // Ignorar líneas que no son JSON válido
          }
        }
      }

      // Procesar buffer restante
      if (buffer.trim().startsWith("data: ")) {
        const dataStr = buffer.trim().slice(6).trim();
        if (dataStr !== "[DONE]") {
          try {
            const event = JSON.parse(dataStr);
            if (event.type === "content_block_delta" && event.delta?.text) {
              assistantMessage += event.delta.text;
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === loadingMessage.id
                    ? { ...msg, content: assistantMessage }
                    : msg
                )
              );
            }
          } catch {
            // Ignorar
          }
        }
      }
    } catch {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === loadingMessage.id
            ? {
                ...msg,
                isLoading: false,
                content:
                  "Lo siento, ocurrió un error al procesar tu mensaje. Inténtalo de nuevo.",
              }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
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
            content={msg.content}
            isLoading={msg.isLoading}
          />
        ))}
      </div>

      {/* Input */}
      <ChatInput onSend={handleSend} isLoading={isLoading} />
    </div>
  );
}
