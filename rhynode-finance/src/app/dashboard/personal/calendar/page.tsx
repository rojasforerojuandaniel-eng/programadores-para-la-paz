import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { CalendarView } from "@/components/dashboard/calendar-view";

export default async function CalendarPage() {
  const org = await requireAuth();
  if (!org) redirect("/sign-in");

  return (
    <main className="container mx-auto max-w-6xl px-4 py-6">
      <CalendarView orgCurrency={org.currency} />
    </main>
  );
}
