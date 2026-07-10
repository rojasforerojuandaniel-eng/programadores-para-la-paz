"use client";

import { useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Trash2,
  Plus,
  Sparkles,
  Bell,
  Tag,
  FolderOpen,
  ListFilter,
  Loader2,
  Lightbulb,
  Pencil,
  Check,
  Eye,
  BookOpen,
} from "lucide-react";
import { useOrganizationRole } from "@/hooks/use-organization-role";
import { trackEvent } from "@/lib/analytics";
import {
  type Rule,
  type RuleConditionType,
  type RuleActionType,
  getPredefinedRules,
} from "@/lib/rules-engine";
import { type RuleSuggestion } from "@/lib/rules-suggestions";
import { toast } from "sonner";
import { EmptyStateCard } from "@/components/dashboard/empty-state-card";
import { formatCurrency } from "@/lib/format";
import type { Locale } from "@/lib/locale";

const conditionLabelKeys: Record<RuleConditionType, string> = {
  contains: "conditionsShort.contains",
  amountGreaterThan: "conditionsShort.amountGreaterThan",
  typeIs: "conditionsShort.typeIs",
  categoryIs: "conditionsShort.categoryIs",
};

const actionLabelKeys: Record<RuleActionType, string> = {
  setCategory: "actionsShort.setCategory",
  setProject: "actionsShort.setProject",
  addTag: "actionsShort.addTag",
  alert: "actionsShort.alert",
};

const actionIcons: Record<RuleActionType, typeof Plus> = {
  setCategory: ListFilter,
  setProject: FolderOpen,
  addTag: Tag,
  alert: Bell,
};

interface PreviewTransaction {
  id: string;
  description: string;
  type: string;
  amount: number;
  date: string;
}

function generateRuleId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

interface RulesClientProps {
  initialRules: Rule[];
  initialSuggestions: RuleSuggestion[];
}

