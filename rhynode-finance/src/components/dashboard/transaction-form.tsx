"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, ScanLine, Loader2, Zap } from "lucide-react";
import { toast } from "sonner";
import { useTranslations, useLocale } from "next-intl";
import { type Suggestion, type Rule, applyRules } from "@/lib/rules-engine";
import { trackEvent } from "@/lib/analytics";
import { executeMutation } from "@/lib/offline-queue";
import {
  CATEGORY_KEYS,
  CATEGORY_I18N_KEYS,
  normalizeCategoryToKey,
} from "@/lib/transaction-categories";
import { formatNumber } from "@/lib/format";
import type { Locale } from "@/lib/locale";

interface OcrItem {
  description: string;
  amount: number;
}

interface OcrResult {
  merchant: string;
  total: number;
  date: string;
  items: OcrItem[];
  confidence: number;
}

interface TransactionFormProps {
  onSuccess: () => void;
  onCancel?: () => void;
  /** Pre-set the transaction type so "Gasté" → EXPENSE / "Recibí" → INCOME without an extra tap. */
  defaultType?: "INCOME" | "EXPENSE" | "TRANSFER" | "ADJUSTMENT";
  /** Pre-fill from voice input (amount + description + suggested category). */
  defaultAmount?: string;
  defaultDescription?: string;
  defaultCategory?: string;
}

