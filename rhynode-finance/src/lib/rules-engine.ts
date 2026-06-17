export type TransactionType = "INCOME" | "EXPENSE" | "TRANSFER" | "ADJUSTMENT";

export interface TransactionLike {
  type: TransactionType | string;
  amount: number;
  description: string;
  category?: string | null;
  categoryId?: string | null;
  projectId?: string | null;
  accountId?: string | null;
  date?: string | Date;
  tags?: string[];
}

export type RuleConditionType = "contains" | "amountGreaterThan" | "typeIs" | "categoryIs";

export interface RuleCondition {
  type: RuleConditionType;
  value: string;
}

export type RuleActionType = "setCategory" | "setProject" | "addTag" | "alert";

export interface RuleAction {
  type: RuleActionType;
  value: string;
}

export interface Rule {
  id: string;
  name: string;
  condition: RuleCondition;
  action: RuleAction;
  enabled: boolean;
}

export interface Suggestion {
  ruleId: string;
  ruleName: string;
  action: RuleAction;
}

export function generateRuleId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function evaluateCondition(transaction: TransactionLike, condition: RuleCondition): boolean {
  switch (condition.type) {
    case "contains": {
      const needle = condition.value.toLowerCase();
      const haystack = `${transaction.description} ${transaction.category ?? ""}`.toLowerCase();
      return haystack.includes(needle);
    }
    case "amountGreaterThan": {
      const threshold = Number(condition.value);
      return !Number.isNaN(threshold) && transaction.amount > threshold;
    }
    case "typeIs": {
      return transaction.type === condition.value;
    }
    case "categoryIs": {
      return transaction.category === condition.value;
    }
    default:
      return false;
  }
}

export function applyRules(transaction: TransactionLike, rules: Rule[]): Suggestion[] {
  const activeRules = rules.filter((rule) => rule.enabled);
  const suggestions: Suggestion[] = [];

  for (const rule of activeRules) {
    if (evaluateCondition(transaction, rule.condition)) {
      suggestions.push({
        ruleId: rule.id,
        ruleName: rule.name,
        action: rule.action,
      });
    }
  }

  return suggestions;
}

export function getPredefinedRules(): Rule[] {
  return [
    {
      id: generateRuleId(),
      name: "Transporte: Uber",
      condition: { type: "contains", value: "Uber" },
      action: { type: "setCategory", value: "Transporte" },
      enabled: true,
    },
    {
      id: generateRuleId(),
      name: "Alerta por gasto alto",
      condition: { type: "amountGreaterThan", value: "200000" },
      action: { type: "alert", value: "Gasto mayor a $200.000" },
      enabled: true,
    },
  ];
}
