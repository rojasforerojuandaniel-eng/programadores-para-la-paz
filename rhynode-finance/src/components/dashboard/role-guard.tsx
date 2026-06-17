"use client";

import { useOrganizationRole } from "@/hooks/use-organization-role";
import type { OrganizationRole } from "@/lib/organization";

interface RoleGuardProps {
  requiredRole?: OrganizationRole | OrganizationRole[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

function matchesRole(role: OrganizationRole | null, required: OrganizationRole[]): boolean {
  if (!role) return false;
  return required.includes(role);
}

export function RoleGuard({
  requiredRole = ["ADMIN", "MANAGER"],
  fallback = null,
  children,
}: RoleGuardProps) {
  const { role, loading } = useOrganizationRole();
  const required = Array.isArray(requiredRole) ? requiredRole : [requiredRole];

  if (loading) return null;
  if (!matchesRole(role, required)) return fallback;
  return children;
}

export function AdminGuard({ fallback, children }: Omit<RoleGuardProps, "requiredRole">) {
  return (
    <RoleGuard requiredRole="ADMIN" fallback={fallback}>
      {children}
    </RoleGuard>
  );
}

export function EditGuard({ fallback, children }: Omit<RoleGuardProps, "requiredRole">) {
  return (
    <RoleGuard requiredRole={["ADMIN", "MANAGER"]} fallback={fallback}>
      {children}
    </RoleGuard>
  );
}

export function ViewerGuard({ fallback, children }: Omit<RoleGuardProps, "requiredRole">) {
  return (
    <RoleGuard requiredRole={["ADMIN", "MANAGER", "VIEWER"]} fallback={fallback}>
      {children}
    </RoleGuard>
  );
}
