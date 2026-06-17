"use client";

import { useEffect, useRef, useState } from "react";
import {
  TrendingUp,
  Wallet,
  Target,
  PiggyBank,
  Landmark,
  Droplets,
  ChevronDown,
  ChevronUp,
  Lightbulb,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getGrade,
  getScoreColorClass,
  getScoreBackgroundClass,
  type HealthScoreResult,
  type HealthFactor,
  type HealthRecommendation,
} from "@/lib/health-score";

interface HealthScoreProps {
  result: HealthScoreResult;
}

const FACTOR_ICONS: Record<string, React.ReactNode> = {
  savings: <PiggyBank className="h-4 w-4" />,
  debt: <Wallet className="h-4 w-4" />,
  budget: <TrendingUp className="h-4 w-4" />,
  liquidity: <Droplets className="h-4 w-4" />,
  diversification: <Landmark className="h-4 w-4" />,
};

function useAnimatedRing(target: number, duration = 1000) {
  const [value, setValue] = useState(0);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    startTimeRef.current = null;
    let frame: number;

    const step = (timestamp: number) => {
      if (startTimeRef.current === null) startTimeRef.current = timestamp;
      const progress = Math.min((timestamp - startTimeRef.current) / duration, 1);
      setValue(Math.round(progress * target));
      if (progress < 1) {
        frame = requestAnimationFrame(step);
      }
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}

function ScoreRing({ score }: { score: number }) {
  const animatedScore = useAnimatedRing(score);
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedScore / 100) * circumference;
  const colorClass = getScoreColorClass(score);

  return (
    <div className="relative flex h-28 w-28 shrink-0 items-center justify-center" aria-hidden="true">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth="8"
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn("transition-all duration-700 ease-out", colorClass)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("text-2xl font-bold", colorClass)}>
          {animatedScore}
        </span>
        <span className={cn("text-xs font-semibold", colorClass)}>
          {getGrade(score)}
        </span>
      </div>
    </div>
  );
}

function FactorRow({ factor }: { factor: HealthFactor }) {
  const icon = FACTOR_ICONS[factor.id] ?? <Target className="h-4 w-4" />;
  const colorClass = getScoreBackgroundClass(factor.score);

  return (
    <div className="flex items-center gap-3">
      <div
        className="flex h-6 w-6 shrink-0 items-center justify-center text-muted-foreground"
        aria-hidden="true"
      >
        {icon}
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium">{factor.name}</span>
          <span className="text-xs text-muted-foreground">{factor.score}/100</span>
        </div>
        <div
          className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={factor.score}
          aria-label={`${factor.name}: ${factor.score} de 100`}
        >
          <div
            className={cn("h-full rounded-full transition-all duration-500", colorClass)}
            style={{ width: `${factor.score}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function Recommendations({ recommendations }: { recommendations: HealthRecommendation[] }) {
  if (recommendations.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Lightbulb className="h-4 w-4 text-yellow-400" />
        Recomendaciones
      </div>
      <ul className="space-y-2">
        {recommendations.map((rec) => (
          <li
            key={`${rec.factorId}-${rec.priority}`}
            className="rounded-lg border border-border bg-muted/40 p-3"
          >
            <p className="text-sm font-medium">{rec.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{rec.description}</p>
            <p className="mt-1 text-xs font-medium text-primary">{rec.action}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function HealthScore({ result }: HealthScoreProps) {
  const [expanded, setExpanded] = useState(false);
  const { overallScore, factors, recommendations } = result;

  return (
    <div className="surface-elevated-2 rounded-xl border border-border p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="heading-card">Health Score</h3>
          <p className="body-small mt-1">Salud financiera general</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("text-3xl font-bold", getScoreColorClass(overallScore))}>
            {getGrade(overallScore)}
          </span>
        </div>
      </div>

      <div className="flex flex-col items-center gap-6 sm:flex-row">
        <ScoreRing score={overallScore} />

        <div className="flex-1 space-y-3 w-full">
          {factors.map((factor) => (
            <FactorRow key={factor.id} factor={factor} />
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-controls="health-score-details"
        className="mt-5 flex w-full items-center justify-center gap-1 rounded-lg border border-border py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
      >
        {expanded ? "Ocultar detalles" : "Ver detalles y recomendaciones"}
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {expanded && (
        <div
          id="health-score-details"
          className="mt-4 space-y-4 border-t border-border pt-4"
        >
          <div className="space-y-2">
            {factors.map((factor) => (
              <p key={factor.id} className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{factor.name} ({Math.round(factor.weight * 100)}%):</span>{" "}
                {factor.description}
              </p>
            ))}
          </div>
          <Recommendations recommendations={recommendations} />
        </div>
      )}
    </div>
  );
}
