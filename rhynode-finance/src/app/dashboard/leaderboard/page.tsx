"use client";

import { useEffect, useState } from "react";
import { Medal, Crown, Trophy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface LeaderboardEntry {
  rank: number;
  name: string;
  level: number;
  xp: number;
  title: string;
}

interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  myRank?: LeaderboardEntry;
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <div className="flex items-center justify-center gap-1 text-yellow-400">
        <Crown className="h-4 w-4" />
        <span className="font-bold">1</span>
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div className="flex items-center justify-center gap-1 text-gray-300">
        <Medal className="h-4 w-4" />
        <span className="font-bold">2</span>
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div className="flex items-center justify-center gap-1 text-amber-600">
        <Trophy className="h-4 w-4" />
        <span className="font-bold">3</span>
      </div>
    );
  }
  return <span className="text-muted-foreground">{rank}</span>;
}

export default function LeaderboardPage() {
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        const res = await fetch("/api/personal/leaderboard");
        if (!res.ok) throw new Error("Error al cargar leaderboard");
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido");
      } finally {
        setLoading(false);
      }
    }
    fetchLeaderboard();
  }, []);

  const top20 = data?.entries.slice(0, 20) ?? [];
  const myRank = data?.myRank;
  const isInTop20 = myRank ? top20.some((e) => e.rank === myRank.rank) : false;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="heading-section">Leaderboard</h1>
        <p className="body-default mt-1">Los usuarios con mas XP</p>
      </div>

      <Card className="surface-elevated-2">
        <CardContent className="py-4">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : error || top20.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Medal className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="body-default text-muted-foreground">
                Se el primero en ganar XP
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16 text-center">Rank</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead className="text-right">Nivel</TableHead>
                    <TableHead className="text-right">XP</TableHead>
                    <TableHead>Titulo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {top20.map((entry) => {
                    const isMe = myRank && entry.rank === myRank.rank;
                    return (
                      <TableRow
                        key={entry.rank}
                        className={cn(
                          isMe && "bg-primary/10 hover:bg-primary/20"
                        )}
                      >
                        <TableCell className="text-center">
                          <RankBadge rank={entry.rank} />
                        </TableCell>
                        <TableCell className="font-medium">{entry.name}</TableCell>
                        <TableCell className="text-right">{entry.level}</TableCell>
                        <TableCell className="text-right font-semibold">
                          {entry.xp.toLocaleString("es-CO")}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {entry.title}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {!loading && myRank && !isInTop20 && (
        <div className="sticky bottom-4">
          <Card className="surface-elevated-2 border-primary/30 shadow-lg">
            <CardContent className="py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {myRank.rank}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{myRank.name}</p>
                    <p className="text-xs text-muted-foreground">{myRank.title}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">Nivel {myRank.level}</p>
                  <p className="text-xs text-muted-foreground">{myRank.xp.toLocaleString("es-CO")} XP</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
