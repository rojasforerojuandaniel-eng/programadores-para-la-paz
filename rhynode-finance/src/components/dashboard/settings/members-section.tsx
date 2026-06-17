"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
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
import { ROLE_LABELS, type OrganizationRole } from "@/lib/organization";
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
  const { user } = useUser();
  const { isAdmin } = useOrganizationRole();
  const { allowed: canInviteByPlan, current: usersUsed, limit: usersLimit, planName } = usePlanLimit("users");

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
        toast.error("Error al cargar miembros");
      })
      .finally(() => {
        setLoading(false);
      });
    return () => controller.abort();
  }, []);

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
        toast.error(data.error || "Error al invitar");
        return;
      }
      toast.success("Invitación enviada");
      setEmail("");
      setInviteRole("VIEWER");
      await refreshMembers();
    } catch {
      toast.error("Error de red");
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
      toast.error("Error al actualizar miembros");
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
        toast.error(data.error || "Error al cambiar rol");
        return;
      }
      toast.success("Rol actualizado");
      await refreshMembers();
    } catch {
      toast.error("Error de red");
    }
  }

  async function resendInvitation(memberId: string) {
    try {
      const res = await fetch(`/api/organization/members/${memberId}/resend`, {
        method: "POST",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(data.error || "Error al reenviar");
        return;
      }
      toast.success("Invitación reenviada");
      await refreshMembers();
    } catch {
      toast.error("Error de red");
    }
  }

  async function removeMember(memberId: string) {
    if (!confirm("¿Seguro que quieres remover este miembro?")) return;
    try {
      const res = await fetch(`/api/organization/members/${memberId}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(data.error || "Error al remover");
        return;
      }
      toast.success("Miembro removido");
      await refreshMembers();
    } catch {
      toast.error("Error de red");
    }
  }

  const isCurrentUser = (member: Member) => member.userId === user?.id;

  return (
    <div className="space-y-4">
      <Card className="surface-elevated-2">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="heading-card flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Miembros del equipo
          </CardTitle>
          <Badge variant="outline">{planName}</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Usuarios: {usersUsed} / {usersLimit === Infinity ? "∞" : usersLimit}
          </div>

          {isAdmin && (
            <form onSubmit={handleInvite} className="space-y-3 rounded-lg border border-border p-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="space-y-2 sm:col-span-1">
                  <Label htmlFor="invite-email">Email</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="colaborador@empresa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={inviting || !canInviteByPlan}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-role">Rol</Label>
                  <Select
                    value={inviteRole}
                    onValueChange={(v) => setInviteRole(v as OrganizationRole)}
                    disabled={inviting || !canInviteByPlan}
                  >
                    <SelectTrigger id="invite-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADMIN">{ROLE_LABELS.ADMIN}</SelectItem>
                      <SelectItem value="MANAGER">{ROLE_LABELS.MANAGER}</SelectItem>
                      <SelectItem value="VIEWER">{ROLE_LABELS.VIEWER}</SelectItem>
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
                        Invitando...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        Invitar
                      </>
                    )}
                  </Button>
                </div>
              </div>
              {!canInviteByPlan && (
                <p className="text-xs text-danger">
                  Has alcanzado el límite de usuarios de tu plan. Sube de plan para invitar más
                  miembros.
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
              Aún no hay miembros invitados.
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
                        {member.name || member.email || "Miembro"}
                      </span>
                      {isCurrentUser(member) && <Badge variant="secondary">Tú</Badge>}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-3.5 w-3.5" />
                      <span className="truncate">{member.email ?? member.userId}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant={member.status === "ACTIVE" ? "default" : "outline"}>
                        {member.status === "ACTIVE" ? "Activo" : "Pendiente"}
                      </Badge>
                      <span>{ROLE_LABELS[member.role]}</span>
                    </div>
                  </div>

                  {isAdmin && !isCurrentUser(member) && (
                    <div className="flex items-center gap-2">
                      <Select
                        value={member.role}
                        onValueChange={(v) => changeRole(member.id, v as OrganizationRole)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ADMIN">{ROLE_LABELS.ADMIN}</SelectItem>
                          <SelectItem value="MANAGER">{ROLE_LABELS.MANAGER}</SelectItem>
                          <SelectItem value="VIEWER">{ROLE_LABELS.VIEWER}</SelectItem>
                        </SelectContent>
                      </Select>

                      {member.status === "PENDING" && (
                        <Button
                          variant="outline"
                          size="icon"
                          title="Reenviar invitación"
                          onClick={() => resendInvitation(member.id)}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-danger hover:bg-danger/10"
                        title="Remover miembro"
                        onClick={() => removeMember(member.id)}
                      >
                        <Trash2 className="h-4 w-4" />
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
