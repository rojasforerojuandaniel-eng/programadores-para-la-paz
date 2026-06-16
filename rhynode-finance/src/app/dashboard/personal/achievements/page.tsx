"use client";

import * as React from "react";
import {
  Trophy,
  Star,
  Zap,
  TrendingUp,
  Target,
  PiggyBank,
  Wallet,
  Calendar,
  Award,
  Shield,
  Footprints,
  Calculator,
  FileText,
  Receipt,
  Flame,
  CalendarCheck,
  ShieldCheck,
  Coins,
  BookOpen,
  Briefcase,
  CheckCircle,
  Crown,
  Lock,
  Check,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { EmptyStateCard } from "@/components/dashboard/empty-state-card";
import { cn } from "@/lib/utils";

interface UnlockedAchievement {
  id: string;
  type: string;
  name: string;
  description: string;
  icon: string | null;
  xpAwarded: number;
  unlockedAt: string;
}

interface PendingAchievement {
  type: string;
  name: string;
  description: string;
  icon: string;
  xpAwarded: number;
  category: "starter" | "consistency" | "advanced";
}

interface AchievementsResponse {
  unlocked: UnlockedAchievement[];
  pending: PendingAchievement[];
  stats: {
    total: number;
    unlocked: number;
    xpEarned: number;
  };
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Trophy,
  Star,
  Zap,
  TrendingUp,
  Target,
  PiggyBank,
  Wallet,
  Calendar,
  Award,
  Shield,
  Footprints,
  Calculator,
  FileText,
  Receipt,
  Flame,
  CalendarCheck,
  ShieldCheck,
  Coins,
  BookOpen,
  Briefcase,
  CheckCircle,
  Crown,
};

function getIcon(name: string, iconKey?: string | null) {
  if (iconKey && iconMap[iconKey]) return iconMap[iconKey];
  const key = Object.keys(iconMap).find((k) =>
    name.toLowerCase().includes(k.toLowerCase())
  );
  return iconMap[key || "Trophy"] || Trophy;
}

function AchievementIcon({
  name,
  iconKey,
  className,
}: {
  name: string;
  iconKey?: string | null;
  className?: string;
}) {
  return React.createElement(getIcon(name, iconKey), { className });
}

function CircularProgress({
  percentage,
  unlocked,
  className,
}: {
  percentage: number;
  unlocked: boolean;
  className?: string;
}) {
  const radius = 18;
  const stroke = 4;
  const normalizedRadius = radius - stroke * 0.5;
  const circumference = normalizedRadius * 2 * Math.PI;
  const offset = circumference - (Math.min(percentage, 100) / 100) * circumference;

  return (
    <div className={cn("relative flex h-11 w-11 shrink-0 items-center justify-center", className)}>
      <svg height={radius * 2} width={radius * 2} className="-rotate-90">
        <circle
          stroke="currentColor"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          className="text-muted"
        />
        <circle
          stroke="currentColor"
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={`${circumference} ${circumference}`}
          style={{
            strokeDashoffset: offset,
            transition: "stroke-dashoffset 0.8s ease-out",
          }}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          className={cn(
            "text-primary",
            unlocked && "text-emerald-500"
          )}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {unlocked ? (
          <Check className="h-4 w-4 text-emerald-500" />
        ) : (
          <Lock className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </div>
    </div>
  );
}

function UnlockCelebration() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-visible">
      {[
        { tx: "-24px", ty: "-28px", delay: "0ms", color: "bg-amber-400" },
        { tx: "24px", ty: "-26px", delay: "60ms", color: "bg-yellow-300" },
        { tx: "-18px", ty: "24px", delay: "120ms", color: "bg-emerald-400" },
        { tx: "20px", ty: "22px", delay: "180ms", color: "bg-sky-400" },
        { tx: "0px", ty: "-32px", delay: "90ms", color: "bg-primary" },
      ].map((particle, i) => (
        <span
          key={i}
          className={cn(
            "absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full animate-sparkle",
            particle.color
          )}
          style={{
            ["--tx" as string]: particle.tx,
            ["--ty" as string]: particle.ty,
            animationDelay: particle.delay,
          }}
        />
      ))}
    </div>
  );
}

function AchievementCard({
  achievement,
  unlocked,
}: {
  achievement: UnlockedAchievement | PendingAchievement;
  unlocked: boolean;
}) {
  return (
    <Card
      className={cn(
        "surface-elevated-2 relative overflow-hidden rounded-xl border-border transition-all hover:shadow-md",
        unlocked
          ? "border-l-4 border-l-primary"
          : "opacity-90 grayscale-[0.15]"
      )}
    >
      {unlocked && <UnlockCelebration />}
      <CardContent className="flex flex-col gap-3 p-5">
        <div className="flex items-start justify-between">
          <div
            className={cn(
              "relative flex h-11 w-11 items-center justify-center rounded-full transition-transform",
              unlocked ? "bg-primary/10" : "bg-muted",
              unlocked && "animate-achievement-pop"
            )}
          >
            <AchievementIcon
              name={achievement.name}
              iconKey={"icon" in achievement ? achievement.icon : undefined}
              className={cn(
                "h-5 w-5",
                unlocked ? "text-primary" : "text-muted-foreground"
              )}
            />
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge variant={unlocked ? "default" : "secondary"}>
              {unlocked ? "Completado" : "Pendiente"}
            </Badge>
            <CircularProgress
              percentage={unlocked ? 100 : 0}
              unlocked={unlocked}
            />
          </div>
        </div>
        <div>
          <p
            className={cn(
              "font-semibold",
              !unlocked && "text-muted-foreground"
            )}
          >
            {achievement.name}
          </p>
          <p className="text-sm text-muted-foreground">{achievement.description}</p>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span
            className={cn(
              "flex items-center gap-1 font-medium",
              unlocked ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Zap className="h-3.5 w-3.5" />
            {achievement.xpAwarded} XP
          </span>
          {unlocked && "unlockedAt" in achievement && achievement.unlockedAt && (
            <span className="text-muted-foreground">
              {new Date(achievement.unlockedAt).toLocaleDateString("es-CO", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function AchievementGrid({
  achievements,
  empty,
}: {
  achievements: (UnlockedAchievement | PendingAchievement)[];
  empty: React.ReactNode;
}) {
  if (achievements.length === 0) return empty;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {achievements.map((achievement) => (
        <AchievementCard
          key={achievement.type}
          achievement={achievement}
          unlocked={"unlockedAt" in achievement}
        />
      ))}
    </div>
  );
}

export default function AchievementsPage() {
  const [data, setData] = React.useState<AchievementsResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function fetchAchievements() {
      try {
        const res = await fetch("/api/personal/achievements");
        if (!res.ok) throw new Error("Error al cargar logros");
        const json = (await res.json()) as AchievementsResponse;
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido");
      } finally {
        setLoading(false);
      }
    }
    fetchAchievements();
  }, []);

  const { unlocked, pending, all } = React.useMemo(() => {
    const unlockedList = data?.unlocked ?? [];
    const pendingList = data?.pending ?? [];
    return {
      unlocked: unlockedList,
      pending: pendingList,
      all: [...unlockedList, ...pendingList],
    };
  }, [data]);

  const totalPossible = data?.stats.total ?? unlocked.length + pending.length;
  const totalXp = data?.stats.xpEarned ?? unlocked.reduce((s, a) => s + a.xpAwarded, 0);

  const skeleton = (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-48 animate-pulse rounded-xl bg-muted" />
      ))}
    </div>
  );

  const errorState = error && (
    <EmptyStateCard
      variant="lg"
      icon={Trophy}
      title="No se pudieron cargar los logros"
      description={error}
      hint="Revisa tu conexión e intenta de nuevo."
    />
  );

  const emptyState = (
    <EmptyStateCard
      variant="lg"
      icon={Trophy}
      title="Aún no hay logros"
      description="Completa acciones financieras para desbloquear tu primer reconocimiento."
      hint="Empieza registrando una transacción o creando un presupuesto."
    />
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="heading-section">Logros</h1>
        <p className="body-default mt-1">Desbloquea logros, gana XP y sube de nivel</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          label="Desbloqueados"
          value={`${unlocked.length} / ${totalPossible}`}
          icon={Trophy}
        />
        <KpiCard label="XP Ganada" value={`${totalXp} XP`} icon={Zap} />
        <KpiCard label="Pendientes" value={pending.length} icon={Target} />
      </div>

      <Tabs defaultValue="all">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="all" className="flex-1 sm:flex-initial">
            Todos
          </TabsTrigger>
          <TabsTrigger value="unlocked" className="flex-1 sm:flex-initial">
            Desbloqueados
          </TabsTrigger>
          <TabsTrigger value="pending" className="flex-1 sm:flex-initial">
            Pendientes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          {loading ? skeleton : error ? errorState : <AchievementGrid achievements={all} empty={emptyState} />}
        </TabsContent>

        <TabsContent value="unlocked" className="mt-4">
          {loading ? (
            skeleton
          ) : error ? (
            errorState
          ) : unlocked.length > 0 ? (
            <AchievementGrid
              achievements={unlocked}
              empty={emptyState}
            />
          ) : (
            <EmptyStateCard
              variant="lg"
              icon={Trophy}
              title="Ningún logro desbloqueado"
              description="Completa acciones financieras para ver tus reconocimientos aquí."
              hint="Cada transacción, meta o presupuesto te acerca a un nuevo logro."
            />
          )}
        </TabsContent>

        <TabsContent value="pending" className="mt-4">
          {loading ? (
            skeleton
          ) : error ? (
            errorState
          ) : pending.length > 0 ? (
            <AchievementGrid
              achievements={pending}
              empty={emptyState}
            />
          ) : (
            <EmptyStateCard
              variant="lg"
              icon={Award}
              title="¡Todos los logros completados!"
              description="Has desbloqueado cada reconocimiento disponible."
              hint="Sigue usando Rhynode para mantener tu racha y subir de nivel."
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
