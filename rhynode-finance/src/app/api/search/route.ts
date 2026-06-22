import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { withRateLimit } from "@/lib/with-rate-limit";
import { logger } from "@/lib/logger";
import { getLocale } from "@/lib/locale-server";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Locale } from "@/lib/locale";

const MAX_PER_TYPE = 5;
const MAX_TOTAL = 15;

const searchTypeOrder = [
  "transaction",
  "invoice",
  "client",
  "project",
  "account",
] as const;

type SearchResultType = (typeof searchTypeOrder)[number];

interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle: string;
  href: string;
}

function buildSearchFilter(query: string) {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const pattern = { contains: trimmed, mode: "insensitive" as const };
  return pattern;
}

async function searchTransactions(
  orgId: string,
  filter: { contains: string; mode: "insensitive" },
  locale: Locale,
): Promise<SearchResult[]> {
  const rows = await prisma.transaction.findMany({
    where: {
      organizationId: orgId,
      OR: [
        { description: filter },
        { reference: filter },
        { category: filter },
        { type: filter },
      ],
    },
    take: MAX_PER_TYPE,
    orderBy: { date: "desc" },
  });

  return rows.map((t) => ({
    id: t.id,
    type: "transaction" as const,
    title: t.description,
    subtitle: `${t.type} · ${formatCurrency(Number(t.amount), t.currency, locale)} · ${formatDate(t.date, locale)}`,
    href: "/dashboard/transactions",
  }));
}

async function searchInvoices(
  orgId: string,
  filter: { contains: string; mode: "insensitive" },
  locale: Locale,
): Promise<SearchResult[]> {
  const rows = await prisma.invoice.findMany({
    where: {
      organizationId: orgId,
      OR: [
        { number: filter },
        { notes: filter },
        { terms: filter },
        { client: { name: filter } },
        { project: { name: filter } },
      ],
    },
    take: MAX_PER_TYPE,
    orderBy: { issueDate: "desc" },
    include: { client: true, project: true },
  });

  return rows.map((inv) => ({
    id: inv.id,
    type: "invoice" as const,
    title: inv.number,
    subtitle: `${inv.client.name} · ${formatCurrency(Number(inv.total), inv.currency, locale)} · ${formatDate(inv.issueDate, locale)}`,
    href: "/dashboard/invoices",
  }));
}

async function searchClients(
  orgId: string,
  filter: { contains: string; mode: "insensitive" },
): Promise<SearchResult[]> {
  const rows = await prisma.client.findMany({
    where: {
      organizationId: orgId,
      OR: [
        { name: filter },
        { email: filter },
        { taxId: filter },
        { phone: filter },
        { address: filter },
        { city: filter },
      ],
    },
    take: MAX_PER_TYPE,
    orderBy: { name: "asc" },
  });

  return rows.map((c) => ({
    id: c.id,
    type: "client" as const,
    title: c.name,
    subtitle: [c.email, c.city, c.country].filter(Boolean).join(" · "),
    href: "/dashboard/clients",
  }));
}

async function searchProjects(
  orgId: string,
  filter: { contains: string; mode: "insensitive" },
  locale: Locale,
): Promise<SearchResult[]> {
  const rows = await prisma.project.findMany({
    where: {
      organizationId: orgId,
      OR: [{ name: filter }, { description: filter }],
    },
    take: MAX_PER_TYPE,
    orderBy: { createdAt: "desc" },
  });

  return rows.map((p) => ({
    id: p.id,
    type: "project" as const,
    title: p.name,
    subtitle: [
        p.status,
        p.description,
        p.startDate ? formatDate(p.startDate, locale) : "",
      ]
      .filter(Boolean)
      .join(" · ")
      .slice(0, 80),
    href: "/dashboard/projects",
  }));
}

async function searchAccounts(
  orgId: string,
  filter: { contains: string; mode: "insensitive" },
  locale: Locale,
): Promise<SearchResult[]> {
  const rows = await prisma.bankAccount.findMany({
    where: {
      organizationId: orgId,
      OR: [
        { name: filter },
        { bankName: filter },
        { accountNumber: filter },
        { type: filter },
      ],
    },
    take: MAX_PER_TYPE,
    orderBy: { createdAt: "desc" },
  });

  return rows.map((a) => ({
    id: a.id,
    type: "account" as const,
    title: a.name,
    subtitle: `${a.bankName} · ${a.type} · ${formatCurrency(Number(a.balance), a.currency, locale)}`,
    href: "/dashboard/accounts",
  }));
}

export const GET = withRateLimit(
  async (request: Request) => {
    try {
      const org = await requireAuth();
      if (!org) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const locale = await getLocale();

      const { searchParams } = new URL(request.url);
      const rawQuery = searchParams.get("q") ?? "";
      const query = rawQuery.trim();

      if (!query || query.length < 2) {
        return NextResponse.json(
          { results: [], total: 0, query },
          { status: 200 }
        );
      }

      const filter = buildSearchFilter(query);
      if (!filter) {
        return NextResponse.json(
          { results: [], total: 0, query },
          { status: 200 }
        );
      }

      const grouped = await Promise.all([
        searchTransactions(org.id, filter, locale),
        searchInvoices(org.id, filter, locale),
        searchClients(org.id, filter),
        searchProjects(org.id, filter, locale),
        searchAccounts(org.id, filter, locale),
      ]);

      const groupedMap = new Map<SearchResultType, SearchResult[]>();
      grouped.forEach((items, index) => {
        const type = searchTypeOrder[index];
        groupedMap.set(type, items.slice(0, MAX_PER_TYPE));
      });

      // Respect global max: keep priority order and cap total.
      const results: SearchResult[] = [];
      for (const type of searchTypeOrder) {
        const items = groupedMap.get(type) ?? [];
        for (const item of items) {
          if (results.length >= MAX_TOTAL) break;
          results.push(item);
        }
      }

      return NextResponse.json({ results, total: results.length, query });
    } catch (error) {
      logger.error("Search failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      return NextResponse.json(
        { error: "Search failed" },
        { status: 500 }
      );
    }
  },
  { key: "search", maxRequests: 30, windowMs: 60000 }
);