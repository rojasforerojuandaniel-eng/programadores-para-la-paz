"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import type { ScenarioType } from "@/lib/scenarios";
import type { Locale } from "@/lib/locale";

interface ScenarioFormData {
  name: string;
  type: ScenarioType;
  incomeAdjustment: number;
  expenseAdjustment: number;
  durationMonths: number;
}

interface ScenarioFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ScenarioFormData) => void;
  isSubmitting?: boolean;
}

const TYPE_OPTIONS: ScenarioType[] = ["optimistic", "base", "pessimistic"];

export function ScenarioForm({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting = false,
}: ScenarioFormProps) {
  const t = useTranslations("dashboard.scenarios");
  const locale = useLocale() as Locale;
  const [name, setName] = useState("");
  const [type, setType] = useState<ScenarioType>("base");
  const [incomeAdjustment, setIncomeAdjustment] = useState([0]);
  const [expenseAdjustment, setExpenseAdjustment] = useState([0]);
  const [durationMonths, setDurationMonths] = useState([12]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      name: name.trim(),
      type,
      incomeAdjustment: incomeAdjustment[0],
      expenseAdjustment: expenseAdjustment[0],
      durationMonths: durationMonths[0],
    });
  }

  function handleClose(nextOpen: boolean) {
    if (!nextOpen) {
      setName("");
      setType("base");
      setIncomeAdjustment([0]);
      setExpenseAdjustment([0]);
      setDurationMonths([12]);
    }
    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t("form.title")}</DialogTitle>
            <DialogDescription>
              {t("form.description")}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 py-4">
            <div className="grid gap-2">
              <Label htmlFor="scenario-name">{t("form.name")}</Label>
              <Input
                id="scenario-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("form.namePlaceholder")}
                maxLength={100}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="scenario-type">{t("form.type")}</Label>
              <Select value={type} onValueChange={(v) => setType(v as ScenarioType)}>
                <SelectTrigger id="scenario-type">
                  <SelectValue placeholder={t("form.typePlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {t(`types.${option}` as never)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="income-adjustment">{t("form.incomeAdjustment")}</Label>
                <span className="text-sm font-medium">
                  {incomeAdjustment[0] > 0 ? "+" : ""}
                  {incomeAdjustment[0]}%
                </span>
              </div>
              <Slider
                id="income-adjustment"
                value={incomeAdjustment}
                onValueChange={setIncomeAdjustment}
                min={-100}
                max={100}
                step={5}
                aria-label={t("form.incomeAdjustmentAria")}
              />
            </div>

            <div className="grid gap-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="expense-adjustment">{t("form.expenseAdjustment")}</Label>
                <span className="text-sm font-medium">
                  {expenseAdjustment[0] > 0 ? "+" : ""}
                  {expenseAdjustment[0]}%
                </span>
              </div>
              <Slider
                id="expense-adjustment"
                value={expenseAdjustment}
                onValueChange={setExpenseAdjustment}
                min={-100}
                max={100}
                step={5}
                aria-label={t("form.expenseAdjustmentAria")}
              />
            </div>

            <div className="grid gap-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="duration-months">{t("form.duration")}</Label>
                <span className="text-sm font-medium">
                  {t("form.months", { count: durationMonths[0] })}
                </span>
              </div>
              <Slider
                id="duration-months"
                value={durationMonths}
                onValueChange={setDurationMonths}
                min={1}
                max={60}
                step={1}
                aria-label={t("form.durationAria")}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={isSubmitting}
            >
              {t("form.cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting || !name.trim()}>
              {isSubmitting ? t("form.saving") : t("form.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
