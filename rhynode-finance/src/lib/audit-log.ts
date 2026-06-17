import { logger } from "@/lib/logger";

export interface AuditLogEntry {
  userId?: string | null;
  action: string;
  resource: string;
  resourceId?: string | null;
  metadata?: Record<string, unknown> | null;
}

export function auditLog({ userId, action, resource, resourceId, metadata }: AuditLogEntry) {
  logger.info("AUDIT", {
    userId: userId ?? null,
    action,
    resource,
    resourceId: resourceId ?? null,
    metadata: metadata ?? null,
  });
}
