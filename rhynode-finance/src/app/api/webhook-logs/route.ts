import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { withRateLimit } from "@/lib/with-rate-limit";
import { logger } from "@/lib/logger";

const querySchema = z.object({
  provider: z.enum(["stripe", "wompi"]).optional(),
  status: z.enum(["success", "failed", "pending"]).optional(),
  from: z
    .string()
    .refine((v) => !Number.isNaN(Date.parse(v)), { message: "Invalid from date" })
    .optional(),
  to: z
    .string()
    .refine((v) => !Number.isNaN(Date.parse(v)), { message: "Invalid to date" })
    .optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const providerMap: Record<"stripe" | "wompi", string> = {
  stripe: "STRIPE",
  wompi: "WOMPI",
};

const statusMap: Record<"success" | "failed" | "pending", string> = {
  success: "PROCESSED",
  failed: "FAILED",
  pending: "PENDING",
};

function buildPayloadPreview(payload: unknown): string {
  try {
    const text = JSON.stringify(payload);
    if (text.length <= 80) return text;
    return `${text.slice(0, 77)}...`;
  } catch {
    return "[payload no serializable]";
  }
}

function extractErrorMessage(payload: unknown): string | null {
  if (
    payload &&
    typeof payload === "object" &&
    "__processingMeta" in payload &&
    payload.__processingMeta &&
    typeof payload.__processingMeta === "object" &&
    "error" in payload.__processingMeta &&
    typeof payload.__processingMeta.error === "string"
  ) {
    return payload.__processingMeta.error;
  }
  return null;
}

async function handler(request: Request) {
  try {
    const org = await requireAuth();
    if (!org) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const parseResult = querySchema.safeParse({
      provider: searchParams.get("provider") || undefined,
      status: searchParams.get("status") || undefined,
      from: searchParams.get("from") || undefined,
      to: searchParams.get("to") || undefined,
      limit: searchParams.get("limit") || undefined,
      offset: searchParams.get("offset") || undefined,
    });

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { provider, status, from, to, limit, offset } = parseResult.data;
    const prisma = getPrisma();

    const where: import("@/generated/prisma/client").Prisma.WebhookEventWhereInput = {
      organizationId: org.id,
      ...(provider && { provider: providerMap[provider] }),
      ...(status && { status: statusMap[status] }),
      ...(from || to
        ? {
            createdAt: {
              ...(from && { gte: new Date(from) }),
              ...(to && { lte: new Date(to) }),
            },
          }
        : {}),
    };

    const [logs, total] = await Promise.all([
      prisma.webhookEvent.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.webhookEvent.count({ where }),
    ]);

    const data = logs.map((log) => ({
      id: log.id,
      provider: log.provider,
      eventType: log.eventType,
      externalId: log.externalId,
      status: log.status,
      processedAt: log.processedAt?.toISOString() ?? null,
      createdAt: log.createdAt.toISOString(),
      payloadPreview: buildPayloadPreview(log.payload),
      errorMessage: extractErrorMessage(log.payload),
    }));

    return NextResponse.json({
      data,
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + logs.length < total,
      },
    });
  } catch (error) {
    logger.error("Webhook logs API error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Failed to fetch webhook logs" }, { status: 500 });
  }
}

export const GET = withRateLimit(handler, {
  key: "webhook-logs",
  maxRequests: 60,
  windowMs: 60000,
});
