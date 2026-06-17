export type OrganizationRole = "ADMIN" | "MANAGER" | "VIEWER";

export interface MinimalOrganization {
  id: string;
  name: string;
  plan: string;
}

export interface MinimalOrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  role: string;
  status: string;
  invitedAt: Date;
  joinedAt: Date | null;
}

export const ROLE_LABELS: Record<OrganizationRole, string> = {
  ADMIN: "Administrador",
  MANAGER: "Gerente",
  VIEWER: "Lector",
};

export const ORGANIZATION_ROLES: OrganizationRole[] = ["ADMIN", "MANAGER", "VIEWER"];

export function normalizeRole(role: string | null | undefined): OrganizationRole {
  const upper = (role ?? "").toUpperCase();
  if (upper === "ADMIN" || upper === "MANAGER" || upper === "VIEWER") {
    return upper;
  }
  if (upper === "OWNER" || upper === "ADMINISTRATOR") {
    return "ADMIN";
  }
  return "VIEWER";
}

export function canAdmin(role: OrganizationRole | null | undefined): boolean {
  return role === "ADMIN";
}

export function canEdit(role: OrganizationRole | null | undefined): boolean {
  return role === "ADMIN" || role === "MANAGER";
}

export function canView(role: OrganizationRole | null | undefined): boolean {
  return role === "ADMIN" || role === "MANAGER" || role === "VIEWER";
}
