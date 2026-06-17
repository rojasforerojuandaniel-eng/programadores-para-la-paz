"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Medal,
  Crown,
  Trophy,
  Flame,
  ArrowRight,
  Users,
  Activity,
  BarChart3,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { LevelBadge } from "@/components/dashboard/level-badge";
import { ClientAvatar } from "@/components/dashboard/client-avatar";
import { EmptyStateCard } from "@/components/dashboard/empty-state-card";

type Period = "week" | "month" | "all";

interface LeaderboardEntry {
  id: string;
  rank: number;
  name: string;
  level: number;
  xp: number;
  title: string | null;
  streakDays: number;
}

interface LeaderboardStats {
  transactionsCount: number;
  activeUsers: number;
  avgStreak: number;
}

interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  myRank?: LeaderboardEntry;
  stats: LeaderboardStats;
}

const periodLabels: Record<Period, string> = {
  week: "Semanal",
  month: "Mensual",
  all: "Histórico",
};

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <div className="flex items-center justify-center gap-1 text-yellow-500">
        <Crown className="h-4 w-4" aria-hidden="true" />
        <span className="font-bold">1</span>
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div className="flex items-center justify-center gap-1 text-slate-600">
        <Medal className="h-4 w-4" aria-hidden="true" />
        <span className="font-bold">2</span>
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div className="flex items-center justify-center gap-1 text-amber-600">
        <Trophy className="h-4 w-4" aria-hidden="true" />
        <span className="font-bold">3</span>
      </div>
    );
  }
  return <span className="text-muted-foreground">{rank}</span>;
}

