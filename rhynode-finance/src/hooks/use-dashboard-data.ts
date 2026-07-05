import { useQuery } from "@tanstack/react-query";

// Achievements
export interface UnlockedAchievement {
  id: string;
  type: string;
  name: string;
  description: string;
  icon: string | null;
  xpAwarded: number;
  unlockedAt: string;
}

export interface PendingAchievement {
  type: string;
  name: string;
  description: string;
  icon: string;
  xpAwarded: number;
  category: "starter" | "consistency" | "advanced";
}

export interface AchievementsResponse {
  unlocked: UnlockedAchievement[];
  pending: PendingAchievement[];
  stats: {
    total: number;
    unlocked: number;
    xpEarned: number;
  };
}

// Leaderboard
export type Period = "week" | "month" | "all";

export interface LeaderboardEntry {
  id: string;
  rank: number;
  name: string;
  level: number;
  xp: number;
  title: string | null;
  streakDays: number;
}

export interface LeaderboardStats {
  transactionsCount: number;
  activeUsers: number;
  avgStreak: number;
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  myRank?: LeaderboardEntry;
  stats: LeaderboardStats;
}

// Integrations
export interface WaitlistEntry {
  name: string;
  email: string;
  joinedAt: string;
}

export interface PreferencesResponse {
  integrationWaitlist?: Record<string, WaitlistEntry>;
}

// Settings
export interface NotificationPreferences {
  budgets: boolean;
  subscriptions: boolean;
  weeklySummary: boolean;
}

export interface Organization {
  name: string;
  taxId: string;
  country: string;
  currency: string;
  timezone: string;
}

export interface Plan {
  name: string;
  invoicesUsed: number;
  invoicesLimit: number;
  usersUsed: number;
  usersLimit: number;
}

export interface PaymentItem {
  id: string;
  amount: number;
  currency: string;
  method: string;
  status: string;
  paidAt: string | null;
  createdAt: string;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export function useAchievements() {
  return useQuery<AchievementsResponse>({
    queryKey: ["achievements"],
    queryFn: () => fetchJson("/api/personal/achievements"),
  });
}

export function useLeaderboard(period: Period) {
  return useQuery<LeaderboardResponse>({
    queryKey: ["leaderboard", period],
    queryFn: () => fetchJson(`/api/personal/leaderboard?period=${period}`),
  });
}

export function useIntegrationWaitlist() {
  return useQuery<PreferencesResponse>({
    queryKey: ["preferences", "integration-waitlist"],
    queryFn: () => fetchJson("/api/personal/preferences"),
  });
}

export function useNotificationPreferences() {
  return useQuery<NotificationPreferences>({
    queryKey: ["notifications", "preferences"],
    queryFn: () => fetchJson("/api/notifications/preferences"),
  });
}

export function useOrganization() {
  return useQuery<{ organization?: Organization }>({
    queryKey: ["organization"],
    queryFn: () => fetchJson("/api/organization"),
  });
}

export function useSubscriptionPlan() {
  return useQuery<{ plan?: Plan }>({
    queryKey: ["subscription", "plan"],
    queryFn: () => fetchJson("/api/subscribe/plan"),
  });
}

export function useOrganizationMembers() {
  return useQuery<{ members?: Array<{ status?: string } & Record<string, unknown>> }>({
    queryKey: ["organization", "members"],
    queryFn: () => fetchJson("/api/organization/members"),
  });
}

export function usePaymentsHistory() {
  return useQuery<{ payments?: PaymentItem[] }>({
    queryKey: ["payments", "history"],
    queryFn: () => fetchJson("/api/payments/history"),
  });
}
