"use client";

import { TrendingUp, Wallet, Target, PiggyBank, Landmark } from "lucide-react";
import { cn } from "@/lib/utils";

interface HealthFactor {
  name: string;
  score: number;
  icon: React.ReactNode;
}

interface HealthScoreProps {
  savingsScore: number;
  debtScore: number;
  budgetScore: number;
  goalsScore: number;
  diversificationScore: number;
}

function getGrade(score: number): { grade: string; color: string } {
  if (score >= 90) return { grade: "A", color: "text-emerald-400" };
  if (score >= 80) return { grade: "B", color: "text-green-400" };
  if (score >= 70) return { grade: "C", color: "text-yellow-400" };
  if (score >= 60) return { grade: "D", color: "text-orange-400" };
  return { grade: "F", color: "text-red-400" };
}

function getScoreColor(score: number): string {
  if (score >= 90) return "bg-emerald-400";
  if (score >= 80) return "bg-green-400";
  if (score >= 70) return "bg-yellow-400";
  if (score >= 60) return "bg-orange-400";
  return "bg-red-400";
}

export function HealthScore({
  savingsScore,
  debtScore,
  budgetScore,
  goalsScore,
  diversificationScore,
}: HealthScoreProps) {
  const overallScore = Math.round(
    (savingsScore + debtScore + budgetScore + goalsScore + diversificationScore) / 5
  );

  const { grade, color } = getGrade(overallScore);

  const factors: HealthFactor[] = [
    {
      name: "Ahorro",
      score: savingsScore,
      icon: <PiggyBank className="h-4 w-4" />,
    },
    {
      name: "Deuda",
      score: debtScore,
      icon: <Wallet className="h-4 w-4" />,
    },
    {
      name: "Presupuestos",
      score: budgetScore,
      icon: <TrendingUp className="h-4 w-4" />,
    },
    {
      name: "Metas",
      score: goalsScore,
      icon: <Target className="h-4 w-4" />,
    },
    {
      name: "Diversificación",
      score: diversificationScore,
      icon: <Landmark className="h-4 w-4" />,
    },
  ];

  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (overallScore / 100) * circumference;

  return (
    <div className="surface-elevated-2 rounded-xl border border-border p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="heading-card">Health Score</h3>
          <p className="body-small mt-1">Salud financiera general</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("text-3xl font-bold", color)}>{grade}</span>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="relative flex h-28 w-28 shrink-0 items-center justify-center">
          <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="var(--border)"
              strokeWidth="8"
            />
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className={cn("transition-all duration-1000", color)}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={cn("text-2xl font-bold", color)}>{overallScore}</span>
          </div>
        </div>

        <div className="flex-1 space-y-3">
          {factors.map((factor) => (
            <div key={factor.name} className="flex items-center gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center text-muted-foreground">
                {factor.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">{factor.name}</span>
                  <span className="text-xs text-muted-foreground">{factor.score}</span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full transition-all duration-500", getScoreColor(factor.score))}
                    style={{ width: `${factor.score}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
