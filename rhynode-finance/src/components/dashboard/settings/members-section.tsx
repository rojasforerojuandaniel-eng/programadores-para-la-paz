"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useOrganizationRole } from "@/hooks/use-organization-role";
import { usePlanLimit } from "@/hooks/use-plan-limit";
import type { OrganizationRole } from "@/lib/organization";
import { Users, Mail, RefreshCw, Trash2, Plus, Loader2 } from "lucide-react";

interface Member {
  id: string;
  userId: string;
  role: OrganizationRole;
  status: "PENDING" | "ACTIVE";
  email: string | null;
  name: string | null;
  invitedAt: string;
  joinedAt: string | null;
}

export function MembersSection() {
  const t = useTranslations("dashboard.settings");
  const { user } = useUser();
  const { isAdmin } = useOrganizationRole();
  const {
    allowed: canInviteByPlan,
    current: usersUsed,
    limit: usersLimit,
    planName,
  } = usePlanLimit("users");

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<OrganizationRole>("VIEWER");
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/organization/members", { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error("Failed");
        return res.json();
      })
      .then((data: { members: Member[] }) => {
        setMembers(data.members ?? []);
      })
      .catch(() => {
        toast.error(t("members.toasts.loadError"));
      })
      .finally(() => {
        setLoading(false);
      });
    return () => controller.abort();
  }, [t]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setInviting(true);
    try {
      const res = await fetch("/api/organization/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), role: inviteRole }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(data.error || t("members.toasts.inviteError"));
        return;
      }
      toast.success(t("members.toasts.inviteSent"));
      setEmail("");
      setInviteRole("VIEWER");
      await refreshMembers();
    } catch {
      toast.error(t("members.toasts.networkError"));
    } finally {
      setInviting(false);
    }
  }

  async function refreshMembers() {
    try {
      const res = await fetch("/api/organization/members");
      if (!res.ok) throw new Error("Failed");
      const data = (await res.json()) as { members: Member[] };
      setMembers(data.members ?? []);
    } catch {
      toast.error(t("members.toasts.refreshError"));
    }
  }

  async function changeRole(memberId: string, role: OrganizationRole) {
    try {
      const res = await fetch(`/api/organization/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(data.error || t("members.toasts.roleChangeError"));
        return;
      }
      toast.success(t("members.toasts.roleUpdated"));
      await refreshMembers();
    } catch {
      toast.error(t("members.toasts.networkError"));
    }
  }

  async function resendInvitation(memberId: string) {
    try {
      const res = await fetch(`/api/organization/members/${memberId}/resend`, {
        method: "POST",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(data.error || t("members.toasts.resendError"));
        return;
      }
      toast.success(t("members.toasts.resent"));
      await refreshMembers();
    } catch {
      toast.error(t("members.toasts.networkError"));
    }
  }

  async function removeMember(memberId: string) {
    if (!confirm(t("members.removeConfirm"))) return;
    try {
      const res = await fetch(`/api/organization/members/${memberId}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(data.error || t("members.toasts.removeError"));
        return;
      }
      toast.success(t("members.toasts.removed"));
      await refreshMembers();
    } catch {
      toast.error(t("members.toasts.networkError"));
    }
  }

  const isCurrentUser = (member: Member) => member.userId === user?.id;

  return (
    <div className="space-y-4">
      <Card className="surface-elevated-2">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="heading-card flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            {t("members.title")}
          </CardTitle>
          <Badge variant="outline">{planName}</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            {t("members.usersCount", {
              used: usersUsed,
              limit: usersLimit === Infinity ? "∞" : usersLimit,
            })}
          </div>

          {isAdmin && (
            <form
              onSubmit={handleInvite}
              className="space-y-3 rounded-lg border border-border p-3"
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="space-y-2 sm:col-span-1">
                  <Label htmlFor="invite-email">{t("members.emailLabel")}</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder={t("members.emailPlaceholder")}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={inviting || !canInviteByPlan}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-role">{t("members.roleLabel")}</Label>
                  <Select
                    value={inviteRole}
                    onValueChange={(v) => setInviteRole(v as OrganizationRole)}
                    disabled={inviting || !canInviteByPlan}
                  >
                    <SelectTrigger id="invite-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADMIN">
                        {t(`members.roles.ADMIN` as never)}
                      </SelectItem>
                      <SelectItem value="MANAGER">
                        {t(`members.roles.MANAGER` as never)}
                      </SelectItem>
                      <SelectItem value="VIEWER">
                        {t(`members.roles.VIEWER` as never)}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button
                    type="submit"
                    disabled={inviting || !canInviteByPlan}
                    className="w-full gap-2"
                  >
                    {inviting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t("members.inviting")}
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        {t("members.invite")}
                      </>
                    )}
                  </Button>
                </div>
              </div>
              {!canInviteByPlan && (
                <p className="text-xs text-danger">
                  {t("members.planLimitReached")}
                </p>
              )}
            </form>
          )}

          {loading ? (
            <div className="py-8 text-center">
              <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : members.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {t("members.noMembers")}
            </div>
          ) : (
            <ul className="divide-y divide-border" role="list">
              {members.map((member) => (
                <li
                  key={member.id}
                  className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {member.name || member.email || t("members.memberFallback")}
                      </span>
                      {isCurrentUser(member) && (
                        <Badge variant="secondary">{t("members.you")}</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                      <span className="truncate">
                        {member.email ?? member.userId}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge
                        variant={
                          member.status === "ACTIVE" ? "default" : "outline"
                        }
                      >
                        {t(`members.status.${member.status}` as never)}
                      </Badge>
                      <span>{t(`members.roles.${member.role}` as never)}</span>
                    </div>
                  </div>

                  {isAdmin && !isCurrentUser(member) && (
                    <div className="flex items-center gap-2">
                      <Select
                        value={member.role}
                        onValueChange={(v) =>
                          changeRole(member.id, v as OrganizationRole)
                        }
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ADMIN">
                            {t(`members.roles.ADMIN` as never)}
                          </SelectItem>
                          <SelectItem value="MANAGER">
                            {t(`members.roles.MANAGER` as never)}
                          </SelectItem>
                          <SelectItem value="VIEWER">
                            {t(`members.roles.VIEWER` as never)}
                          </SelectItem>
                        </SelectContent>
                      </Select>

                      {member.status === "PENDING" && (
                        <Button
                          variant="outline"
                          size="icon"
                          title={t("members.resendInvitation")}
                          aria-label={t("members.resendInvitation")}
                          onClick={() => resendInvitation(member.id)}
                        >
                          <RefreshCw className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-danger hover:bg-danger/10"
                        title={t("members.removeMember")}
                        aria-label={t("members.removeMember")}
                        onClick={() => removeMember(member.id)}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}