import { redirect } from "next/navigation";
import { getUserProfile } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { toReminder } from "@/lib/reminders";
import { RemindersView } from "./reminders-view";

export const metadata = {
  title: "Recordatorios — Rhynode",
  description: "Administra tus recordatorios financieros personalizados.",
};

export default async function RemindersPage() {
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

  return <RemindersView reminders={reminders} />;
}
