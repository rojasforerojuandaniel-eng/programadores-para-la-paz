import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthFromRequest } from "@/lib/auth-from-request";
import { withRateLimit } from "@/lib/with-rate-limit";
import { logger } from "@/lib/logger";

const validTypes = new Set([
  "accounts",
  "budgets",
  "goals",
  "debts",
  "recurring",
  "subscriptions",
  "calendar",
  "categories",
]);

export const GET = withRateLimit(
  async (request: Request) => {
    try {
      const auth = await requireAuthFromRequest(request);
      if (!auth?.org || !auth.profile) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const { searchParams } = new URL(request.url);
      const type = searchParams.get("type");
      if (!type || !validTypes.has(type)) {
        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
      }

      const { profile, org } = auth;

      switch (type) {
        case "accounts": {
          const accounts = await prisma.account.findMany({
            where: { userId: profile.id },
            orderBy: { createdAt: "desc" },
          });
          return NextResponse.json({ accounts });
        }
        case "budgets": {
          const budgets = await prisma.budget.findMany({
            where: { userId: profile.id },
            include: { category: true },
            orderBy: { createdAt: "desc" },
          });
          return NextResponse.json({ budgets });
        }
        case "goals": {
          const goals = await prisma.goal.findMany({
            where: { userId: profile.id },
            orderBy: { createdAt: "desc" },
          });
          return NextResponse.json({ goals });
        }
        case "debts": {
          const debts = await prisma.debt.findMany({
            where: { userId: profile.id },
            orderBy: { createdAt: "desc" },
          });
          return NextResponse.json({ debts });
        }
        case "recurring": {
          const recurring = await prisma.recurringTransaction.findMany({
            where: { userId: profile.id },
            orderBy: { createdAt: "desc" },
          });
          return NextResponse.json({ recurring });
        }
        case "subscriptions": {
          const subscriptions = await prisma.detectedSubscription.findMany({
            where: { userId: profile.id },
            orderBy: { createdAt: "desc" },
          });
          return NextResponse.json({ subscriptions });
        }
        case "calendar": {
          const start = new Date();
          const end = new Date();
          end.setMonth(end.getMonth() + 2);

          const [debts, goals, recurring] = await Promise.all([
            prisma.debt.findMany({ where: { userId: profile.id, dueDate: { gte: start, lte: end } } }),
            prisma.goal.findMany({ where: { userId: profile.id, deadline: { gte: start, lte: end } } }),
            prisma.recurringTransaction.findMany({ where: { userId: profile.id } }),
          ]);

          return NextResponse.json({ debts, goals, recurring });
        }
        case "categories": {
          const categories = await prisma.category.findMany({
            where: { userId: profile.id },
            orderBy: { name: "asc" },
          });
          return NextResponse.json({ categories });
        }
        default:
          return NextResponse.json({ error: "Invalid type" }, { status: 400 });
      }
    } catch (error) {
      logger.error("Mobile personal data error", { error: error instanceof Error ? error.message : String(error) });
      return NextResponse.json({ error: "Failed to load personal data" }, { status: 500 });
    }
  },
  { key: "mobile-personal-data", maxRequests: 60, windowMs: 60000 }
);
