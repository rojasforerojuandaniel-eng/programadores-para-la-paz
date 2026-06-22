"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Brain, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChatMessage, ChatMessageSkeleton } from "@/components/dashboard/chat-message";
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

const WARMUP_DURATION = 400;

export default function AdvisorPage() {
  const t = useTranslations("dashboard.advisor");

  const [messages, setMessages] = useState<Message[]>([
    {
      id: generateId(),
      role: "assistant",
      content: t("greeting"),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasStreamedContent, setHasStreamedContent] = useState(false);
  const [isWarmup, setIsWarmup] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const assistantMessageIdRef = useRef<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsWarmup(false), WARMUP_DURATION);
    return () => clearTimeout(timer);
  }, []);

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
              const errorMessage = event.message;
              setMessages((prev) => [
                ...prev,
                {
                  id: generateId(),
                  role: "assistant",
                  content: t("serverError", { message: errorMessage }),
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
          content: t("error"),
        },
      ]);
    } finally {
      setIsLoading(false);
      assistantMessageIdRef.current = null;
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }
  }

  return (
    <div className="flex h-[calc(100dvh-10.5rem-env(safe-area-inset-bottom))] flex-col rounded-xl border border-border bg-card pb-safe lg:h-[calc(100dvh-2.5rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon" aria-label={t("back")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
          <Brain className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h1 className="text-sm font-semibold">{t("title")}</h1>
          <p className="text-xs text-muted-foreground">{t("subtitle")}</p>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 space-y-4 overflow-y-auto p-4"
        role="log"
        aria-live="polite"
        aria-label={t("chatAria")}
      >
        {isWarmup ? (
          <>
            <ChatMessageSkeleton />
            <ChatMessageSkeleton isUser />
          </>
        ) : (
          <>
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
          </>
        )}
      </div>

      {/* Input */}
      <ChatInput ref={inputRef} onSend={handleSend} isLoading={isLoading} />
    </div>
  );
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
