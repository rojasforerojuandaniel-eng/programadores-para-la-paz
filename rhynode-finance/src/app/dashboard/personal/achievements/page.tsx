"use client";

import { useEffect, useState } from "react";
import {
  Trophy,
  Lock,
  Zap,
  Star,
  TrendingUp,
  Target,
  PiggyBank,
  Wallet,
  Calendar,
  Award,
  Shield,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { EmptyStateCard } from "@/components/dashboard/empty-state-card";
import { ProgressBar } from "@/components/dashboard/progress-bar";

interface Achievement {
  id: string;
  name: string;
  description: string;
  xpReward: number;
  icon?: string;
  unlockedAt?: string;
  progress?: number;
  progressMax?: number;
}

interface AchievementsResponse {
  achievements: Achievement[];
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
};

function getIcon(name: string) {
  const key = Object.keys(iconMap).find((k) => name.toLowerCase().includes(k.toLowerCase()));
  return iconMap[key || "Trophy"] || Trophy;
}

export default function AchievementsPage() {
  const [data, setData] = useState<AchievementsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAchievements() {
      try {
        const res = await fetch("/api/personal/achievements");
        if (!res.ok) throw new Error("Error al cargar logros");
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido");
      } finally {
        setLoading(false);
      }
    }
    fetchAchievements();
  }, []);

  const unlocked = data?.achievements.filter((a) => a.unlockedAt) ?? [];
  const pending = data?.achievements.filter((a) => !a.unlockedAt) ?? [];
  const totalPossible = data?.achievements.length ?? 0;
  const totalXp = unlocked.reduce((s, a) => s + (a.xpReward || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="heading-section">Logros</h1>
        <p className="body-default mt-1">Desbloquea logros y gana XP</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Desbloqueados" value={`${unlocked.length} / ${totalPossible}`} icon={Trophy} />
        <KpiCard label="XP Ganada" value={`${totalXp} XP`} icon={Zap} />
        <KpiCard label="Pendientes" value={pending.length} icon={Target} />
      </div>

      <Tabs defaultValue="unlocked">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="unlocked" className="flex-1 sm:flex-initial">Desbloqueados</TabsTrigger>
          <TabsTrigger value="pending" className="flex-1 sm:flex-initial">Pendientes</TabsTrigger>
        </TabsList>

        <TabsContent value="unlocked" className="mt-4">
          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-40 animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          ) : error || totalPossible === 0 ? (
            <EmptyStateCard
              icon={Trophy}
              title="Aún no tienes logros"
              description="Empieza a usar Rhynode para desbloquearlos."
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {unlocked.map((achievement) => {
                const Icon = getIcon(achievement.name);
                return (
                  <Card
                    key={achievement.id}
                    className="surface-elevated-2 rounded-xl border-border border-l-4 border-l-primary"
                  >
                    <CardContent className="flex flex-col gap-3 p-5">
                      <div className="flex items-start justify-between">
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <Badge variant="default">Completado</Badge>
                      </div>
                      <div>
                        <p className="font-semibold">{achievement.name}</p>
                        <p className="text-sm text-muted-foreground">{achievement.description}</p>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1 font-medium text-primary">
                          <Zap className="h-3.5 w-3.5" />
                          {achievement.xpReward} XP
                        </span>
                        {achievement.unlockedAt && (
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
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="pending" className="mt-4">
          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-40 animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {pending.map((achievement) => (
                  <Card
                    key={achievement.id}
                    className="surface-elevated-2 rounded-xl border-border opacity-90"
                  >
                    <CardContent className="flex flex-col gap-3 p-5">
                      <div className="flex items-start justify-between">
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-muted">
                          <Lock className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <Badge variant="secondary">Pendiente</Badge>
                      </div>
                      <div>
                        <p className="font-semibold text-muted-foreground">{achievement.name}</p>
                        <p className="text-sm text-muted-foreground">{achievement.description}</p>
                      </div>
                      {achievement.progress !== undefined && achievement.progressMax !== undefined && (
                        <ProgressBar
                          value={achievement.progress}
                          max={achievement.progressMax}
                          colorClassName="bg-muted-foreground"
                          label={`${achievement.progress} / ${achievement.progressMax}`}
                        />
                      )}
                      <div className="text-sm font-medium text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Zap className="h-3.5 w-3.5" />
                          {achievement.xpReward} XP
                        </span>
                      </div>
                    </CardContent>
                  </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
