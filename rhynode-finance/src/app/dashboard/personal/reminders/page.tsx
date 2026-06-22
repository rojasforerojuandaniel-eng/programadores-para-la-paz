import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getUserProfile } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { toReminder } from "@/lib/reminders";
import { getLocale } from "@/lib/locale-server";
import { buildMetadata } from "@/lib/seo-metadata";
import { RemindersView } from "./reminders-view";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "dashboard.reminders" });

  return buildMetadata({
    title: t("title"),
    description: t("subtitle"),
    path: "/dashboard/personal/reminders",
  });
}

interface RemindersPageProps {
  searchParams?: { [key: string]: string | string[] | undefined };
}

export default async function RemindersPage({ searchParams }: RemindersPageProps) {
  const locale = await getLocale();
  setRequestLocale(locale);

  const profile = await getUserProfile();
  if (!profile) redirect("/sign-in");

  const prisma = getPrisma();
  const notifications = await prisma.notification.findMany({
    where: { userId: profile.id, type: "REMINDER" },
    orderBy: { createdAt: "desc" },
  });

  const reminders = notifications
    .map(toReminder)
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .map((r) => ({
      id: r.id,
      title: r.title,
      message: r.message,
      scheduledAt: r.scheduledAt.toISOString(),
      repeat: r.repeat,
      active: r.active,
      read: r.read,
      lastSentAt: r.lastSentAt?.toISOString(),
    }));

  return <RemindersView reminders={reminders} defaultOpen={searchParams?.new === "1"} />;
}