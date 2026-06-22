"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Mic, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { CreateTransactionSheet } from "./create-transaction-sheet";
import { parseTransaction } from "@/lib/voice-parse";

interface ParsedDefaults {
  type?: "INCOME" | "EXPENSE";
  amount?: string;
  description?: string;
}

/**
 * Voice entry: tap the mic, say "me gasté 20.000 en hamburguesas", and the
 * transaction form opens pre-filled (type + amount + description) with the
 * amount focused — one tap to save. Everything runs on-device (Web Speech API
 * + local parser): the audio never leaves the browser, it's instant and free.
 */
export function VoiceAddButton() {
  const t = useTranslations("dashboard.voice");
  const locale = useLocale();
  const router = useRouter();
  const [listening, setListening] = useState(false);
  const [open, setOpen] = useState(false);
  const [voiceId, setVoiceId] = useState(0);
  const [defaults, setDefaults] = useState<ParsedDefaults>({});
  const recRef = useRef<SpeechRecognition | null>(null);

  const Ctor =
    typeof window !== "undefined"
      ? window.SpeechRecognition ?? window.webkitSpeechRecognition
      : undefined;
  const supported = Ctor !== undefined;

  function stop() {
    recRef.current?.abort();
    setListening(false);
  }

  function start() {
    if (!Ctor) {
      toast.error(t("unsupported"));
      return;
    }
    const rec = new Ctor();
    rec.lang = locale === "en" ? "en-US" : "es-CO";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      const parsed = parseTransaction(transcript);
      setDefaults({
        type: parsed.type ?? undefined,
        amount: parsed.amount != null ? String(parsed.amount) : undefined,
        description: parsed.description || undefined,
      });
      setVoiceId((n) => n + 1); // remount the sheet so the form picks up new defaults
      setOpen(true);
      if (parsed.amount == null && !parsed.description) {
        toast.info(`${t("heard")}: "${transcript}"`);
      }
    };
    rec.onerror = () => {
      setListening(false);
      toast.error(t("error"));
    };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    try {
      rec.start();
    } catch {
      setListening(false);
    }
  }

  if (!supported) return null;

  return (
    <>
      <button
        type="button"
        onClick={listening ? stop : start}
        aria-label={t("label")}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/10 text-primary transition-colors hover:bg-primary/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
      >
        {listening ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Mic className="h-4 w-4" aria-hidden="true" />
        )}
        <span className="text-sm font-semibold">
          {listening ? t("listening") : t("label")}
        </span>
      </button>
      <CreateTransactionSheet
        key={voiceId}
        onCreate={() => router.refresh()}
        open={open}
        onOpenChange={setOpen}
        defaultType={defaults.type}
        defaultAmount={defaults.amount}
        defaultDescription={defaults.description}
        trigger={<span aria-hidden="true" />}
      />
    </>
  );
}