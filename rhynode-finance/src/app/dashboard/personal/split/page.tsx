"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Plus, Trash2, ArrowRight } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import type { Locale } from "@/lib/locale";
import { getSplitGroup, saveSplitGroup } from "./actions";

interface Member {
  id: string;
  name: string;
}
interface Expense {
  id: string;
  description: string;
  amount: number;
  paidBy: string;
}
interface Balance {
  memberId: string;
  name: string;
  paid: number;
  owes: number;
  net: number;
}
interface Settlement {
  from: string;
  to: string;
  amount: number;
}

const STORAGE_KEY = "rhynode-split-groups";

interface SavedState {
  members: Member[];
  expenses: Expense[];
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

export default function SplitPage() {
  const t = useTranslations("dashboard.split");
  const locale = useLocale() as Locale;
  const fmt = (n: number) => formatCurrency(n, "COP", locale);
  const [members, setMembers] = useState<Member[]>(() => [{ id: uid(), name: t("me") }]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [paidBy, setPaidBy] = useState("");
  const [memberName, setMemberName] = useState("");
  // `migrated` tracks whether the DB split tables exist. Until the migration is
  // applied, we keep using localStorage (zero regression).
  const migratedRef = useRef<boolean | null>(null);
  const hydratedRef = useRef(false);

  // Load: prefer DB, fall back to localStorage if not migrated or empty.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const result = await getSplitGroup();
        if (cancelled) return;
        if (result.migrated) {
          migratedRef.current = true;
          if (result.state.members.length) setMembers(result.state.members);
          if (result.state.expenses.length) setExpenses(result.state.expenses);
          // Seed localStorage as an offline cache.
          localStorage.setItem(STORAGE_KEY, JSON.stringify(result.state));
          return;
        }
        migratedRef.current = false;
      } catch {
        migratedRef.current = false;
      }
      // Fallback to localStorage.
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const state = JSON.parse(saved) as SavedState;
          if (Array.isArray(state.members) && state.members.length) setMembers(state.members);
          if (Array.isArray(state.expenses)) setExpenses(state.expenses);
        }
      } catch {
        // ignore malformed storage
      }
    }
    void load().finally(() => {
      hydratedRef.current = true;
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Effective payer defaults to the first member when the selected one is removed.
  const effectivePaidBy = members.some((m) => m.id === paidBy) ? paidBy : (members[0]?.id ?? "");

  // Persist + recompute.
  useEffect(() => {
    // Always mirror to localStorage (offline cache + pre-migration store).
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ members, expenses }));
    } catch {
      // ignore quota errors
    }
    // Persist to DB if migrated. Skip the first run before hydration to avoid
    // overwriting server state with the default seed.
    if (hydratedRef.current && migratedRef.current) {
      void saveSplitGroup({ members, expenses }).catch(() => {
        // migration may have been rolled back — silently fall back
        migratedRef.current = false;
      });
    }
    hydratedRef.current = true;

    let cancelled = false;
    async function compute() {
      if (members.length === 0) {
        setBalances([]);
        setSettlements([]);
        return;
      }
      try {
        const res = await fetch("/api/personal/split/calculate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Grupo",
            currency: "COP",
            members,
            expenses: expenses.map((e) => ({ ...e, amount: Number(e.amount) || 0 })),
          }),
        });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { balances: Balance[]; settlements: Settlement[] };
        if (!cancelled) {
          setBalances(data.balances);
          setSettlements(data.settlements);
        }
      } catch {
        // network error — keep last state
      }
    }
    void compute();
    return () => {
      cancelled = true;
    };
  }, [members, expenses]);

  function addMember() {
    const trimmed = memberName.trim();
    if (!trimmed) return;
    setMembers((prev) => [...prev, { id: uid(), name: trimmed }]);
    setMemberName("");
  }

  function removeMember(id: string) {
    setMembers((prev) => prev.filter((m) => m.id !== id));
    setExpenses((prev) => prev.filter((e) => e.paidBy !== id));
  }

  function addExpense() {
    const value = Number(amount);
    if (!name.trim() || !value || !effectivePaidBy) return;
    setExpenses((prev) => [...prev, { id: uid(), description: name.trim(), amount: value, paidBy: effectivePaidBy }]);
    setName("");
    setAmount("");
  }

  const memberNameById = Object.fromEntries(members.map((m) => [m.id, m.name]));
  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <Users className="size-6 text-primary" aria-hidden="true" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("people")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder={t("namePh")}
              value={memberName}
              onChange={(e) => setMemberName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addMember()}
              aria-label={t("nameAria")}
            />
            <Button onClick={addMember} size="sm">
              <Plus className="size-4" /> {t("add")}
            </Button>
          </div>
          <ul className="flex flex-wrap gap-2">
            {members.map((m) => (
              <li
                key={m.id}
                className="flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-sm"
              >
                {m.name}
                {members.length > 1 && (
                  <button
                    onClick={() => removeMember(m.id)}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label={t("removeAria", { name: m.name })}
                  >
                    <Trash2 className="size-3" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("addExpense")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-[1fr_140px_1fr_auto]">
            <input
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder={t("descPh")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-label={t("descAria")}
            />
            <input
              className="rounded-md border border-input bg-background px-3 py-2 text-sm tabular-nums"
              placeholder={t("amountPh")}
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              aria-label={t("amountAria")}
            />
            <select
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={effectivePaidBy}
              onChange={(e) => setPaidBy(e.target.value)}
              aria-label={t("paidByAria")}
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <Button onClick={addExpense} size="sm">
              <Plus className="size-4" />
            </Button>
          </div>

          {expenses.length > 0 && (
            <ul className="divide-y divide-border">
              {expenses.map((e) => (
                <li key={e.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="truncate">
                    {e.description}{" "}
                    <span className="text-muted-foreground">· {t("paidByPrefix", { name: memberNameById[e.paidBy] })}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="tabular-nums font-medium">{fmt(e.amount)}</span>
                    <button
                      onClick={() => setExpenses((prev) => prev.filter((x) => x.id !== e.id))}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label={t("removeExpenseAria")}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
          {expenses.length > 0 && (
            <p className="text-right text-sm text-muted-foreground">
              {t("total")} <span className="font-semibold text-foreground">{fmt(totalSpent)}</span>
            </p>
          )}
        </CardContent>
      </Card>

      {balances.length > 0 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("balances")}</CardTitle>
              <CardDescription>{t("balancesDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {balances.map((b) => (
                <div key={b.memberId} className="flex items-center justify-between text-sm">
                  <span>{b.name}</span>
                  <span
                    className={`tabular-nums font-medium ${
                      b.net > 0.01
                        ? "text-emerald-600 dark:text-emerald-400"
                        : b.net < -0.01
                          ? "text-destructive"
                          : ""
                    }`}
                  >
                    {fmt(b.net)}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          {settlements.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("settlement")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {settlements.map((s, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="font-medium">{memberNameById[s.from]}</span>
                    <ArrowRight className="size-4 text-muted-foreground" aria-hidden="true" />
                    <span className="font-medium">{memberNameById[s.to]}</span>
                    <span className="ml-auto tabular-nums">{fmt(s.amount)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}