function PodiumPlace({
  entry,
  place,
}: {
  entry: LeaderboardEntry;
  place: 1 | 2 | 3;
}) {
  const heights = { 1: "h-44", 2: "h-36", 3: "h-32" };
  const gradients = {
    1: "from-yellow-400 via-amber-300 to-yellow-500",
    2: "from-slate-300 via-slate-200 to-slate-400",
    3: "from-amber-600 via-amber-500 to-amber-700",
  };
  const delays = { 1: "0ms", 2: "150ms", 3: "300ms" };
  const labels = { 1: "1.º", 2: "2.º", 3: "3.º" };

  return (
    <div
      className="flex flex-1 flex-col items-center animate-in fade-in zoom-in-95 slide-in-from-bottom-8 duration-700 fill-mode-backwards"
      style={{ animationDelay: delays[place] }}
    >
      <div
        className={cn(
          "relative flex w-full max-w-[160px] flex-col items-center justify-end rounded-t-2xl border border-white/20 bg-gradient-to-b p-3 text-center shadow-lg",
          heights[place],
          gradients[place]
        )}
      >
        <div className="absolute inset-0 animate-shimmer rounded-t-2xl opacity-30" />
        <div className="relative z-10">
          <p className="text-2xl font-black text-white drop-shadow-sm">
            {labels[place]}
          </p>
          <ClientAvatar
            name={entry.name}
            className="mx-auto mt-2 h-12 w-12 bg-white/90 text-foreground shadow"
          />
          <p className="mt-2 truncate px-1 text-sm font-semibold text-white">
            {entry.name}
          </p>
          <p className="text-xs text-white/90">
            Nivel {entry.level} · {entry.xp.toLocaleString("es-CO")} XP
          </p>
          {entry.streakDays > 0 && (
            <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-medium text-white">
              <Flame className="h-3 w-3" aria-hidden="true" />
              {entry.streakDays} días
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Podium({ entries }: { entries: LeaderboardEntry[] }) {
  const first = entries.find((e) => e.rank === 1);
  const second = entries.find((e) => e.rank === 2);
  const third = entries.find((e) => e.rank === 3);

  if (!first && !second && !third) return null;

  return (
    <Card className="surface-elevated-2 overflow-hidden">
      <CardContent className="flex items-end justify-center gap-2 pb-0 pt-8 sm:gap-4">
        {second && <PodiumPlace entry={second} place={2} />}
        {first && <PodiumPlace entry={first} place={1} />}
        {third && <PodiumPlace entry={third} place={3} />}
      </CardContent>
    </Card>
  );
}

function EngagementStats({ stats }: { stats: LeaderboardStats }) {
  const items = [
    {
      label: "Transacciones",
      value: stats.transactionsCount.toLocaleString("es-CO"),
      icon: Activity,
      color: "text-sky-500",
      bg: "bg-sky-500/10",
    },
    {
      label: "Usuarios activos",
      value: stats.activeUsers.toLocaleString("es-CO"),
      icon: Users,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      label: "Racha promedio",
      value: `${stats.avgStreak} días`,
      icon: Flame,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {items.map((item) => (
        <Card
          key={item.label}
          className="surface-elevated-2 animate-in fade-in slide-in-from-bottom-3 duration-500"
        >
          <CardContent className="flex items-center gap-4 p-4">
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                item.bg,
                item.color
              )}
            >
              <item.icon className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                {item.label}
              </p>
              <p className="text-lg font-bold text-foreground">{item.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function LeaderboardTable({
  entries,
  myRank,
  loading,
  error,
}: {
  entries: LeaderboardEntry[];
  myRank?: LeaderboardEntry;
  loading: boolean;
  error: string | null;
}) {
  const isInTable = myRank
    ? entries.some((e) => e.id === myRank.id)
    : false;

  return (
    <Card className="surface-elevated-2">
      <CardContent className="py-4">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : error || entries.length === 0 ? (
          <EmptyStateCard
            variant="md"
            icon={Medal}
            title={error ? "No se pudo cargar el leaderboard" : "Sé el primero en ganar XP"}
            description={error || "Completa acciones en Rhynode para sumar puntos y aparecer en el ranking."}
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col" className="w-16 text-center">Rank</TableHead>
                  <TableHead scope="col">Jugador</TableHead>
                  <TableHead scope="col" className="text-right">Nivel</TableHead>
                  <TableHead scope="col" className="text-right">XP</TableHead>
                  <TableHead scope="col" className="text-right">Racha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => {
                  const isMe = myRank?.id === entry.id;
                  return (
                    <TableRow
                      key={entry.rank}
                      className={cn(
                        "transition-colors",
                        isMe && "bg-primary/10 hover:bg-primary/20"
                      )}
                    >
                      <TableCell className="text-center">
                        <RankBadge rank={entry.rank} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <ClientAvatar name={entry.name} className="h-8 w-8 text-xs" />
                          <div className="min-w-0">
                            <p className="truncate font-medium">{entry.name}</p>
                            {entry.title && (
                              <p className="truncate text-xs text-muted-foreground">
                                {entry.title}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <LevelBadge level={entry.level} />
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {entry.xp.toLocaleString("es-CO")}
                      </TableCell>
                      <TableCell className="text-right">
                        {entry.streakDays > 0 ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-500">
                            <Flame className="h-3.5 w-3.5" aria-hidden="true" />
                            {entry.streakDays}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {!loading && myRank && !isInTable && (
        <div className="sticky bottom-4 px-4 pb-4">
          <Card className="surface-elevated-2 border-primary/30 shadow-lg">
            <CardContent className="py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {myRank.rank}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{myRank.name}</p>
                    {myRank.title && (
                      <p className="text-xs text-muted-foreground">
                        {myRank.title}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <LevelBadge level={myRank.level} />
                  <p className="text-xs text-muted-foreground">
                    {myRank.xp.toLocaleString("es-CO")} XP · {myRank.streakDays}{" "}
                    días racha
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </Card>
  );
}

export default function LeaderboardPage() {
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>("all");

  useEffect(() => {
    async function fetchLeaderboard() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/personal/leaderboard?period=${period}`);
        if (!res.ok) throw new Error("Error al cargar leaderboard");
        const json = (await res.json()) as LeaderboardResponse;
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido");
      } finally {
        setLoading(false);
      }
    }
    fetchLeaderboard();
  }, [period]);

  const top20 = data?.entries.slice(0, 20) ?? [];
  const myRank = data?.myRank;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="heading-section">Leaderboard</h1>
          <p className="body-default mt-1">Los usuarios con más XP</p>
        </div>
        <Tabs
          value={period}
          onValueChange={(v) => setPeriod(v as Period)}
          className="w-full sm:w-auto"
        >
          <TabsList className="grid w-full grid-cols-3 sm:w-auto">
            {( ["week", "month", "all"] as Period[]).map((p) => (
              <TabsTrigger key={p} value={p} className="text-xs sm:text-sm">
                {periodLabels[p]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {!loading && !error && data?.stats && (
        <EngagementStats stats={data.stats} />
      )}

      {!loading && !error && top20.length > 0 && <Podium entries={top20} />}

      <LeaderboardTable
        entries={top20}
        myRank={myRank}
        loading={loading}
        error={error}
      />

      <Card className="surface-elevated-2">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4 text-primary" aria-hidden="true" />
            Tu progreso personal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="body-default text-sm">
            Revisa tus estadísticas detalladas y compara tu avance semana a
            semana.
          </p>
          <Link
            href="/dashboard/stats"
            className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Ver mis stats
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