export function TransactionForm({
  onSuccess,
  onCancel,
  defaultType = "INCOME",
  defaultAmount = "",
  defaultDescription = "",
  defaultCategory = "",
}: TransactionFormProps) {
  const t = useTranslations("dashboard.transactions");
  const tCat = useTranslations("transactionCategories");
  const locale = useLocale() as Locale;
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiConfidence, setAiConfidence] = useState<number | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrItems, setOcrItems] = useState<OcrItem[]>([]);
  const [ocrConfidence, setOcrConfidence] = useState<number | null>(null);
  const [appliedSuggestionIds, setAppliedSuggestionIds] = useState<Set<string>>(
    new Set(),
  );
  const [rules, setRules] = useState<Rule[]>([]);
  const initialCategory = normalizeCategoryToKey(defaultCategory);

  const [form, setForm] = useState({
    type: defaultType as "INCOME" | "EXPENSE" | "TRANSFER" | "ADJUSTMENT",
    category: initialCategory,
    description: defaultDescription,
    amount: defaultAmount,
    currency: "COP",
    reference: "",
    date: "",
  });

  const resetForm = useCallback(() => {
    setForm({
      type: defaultType,
      category: initialCategory,
      description: defaultDescription,
      amount: defaultAmount,
      currency: "COP",
      reference: "",
      date: "",
    });
    setAiConfidence(null);
    setOcrItems([]);
    setOcrConfidence(null);
    setAppliedSuggestionIds(new Set());
  }, [defaultType, initialCategory, defaultDescription, defaultAmount]);

  const handleAiSuggest = useCallback(
    async (description: string, amount: number) => {
      setAiLoading(true);
      try {
        const res = await fetch("/api/ai/categorize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description, amount }),
        });
        if (res.ok) {
          const data = (await res.json()) as {
            category?: string;
            confidence?: number;
          };
          if (data.category) {
            setForm((prev) => ({
              ...prev,
              category: normalizeCategoryToKey(data.category ?? prev.category),
            }));
            setAiConfidence(data.confidence ?? null);
          }
        }
      } catch {
        // Auto-suggest should fail silently.
      } finally {
        setAiLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!form.description.trim() || !form.amount || form.category) return;
    const timeout = setTimeout(() => {
      handleAiSuggest(form.description, Number(form.amount));
    }, 700);
    return () => clearTimeout(timeout);
  }, [form.description, form.amount, form.category, handleAiSuggest]);

  useEffect(() => {
    fetch("/api/personal/rules")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: unknown) => {
        if (
          data &&
          typeof data === "object" &&
          "rules" in data &&
          Array.isArray(data.rules)
        ) {
          setRules(data.rules as Rule[]);
        }
      })
      .catch(() => null);
  }, []);

  const suggestions = useMemo(() => {
    if (!form.description.trim() || !form.amount) return [];
    const amount = Number(form.amount);
    if (Number.isNaN(amount)) return [];
    return applyRules(
      {
        type: form.type,
        amount,
        description: form.description,
        category: form.category,
      },
      rules,
    ).filter((s) => !appliedSuggestionIds.has(s.ruleId));
  }, [
    form.description,
    form.amount,
    form.type,
    form.category,
    appliedSuggestionIds,
    rules,
  ]);

  function applySuggestion(suggestion: Suggestion) {
    switch (suggestion.action.type) {
      case "setCategory":
        setForm((prev) => ({
          ...prev,
          category: normalizeCategoryToKey(suggestion.action.value),
        }));
        setAiConfidence(null);
        break;
      case "setProject":
        // Project selection is not part of this form; surface as alert only.
        toast.info(t("form.suggestionProject", { value: suggestion.action.value }));
        break;
      case "addTag":
        toast.info(t("form.suggestionTag", { value: suggestion.action.value }));
        break;
      case "alert":
        toast.warning(suggestion.action.value);
        break;
    }
    setAppliedSuggestionIds((prev) => new Set(prev).add(suggestion.ruleId));
  }

  function getSuggestionLabel(suggestion: Suggestion): string {
    switch (suggestion.action.type) {
      case "setCategory": {
        const key = normalizeCategoryToKey(suggestion.action.value);
        const label = tCat(CATEGORY_I18N_KEYS[key]);
        return t("form.suggestionLabelCategory", { value: label });
      }
      case "setProject":
        return t("form.suggestionLabelProject", { value: suggestion.action.value });
      case "addTag":
        return t("form.suggestionLabelTag", { value: suggestion.action.value });
      case "alert":
        return suggestion.action.value;
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.description.trim() || !form.amount) return;
    setLoading(true);
    try {
      await executeMutation(
        "/api/transactions",
        "POST",
        {
          ...form,
          amount: Number(form.amount),
          category: normalizeCategoryToKey(form.category),
        },
        {
          onSuccess: () => {
            trackEvent("transaction_created", {
              type: form.type,
              currency: form.currency,
              category: form.category || "none",
              hasReference: Boolean(form.reference),
            });
            toast.success(t("form.created"));
            resetForm();
            onSuccess();
          },
          onError: (err) => {
            toast.error(err.message || t("form.createError"));
          },
        },
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleAiSuggestButton() {
    if (!form.description.trim() || !form.amount) {
      toast.error(t("form.needDescriptionAmount"));
      return;
    }
    await handleAiSuggest(form.description, Number(form.amount));
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setOcrLoading(true);
    setOcrItems([]);
    setOcrConfidence(null);
    try {
      const dataUrl = await fileToBase64(file);
      const res = await fetch("/api/ai/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: dataUrl }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(err.error || t("form.ocrError"));
        return;
      }
      const data = (await res.json()) as OcrResult;

      const categoryRes = await fetch("/api/ai/categorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: data.merchant,
          amount: data.total,
        }),
      });
      let category = "";
      if (categoryRes.ok) {
        const catData = (await categoryRes.json()) as {
          category?: string;
          confidence?: number;
        };
        category = catData.category || "";
        setAiConfidence(catData.confidence ?? null);
      }

      setForm((prev) => ({
        ...prev,
        description: data.merchant || prev.description,
        amount: data.total ? String(data.total) : prev.amount,
        date: data.date ? data.date.split("T")[0] : prev.date,
        category: normalizeCategoryToKey(category),
        type: "EXPENSE",
      }));

      setOcrItems(data.items || []);
      setOcrConfidence(data.confidence);

      if (data.confidence >= 0.7) {
        toast.success(t("form.ocrSuccess"));
      } else {
        toast.warning(t("form.ocrLowConfidence"));
      }
    } catch {
      toast.error(t("form.ocrError"));
    } finally {
      setOcrLoading(false);
    }
  }

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function confidenceLabel(confidence: number) {
    if (confidence >= 0.8) return { text: t("confidence.high"), variant: "default" as const };
    if (confidence >= 0.6)
      return { text: t("confidence.medium"), variant: "secondary" as const };
    return { text: t("confidence.low"), variant: "destructive" as const };
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
      <div className="rounded-lg border border-dashed border-muted-foreground/30 p-4">
        <div className="mb-2 flex items-center gap-2">
          <ScanLine className="h-4 w-4 text-primary" aria-hidden="true" />
          <span className="text-sm font-medium">{t("form.scanReceipt")}</span>
        </div>
        <Input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          disabled={ocrLoading}
          className="cursor-pointer text-sm"
          aria-label={t("form.loadImage")}
        />
        {ocrLoading && (
          <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            {t("form.processing")}
          </div>
        )}
        {ocrConfidence !== null && !ocrLoading && (
          <div className="mt-2 flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">{t("form.ocrConfidence")}</span>
            <Badge variant={confidenceLabel(ocrConfidence).variant}>
              {confidenceLabel(ocrConfidence).text}
            </Badge>
          </div>
        )}
        {ocrItems.length > 0 &&
          ocrConfidence !== null &&
          ocrConfidence > 0.7 && (
            <div className="mt-3 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                {t("form.detectedItems")}
              </p>
              <ul className="max-h-32 overflow-auto rounded border border-muted-foreground/20 p-2" role="list">
                {ocrItems.map((item, idx) => (
                  <li
                    key={idx}
                    className="flex justify-between py-0.5 text-xs"
                  >
                    <span className="truncate">{item.description}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {formatNumber(item.amount, locale)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="tx-type">{t("form.type")}</Label>
          <Select
            value={form.type}
            onValueChange={(value) =>
              setForm({ ...form, type: value as typeof form.type })
            }
          >
            <SelectTrigger id="tx-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="INCOME">{t("types.INCOME" as never)}</SelectItem>
              <SelectItem value="EXPENSE">{t("types.EXPENSE" as never)}</SelectItem>
              <SelectItem value="TRANSFER">{t("types.TRANSFER" as never)}</SelectItem>
              <SelectItem value="ADJUSTMENT">{t("types.ADJUSTMENT" as never)}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="tx-currency">{t("form.currency")}</Label>
          <Select
            value={form.currency}
            onValueChange={(value) => setForm({ ...form, currency: value })}
          >
            <SelectTrigger id="tx-currency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="COP">COP</SelectItem>
              <SelectItem value="MXN">MXN</SelectItem>
              <SelectItem value="BRL">BRL</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="tx-desc">{t("form.descriptionRequired")}</Label>
        <Input
          id="tx-desc"
          required
          value={form.description}
          onChange={(event) =>
            setForm({ ...form, description: event.target.value })
          }
          placeholder={t("form.descriptionPlaceholder")}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="tx-amount">{t("form.amountRequired")}</Label>
          <Input
            id="tx-amount"
            type="number"
            required
            autoFocus
            min={0}
            value={form.amount}
            onChange={(event) =>
              setForm({ ...form, amount: event.target.value })
            }
            placeholder="0"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tx-date">{t("form.date")}</Label>
          <Input
            id="tx-date"
            type="date"
            value={form.date}
            onChange={(event) => setForm({ ...form, date: event.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="tx-category">{t("form.category")}</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 gap-1 px-2 text-xs text-primary"
              onClick={handleAiSuggestButton}
              disabled={aiLoading || !form.description.trim() || !form.amount}
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              {aiLoading ? t("form.aiAnalyzing") : t("form.aiSuggest")}
            </Button>
          </div>
          <Select
            value={form.category}
            onValueChange={(value) => {
              setForm({ ...form, category: normalizeCategoryToKey(value) });
              setAiConfidence(null);
            }}
          >
            <SelectTrigger id="tx-category">
              <SelectValue placeholder={t("form.categoryPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_KEYS.map((key) => (
                <SelectItem key={key} value={key}>
                  {tCat(CATEGORY_I18N_KEYS[key])}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {suggestions.length > 0 && (
            <div className="space-y-2 pt-1">
              {suggestions.map((suggestion) => (
                <div
                  key={suggestion.ruleId}
                  className="flex items-center justify-between gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-2"
                >
                  <div className="flex items-center gap-2 text-sm">
                    <Zap className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                    <span className="text-muted-foreground">
                      {t("form.ruleSuggestion")}
                    </span>
                    <span className="font-medium">
                      {getSuggestionLabel(suggestion)}
                    </span>
                  </div>
                  {suggestion.action.type === "setCategory" && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-primary"
                      onClick={() => applySuggestion(suggestion)}
                    >
                      {t("form.apply")}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
          {aiConfidence !== null && (
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs text-muted-foreground">
                {t("form.aiConfidence")}
              </span>
              <Badge variant={confidenceLabel(aiConfidence).variant}>
                {confidenceLabel(aiConfidence).text}
              </Badge>
            </div>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="tx-ref">{t("form.reference")}</Label>
          <Input
            id="tx-ref"
            value={form.reference}
            onChange={(event) =>
              setForm({ ...form, reference: event.target.value })
            }
            placeholder={t("form.referencePlaceholder")}
          />
        </div>
      </div>

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="ghost"
          className="h-10 w-full sm:w-auto"
          onClick={() => onCancel?.()}
        >
          {t("form.cancel")}
        </Button>
        <Button
          type="submit"
          disabled={loading}
          className="h-10 w-full sm:w-auto"
        >
          {loading ? t("form.saving") : t("form.save")}
        </Button>
      </div>
    </form>
  );
}
