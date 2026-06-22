"use client";

import { forwardRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useTranslations } from "next-intl";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading?: boolean;
}

export const ChatInput = forwardRef<HTMLInputElement, ChatInputProps>(
  function ChatInput({ onSend, isLoading }, ref) {
    const t = useTranslations("dashboard.ai.chat");
    const [input, setInput] = useState("");

    function handleSubmit(e: FormEvent) {
      e.preventDefault();
      if (!input.trim() || isLoading) return;
      onSend(input.trim());
      setInput("");
    }

    function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(e);
      }
    }

    return (
      <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-border p-4">
        <Input
          ref={ref}
          placeholder={t("inputPlaceholder")}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          className="flex-1"
          aria-label={t("messageAriaLabel")}
        />
        <Button
          type="submit"
          size="icon"
          disabled={isLoading || !input.trim()}
          aria-label={t("sendAriaLabel")}
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    );
  }
);