export default function RulesClient({
  initialRules,
  initialSuggestions,
}: RulesClientProps) {
  const t = useTranslations("dashboard.rules");
  const locale = useLocale() as Locale;
  const { canEdit } = useOrganizationRole();

  const [rules, setRules] = useState<Rule[]>(initialRules);
  const [suggestions] = useState<RuleSuggestion[]>(initialSuggestions);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    conditionType: "contains" as RuleConditionType,
    conditionValue: "",
    actionType: "setCategory" as RuleActionType,
    actionValue: "",
    enabled: true,
  });

  const [previewTransactions, setPreviewTransactions] = useState<PreviewTransaction[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);

  async function refreshRules() {
    try {
      const res = await fetch("/api/personal/rules");
      if (!res.ok) throw new Error(t("toasts.reloadError"));
      const data = (await res.json()) as { rules: Rule[] };
      setRules(data.rules ?? []);
    } catch {
      toast.error(t("toasts.reloadError"));
    }
  }

  async function runPreview() {
    if (!form.conditionValue.trim()) {
      setPreviewTransactions([]);
      return;
    }
    setPreviewLoading(true);
    try {
      const res = await fetch("/api/personal/rules/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          condition: { type: form.conditionType, value: form.conditionValue },
        }),
      });
      if (!res.ok) throw new Error(t("toasts.previewError"));
      const data = (await res.json()) as { transactions: PreviewTransaction[] };
      setPreviewTransactions(data.transactions ?? []);
    } catch {
      setPreviewTransactions([]);
      toast.error(t("toasts.previewError"));
    } finally {
      setPreviewLoading(false);
    }
  }

  function resetForm() {
    setForm({
      name: "",
      conditionType: "contains",
      conditionValue: "",
      actionType: "setCategory",
      actionValue: "",
      enabled: true,
    });
    setEditingId(null);
    setPreviewTransactions([]);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.name.trim() || !form.conditionValue.trim() || !form.actionValue.trim()) return;

    setSaving(true);
    const rule: Rule = {
      id: editingId ?? generateRuleId(),
      name: form.name.trim(),
      condition: { type: form.conditionType, value: form.conditionValue.trim() },
      action: { type: form.actionType, value: form.actionValue.trim() },
      enabled: form.enabled,
    };

    const method = editingId ? "PUT" : "POST";
    try {
      const res = await fetch("/api/personal/rules", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rule),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        throw new Error(err.error ?? t("toasts.saveError"));
      }
      await refreshRules();
      resetForm();
      if (!editingId) {
        trackEvent("rules_engine_rule_created", {
          conditionType: form.conditionType,
          actionType: form.actionType,
          enabled: form.enabled,
        });
      }
      toast.success(editingId ? t("toasts.updated") : t("toasts.created"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("toasts.saveError"));
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(rule: Rule) {
    setEditingId(rule.id);
    setForm({
      name: rule.name,
      conditionType: rule.condition.type,
      conditionValue: rule.condition.value,
      actionType: rule.action.type,
      actionValue: rule.action.value,
      enabled: rule.enabled,
    });
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/personal/rules?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(t("toasts.deleteError"));
      await refreshRules();
      if (editingId === id) resetForm();
      toast.success(t("toasts.deleted"));
    } catch {
      toast.error(t("toasts.deleteError"));
    }
  }

  async function handleToggle(rule: Rule) {
    const updated = { ...rule, enabled: !rule.enabled };
    try {
      const res = await fetch("/api/personal/rules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      if (!res.ok) throw new Error(t("toasts.toggleError"));
      await refreshRules();
    } catch {
      toast.error(t("toasts.toggleError"));
    }
  }

  function handleLoadExamples() {
    const examples = getPredefinedRules();
    const currentNames = new Set(rules.map((r) => r.name));
    const newExamples = examples.filter((r) => !currentNames.has(r.name));
    if (newExamples.length === 0) {
      toast.info(t("toasts.examplesAllLoaded"));
      return;
    }

    Promise.all(
      newExamples.map((rule) =>
        fetch("/api/personal/rules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(rule),
        })
      )
    )
      .then(() => {
        void refreshRules();
        toast.success(t("toasts.examplesLoaded"));
      })
      .catch(() => {
        toast.error(t("toasts.examplesError"));
      });
  }

  function handleApplySuggestion(suggestion: RuleSuggestion) {
    setForm({
      name: suggestion.name,
      conditionType: "contains",
      conditionValue: suggestion.conditionValue,
      actionType: "setCategory",
      actionValue: suggestion.suggestedCategoryName ?? "",
      enabled: true,
    });
    setEditingId(null);
    setPreviewTransactions([]);
  }

  const ruleSuggestions = useMemo(() => {
    return suggestions.filter((s) => !rules.some((r) => r.name === s.name));
  }, [suggestions, rules]);

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="heading-section">{t("title")}</h1>
          <p className="body-default mt-1">
            {t("subtitle")}
          </p>
        </div>
        <Button variant="outline" onClick={handleLoadExamples} className="gap-2">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          {t("actions.loadExamples")}
        </Button>
      </div>

      {canEdit && (
        <Card className="surface-elevated-2">
          <CardHeader>
            <CardTitle className="heading-card">
              {editingId ? t("form.editTitle") : t("form.newTitle")}
            </CardTitle>
            <CardDescription>
              {t("form.description")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rule-name">{t("form.nameLabel")}</Label>
                <Input
                  id="rule-name"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  placeholder={t("form.namePlaceholder")}
                  required
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="rule-condition-type">{t("form.whenLabel")}</Label>
                  <Select
                    value={form.conditionType}
                    onValueChange={(value) =>
                      setForm({ ...form, conditionType: value as RuleConditionType })
                    }
                  >
                    <SelectTrigger id="rule-condition-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contains">{t("conditions.contains")}</SelectItem>
                      <SelectItem value="amountGreaterThan">{t("conditions.amountGreaterThan")}</SelectItem>
                      <SelectItem value="typeIs">{t("conditions.typeIs")}</SelectItem>
                      <SelectItem value="categoryIs">{t("conditions.categoryIs")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rule-condition-value">{t("form.valueLabel")}</Label>
                  <Input
                    id="rule-condition-value"
                    value={form.conditionValue}
                    onChange={(event) =>
                      setForm({ ...form, conditionValue: event.target.value })
                    }
                    placeholder={
                      form.conditionType === "amountGreaterThan" ? "200000" : t("form.valueTextPlaceholder")
                    }
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="rule-action-type">{t("form.thenLabel")}</Label>
                  <Select
                    value={form.actionType}
                    onValueChange={(value) =>
                      setForm({ ...form, actionType: value as RuleActionType })
                    }
                  >
                    <SelectTrigger id="rule-action-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="setCategory">{t("actionsLong.setCategory")}</SelectItem>
                      <SelectItem value="setProject">{t("actionsLong.setProject")}</SelectItem>
                      <SelectItem value="addTag">{t("actionsLong.addTag")}</SelectItem>
                      <SelectItem value="alert">{t("actionsLong.alert")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rule-action-value">{t("form.valueLabel")}</Label>
                  <Input
                    id="rule-action-value"
                    value={form.actionValue}
                    onChange={(event) =>
                      setForm({ ...form, actionValue: event.target.value })
                    }
                    placeholder={
                      form.actionType === "alert" ? t("form.alertValuePlaceholder") : t("form.actionValuePlaceholder")
                    }
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  id="rule-enabled"
                  checked={form.enabled}
                  onCheckedChange={(checked) => setForm({ ...form, enabled: checked })}
                />
                <Label htmlFor="rule-enabled" className="cursor-pointer">
                  {t("form.enabledLabel")}
                </Label>
              </div>

              {form.conditionValue.trim() && (
                <div className="surface-elevated-1 rounded-xl p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <h4 className="text-sm font-medium">{t("preview.title")}</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={runPreview}
                      disabled={previewLoading}
                      className="gap-1"
                    >
                      {previewLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <Eye className="h-4 w-4" aria-hidden="true" />
                      )}
                      {t("actions.preview")}
                    </Button>
                  </div>
                  {previewLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      {t("preview.searching")}
                    </div>
                  ) : previewTransactions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {t("preview.empty")}
                    </p>
                  ) : (
                    <ul className="divide-y divide-border" role="list">
                      {previewTransactions.map((tx) => (
                        <li
                          key={tx.id}
                          className="flex items-center justify-between py-2 text-sm"
                        >
                          <span className="truncate pr-4">{tx.description}</span>
                          <span className="shrink-0 font-medium">
                            {formatCurrency(tx.amount, "COP", locale)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                {editingId && (
                  <Button type="button" variant="ghost" onClick={resetForm}>
                    {t("actions.cancel")}
                  </Button>
                )}
                <Button type="submit" disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
                  {editingId ? t("actions.saveChanges") : t("actions.create")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {ruleSuggestions.length > 0 && (
        <Card className="surface-elevated-2">
          <CardHeader>
            <CardTitle className="heading-card flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-warning" aria-hidden="true" />
              {t("suggestions.title")}
            </CardTitle>
            <CardDescription>
              {t("suggestions.description")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border" role="list">
              {ruleSuggestions.map((suggestion) => (
                <li
                  key={suggestion.name}
                  className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{suggestion.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {t("suggestions.frequency", { count: suggestion.frequency })}
                      {suggestion.suggestedCategoryName
                        ? t("suggestions.suggested", { category: suggestion.suggestedCategoryName })
                        : ""}
                      {t("suggestions.average", { amount: formatCurrency(suggestion.averageAmount, "COP", locale) })}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 gap-1"
                    onClick={() => handleApplySuggestion(suggestion)}
                  >
                    <Check className="h-4 w-4" />
                    {t("actions.use")}
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card className="surface-elevated-2">
        <CardHeader>
          <CardTitle className="heading-card">{t("list.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <EmptyStateCard
              variant="md"
              icon={BookOpen}
              title={t("empty.title")}
              description={t("empty.description")}
              hint={t("empty.hint")}
            />
          ) : (
            <ul className="divide-y divide-border" role="list">
              {rules.map((rule) => {
                const ActionIcon = actionIcons[rule.action.type];
                return (
                  <li
                    key={rule.id}
                    className="flex items-start justify-between gap-4 py-4"
                  >
                    <button
                      type="button"
                      onClick={canEdit ? () => handleEdit(rule) : undefined}
                      disabled={!canEdit}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="flex items-center gap-2">
                        <ActionIcon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                        <span className="font-medium">{rule.name}</span>
                        <Badge variant={rule.enabled ? "default" : "secondary"}>
                          {rule.enabled ? t("statuses.active") : t("statuses.inactive")}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {t("list.whenPrefix")}{" "}
                        <span className="font-medium text-foreground">
                          {t(conditionLabelKeys[rule.condition.type] as never)}
                        </span>{" "}
                        <span className="font-medium text-foreground">{rule.condition.value}</span>
                        , {t("list.thenPrefix")}{" "}
                        <span className="font-medium text-foreground">
                          {t(actionLabelKeys[rule.action.type] as never)}
                        </span>{" "}
                        <span className="font-medium text-foreground">{rule.action.value}</span>
                      </p>
                    </button>
                    {canEdit && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(rule)}
                          aria-label={t("aria.editRule", { name: rule.name })}
                        >
                          <Pencil className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                        </Button>
                        <Switch
                          checked={rule.enabled}
                          onCheckedChange={() => handleToggle(rule)}
                          aria-label={t("aria.toggleRule", {
                            action: rule.enabled ? t("aria.deactivate") : t("aria.activate"),
                            name: rule.name,
                          })}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(rule.id)}
                          aria-label={t("aria.deleteRule", { name: rule.name })}
                        >
                          <Trash2 className="h-4 w-4 text-danger" aria-hidden="true" />
                        </Button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}