"use client";

import { useEffect, useState } from "react";
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
import { Trash2, Plus, Sparkles, Bell, Tag, FolderOpen, ListFilter } from "lucide-react";
import { useOrganizationRole } from "@/hooks/use-organization-role";
import { trackEvent } from "@/lib/analytics";
import {
  type Rule,
  type RuleConditionType,
  type RuleActionType,
  getRules,
  saveRules,
  generateRuleId,
  getPredefinedRules,
} from "@/lib/rules-engine";

const conditionLabels: Record<RuleConditionType, string> = {
  contains: "contiene",
  amountGreaterThan: "monto mayor a",
  typeIs: "tipo es",
  categoryIs: "categoría es",
};

const actionLabels: Record<RuleActionType, string> = {
  setCategory: "categoría",
  setProject: "proyecto",
  addTag: "etiqueta",
  alert: "alerta",
};

const actionIcons: Record<RuleActionType, typeof Plus> = {
  setCategory: ListFilter,
  setProject: FolderOpen,
  addTag: Tag,
  alert: Bell,
};

export default function RulesPage() {
  const [rules, setRules] = useState<Rule[]>(() => getRules());
  const [editing, setEditing] = useState<Rule | null>(null);
  const { canEdit } = useOrganizationRole();

  const [form, setForm] = useState({
    name: "",
    conditionType: "contains" as RuleConditionType,
    conditionValue: "",
    actionType: "setCategory" as RuleActionType,
    actionValue: "",
    enabled: true,
  });

  useEffect(() => {
    saveRules(rules);
  }, [rules]);

  function resetForm() {
    setForm({
      name: "",
      conditionType: "contains",
      conditionValue: "",
      actionType: "setCategory",
      actionValue: "",
      enabled: true,
    });
    setEditing(null);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.name.trim() || !form.conditionValue.trim() || !form.actionValue.trim()) return;

    const rule: Rule = {
      id: editing?.id ?? generateRuleId(),
      name: form.name.trim(),
      condition: { type: form.conditionType, value: form.conditionValue.trim() },
      action: { type: form.actionType, value: form.actionValue.trim() },
      enabled: form.enabled,
    };

    setRules((prev) => {
      const next = prev.filter((r) => r.id !== rule.id);
      return [rule, ...next];
    });
    resetForm();
    if (!editing) {
      trackEvent("rules_engine_rule_created", {
        conditionType: form.conditionType,
        actionType: form.actionType,
        enabled: form.enabled,
      });
    }
  }

  function handleEdit(rule: Rule) {
    setEditing(rule);
    setForm({
      name: rule.name,
      conditionType: rule.condition.type,
      conditionValue: rule.condition.value,
      actionType: rule.action.type,
      actionValue: rule.action.value,
      enabled: rule.enabled,
    });
  }

  function handleDelete(id: string) {
    setRules((prev) => prev.filter((r) => r.id !== id));
    if (editing?.id === id) resetForm();
  }

  function handleToggle(id: string) {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    );
  }

  function handleLoadExamples() {
    setRules((prev) => {
      const names = new Set(prev.map((r) => r.name));
      const examples = getPredefinedRules().filter((r) => !names.has(r.name));
      return [...prev, ...examples];
    });
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="heading-section">Reglas automáticas</h1>
          <p className="body-default mt-1">
            Crea reglas para categorizar, etiquetar y alertar sobre tus transacciones.
          </p>
        </div>
        <Button variant="outline" onClick={handleLoadExamples} className="gap-2">
          <Sparkles className="h-4 w-4" />
          Cargar ejemplos
        </Button>
      </div>

      {canEdit && (
      <Card className="surface-elevated-2">
        <CardHeader>
          <CardTitle className="heading-card">
            {editing ? "Editar regla" : "Nueva regla"}
          </CardTitle>
          <CardDescription>
            Define una condición (cuándo) y una acción (entonces). Las reglas se ejecutan solo en
            este navegador.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rule-name">Nombre de la regla</Label>
              <Input
                id="rule-name"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="Ej. Transporte: Uber"
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="rule-condition-type">Cuando...</Label>
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
                    <SelectItem value="contains">descripción contiene</SelectItem>
                    <SelectItem value="amountGreaterThan">monto es mayor a</SelectItem>
                    <SelectItem value="typeIs">tipo es</SelectItem>
                    <SelectItem value="categoryIs">categoría es</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rule-condition-value">Valor</Label>
                <Input
                  id="rule-condition-value"
                  value={form.conditionValue}
                  onChange={(event) =>
                    setForm({ ...form, conditionValue: event.target.value })
                  }
                  placeholder={
                    form.conditionType === "amountGreaterThan" ? "200000" : "Ej. Uber"
                  }
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="rule-action-type">Entonces...</Label>
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
                    <SelectItem value="setCategory">asignar categoría</SelectItem>
                    <SelectItem value="setProject">asignar proyecto</SelectItem>
                    <SelectItem value="addTag">agregar etiqueta</SelectItem>
                    <SelectItem value="alert">mostrar alerta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rule-action-value">Valor</Label>
                <Input
                  id="rule-action-value"
                  value={form.actionValue}
                  onChange={(event) => setForm({ ...form, actionValue: event.target.value })}
                  placeholder={
                    form.actionType === "alert" ? "Mensaje de alerta" : "Ej. Transporte"
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
                Regla activa
              </Label>
            </div>

            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              {editing && (
                <Button type="button" variant="ghost" onClick={resetForm}>
                  Cancelar
                </Button>
              )}
              <Button type="submit" className="gap-2">
                <Plus className="h-4 w-4" />
                {editing ? "Guardar cambios" : "Crear regla"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      )}

      <Card className="surface-elevated-2">
        <CardHeader>
          <CardTitle className="heading-card">Tus reglas</CardTitle>
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No tienes reglas creadas. Crea una arriba o carga los ejemplos.
            </div>
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
                        <ActionIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="font-medium">{rule.name}</span>
                        <Badge variant={rule.enabled ? "default" : "secondary"}>
                          {rule.enabled ? "Activa" : "Inactiva"}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Cuando{" "}
                        <span className="font-medium text-foreground">
                          {conditionLabels[rule.condition.type]}
                        </span>{" "}
                        <span className="font-medium text-foreground">
                          {rule.condition.value}
                        </span>
                        , entonces{" "}
                        <span className="font-medium text-foreground">
                          {actionLabels[rule.action.type]}
                        </span>{" "}
                        <span className="font-medium text-foreground">
                          {rule.action.value}
                        </span>
                      </p>
                    </button>
                    {canEdit && (
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={rule.enabled}
                        onCheckedChange={() => handleToggle(rule.id)}
                        aria-label={`${rule.enabled ? "Desactivar" : "Activar"} regla ${rule.name}`}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(rule.id)}
                        aria-label={`Eliminar regla ${rule.name}`}
                      >
                        <Trash2 className="h-4 w-4 text-danger" />
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
